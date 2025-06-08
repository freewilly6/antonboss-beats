// pages/api/complete-purchase.js

import fetch from 'node-fetch'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

// PayPal endpoint (sandbox vs prod)
const PAYPAL_API =
  process.env.NODE_ENV === 'production'
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
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1) Auth
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }
  const jwt = auth.split(' ')[1]
  let user
  try {
    const { data, error: userErr } = await supabaseAdmin.auth.getUser(jwt)
    if (userErr || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    user = data.user
  } catch (err) {
    console.error('[complete-purchase] auth error:', err)
    return res.status(500).json({ error: 'Error validating user session' })
  }

  // 2) Parse & very basic validation
  const { orderID, items } = req.body || {}
  console.log('[complete-purchase] incoming body:', JSON.stringify(req.body, null, 2))

  if (!orderID || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing orderID or items' })
  }

  try {
    // 3) Verify PayPal order
    const token = await getPayPalToken()
    const ppRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!ppRes.ok) {
      const detail = await ppRes.text()
      console.error('[complete-purchase] PayPal lookup failed:', detail)
      return res.status(400).json({ error: 'PayPal lookup failed', detail })
    }
    const orderData = await ppRes.json()
    if (orderData.status !== 'COMPLETED') {
      console.error('[complete-purchase] Order not completed:', orderData.status)
      return res.status(400).json({ error: 'Order not completed', status: orderData.status })
    }
    const paidAmount = parseFloat(orderData.purchase_units[0].amount.value)

    // 4) Validate & coerce beatIds
    const validatedItems = items.map(i => ({
      beatId:      Number(i.beatId),
      licenseName: i.licenseName,
    }))
    const invalid = validatedItems.filter(i => !Number.isInteger(i.beatId))
    if (invalid.length) {
      console.error('[complete-purchase] invalid beatId(s):', invalid)
      return res.status(400).json({ error: 'One or more items missing a valid beatId', invalid })
    }

    // 5) Fetch beat metadata
    const beatIds = [...new Set(validatedItems.map(i => i.beatId))]
    const { data: beats, error: beatErr } = await supabaseAdmin
      .from('BeatFiles')
      .select('id, name, licenses, cover')
      .in('id', beatIds)

    if (beatErr) {
      console.error('[complete-purchase] fetching beats failed:', beatErr)
      throw beatErr
    }

    // 6) Recalculate & enrich
    let expectedTotal = 0
    const enriched = validatedItems.map(({ beatId, licenseName }) => {
      const beat = beats.find(b => b.id === beatId)
      if (!beat) {
        throw new Error(`Beat ${beatId} not found`)
      }

      // parse & normalize licenses array
      const licenses = typeof beat.licenses === 'string'
        ? JSON.parse(beat.licenses)
        : beat.licenses || []

      // pull out each tier record
      const basic     = licenses.find(l => l.name.replace(/-/g,' ').trim() === 'Basic License')
      const premium   = licenses.find(l => l.name.replace(/-/g,' ').trim() === 'Premium License')
      const plus      = licenses.find(l => l.name.replace(/-/g,' ').trim() === 'Premium Plus License')
      const unlimited = licenses.find(l => l.name.replace(/-/g,' ').trim() === 'Unlimited License')

      // find the one they actually bought
      const pricedName = licenseName.replace(/-/g,' ').trim()
      const bought = licenses.find(l =>
        l.name.replace(/-/g,' ').trim() === pricedName
      )
      if (!bought) {
        throw new Error(`License ${licenseName} not on beat ${beatId}`)
      }

      // accumulate total
      expectedTotal += bought.price

      return {
        id:       beatId,
        name:     beat.name,
        license:  bought.name.replace(/-/g,' ').trim(),
        price:    bought.price,

        // MP3 always from Basic tier
        audioUrl: basic?.file_path || null,

        cover:    beat.cover || null,

        // WAV for Premium & up
        wav: ['Premium License','Premium Plus License','Unlimited License']
               .includes(bought.name.replace(/-/g,' ').trim())
             ? premium?.file_path
             : null,

        // Stems for Premium Plus & Unlimited
        stems: ['Premium Plus License','Unlimited License']
               .includes(bought.name.replace(/-/g,' ').trim())
             ? plus?.file_path
             : null,
      }
    })

    // 7) Compare paid vs expected
    if (Math.abs(expectedTotal - paidAmount) > 0.01) {
      console.error(
        '[complete-purchase] amount mismatch:',
        'expected', expectedTotal,
        'paid',     paidAmount
      )
      return res.status(400).json({
        error:    'Amount mismatch',
        expected: expectedTotal,
        paid:     paidAmount,
      })
    }

    // 8) Write to your purchases table
    const { data: purchase, error: insertErr } = await supabaseAdmin
      .from('purchases')
      .insert([{
        user_id:               user.id,
        email:                 orderData.payer.email_address,
        beats:                 enriched,
        total:                 expectedTotal,
        paypal_transaction_id: orderID,
        created_at:            new Date().toISOString(),
      }])
      .single()

    if (insertErr) {
      console.error('[complete-purchase] insert failed:', insertErr)
      throw insertErr
    }

    return res.status(200).json({ success: true, purchase })

  } catch (err) {
    console.error('[complete-purchase] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Unknown server error' })
  }
}
