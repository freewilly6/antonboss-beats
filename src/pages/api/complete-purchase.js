import fetch from 'node-fetch'
import { supabaseAdmin } from '../../lib/supabaseAdmin'  // service-role client

// PayPal endpoint (sandbox vs prod)
const PAYPAL_API = process.env.NODE_ENV === 'production'
  ? 'https://api.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalToken() {
  const basic = Buffer
    .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`)
    .toString('base64')

  const resp = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`PayPal token error: ${txt}`)
  }
  const { access_token } = await resp.json()
  return access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' })
  }

  // ── 1) Extract & verify Supabase JWT ───────────────────────────────
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }
  const jwt = auth.split(' ')[1]
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt)
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  const userId = user.id

  // ── 2) Parse payload ────────────────────────────────────────────────
  const { orderID, items } = req.body
  if (!orderID || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing orderID or items' })
  }

  try {
    // ── 3) Verify PayPal order is COMPLETED ────────────────────────────
    const token = await getPayPalToken()
    const ppRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!ppRes.ok) {
      const detail = await ppRes.text()
      return res.status(400).json({ error: 'PayPal lookup failed', detail })
    }
    const orderData = await ppRes.json()
    if (orderData.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Order not completed', status: orderData.status })
    }
    const paidAmount = parseFloat(orderData.purchase_units[0].amount.value)

    // ── 4) Recalculate expected total & enrich beats ───────────────────
    const beatIds = [...new Set(items.map(i => i.beatId))]
    const { data: beats, error: beatErr } = await supabaseAdmin
      .from('BeatFiles')
      .select('id, name, licenses')
      .in('id', beatIds)
    if (beatErr) throw beatErr

    let expectedTotal = 0
    const enriched = items.map(({ beatId, licenseName }) => {
      const beat = beats.find(b => b.id === beatId)
      if (!beat) throw new Error(`Beat ${beatId} not found`)
      const lic = (beat.licenses || []).find(l => l.name === licenseName)
      if (!lic) throw new Error(`License ${licenseName} not on beat ${beatId}`)
      expectedTotal += lic.price
      return {
        id:       beatId,
        name:     beat.name,
        license:  licenseName,
        price:    lic.price,
        audioUrl: lic.file_path,
        cover:    lic.cover_url || null,
        wav:      lic.wav_url   || null,
        stems:    lic.stems_url || null,
      }
    })

    // ── 5) Compare amounts (tiny rounding gap allowed) ────────────────
    if (Math.abs(expectedTotal - paidAmount) > 0.005) {
      return res.status(400).json({
        error:    'Amount mismatch',
        expected: expectedTotal,
        paid:     paidAmount,
      })
    }

    // ── 6) Write to purchases as that user ────────────────────────────
    const { data: purchase, error: insertErr } = await supabaseAdmin
      .from('purchases')
      .insert([{
        user_id:                 userId,                // ← use userId here
        email:                   orderData.payer.email_address,
        beats:                   enriched,
        total:                   expectedTotal,
        paypal_transaction_id:   orderID,
        created_at:              new Date().toISOString(),
      }])

    if (insertErr) throw insertErr

    // ── 7) All done! ────────────────────────────────────────────────
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('complete-purchase error:', err)
    return res.status(500).json({ error: err.message })
  }
}
