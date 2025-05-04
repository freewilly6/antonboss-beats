// src/pages/api/complete-purchase.js
import { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { supabaseAdmin } from '../../lib/supabaseAdmin'  // your service-role key client

// PayPal credentials from env
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID
const PAYPAL_SECRET = process.env.PAYPAL_SECRET
const PAYPAL_API    = process.env.NODE_ENV === 'production'
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com'

// helper to get OAuth token
async function getPayPalToken() {
  const basic = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64')
  const resp = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  })
  const { access_token } = await resp.json()
  return access_token
}

export default async function handler(req = NextApiRequest, res = NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' })
  }

  const { orderID, items } = req.body
  // items = [ { beatId: string, licenseName: string } , … ]

  // 1) fetch PayPal order details
  const token = await getPayPalToken()
  const ppRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!ppRes.ok) {
    const err = await ppRes.text()
    return res.status(400).json({ error: 'PayPal lookup failed', detail: err })
  }
  const order = await ppRes.json()
  const paidAmount = parseFloat(order.purchase_units[0].amount.value)
  if (order.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Order not completed' })
  }

  // 2) recalculate expected total from your BeatFiles table
  const beatIds = Array.from(new Set(items.map(i => i.beatId)))
  const { data: beats, error: beatErr } = await supabaseAdmin
    .from('BeatFiles')
    .select('id,name,licenses')
    .in('id', beatIds)

  if (beatErr) {
    return res.status(500).json({ error: 'DB error', detail: beatErr })
  }

  let expected = 0
  const enriched = items.map(({ beatId, licenseName }) => {
    const beat = beats.find(b => b.id === beatId)
    if (!beat) {
      throw new Error(`Beat ${beatId} not found`)
    }
    // find the JSONB license object
    const lic = (beat.licenses || []).find(l => l.name === licenseName)
    if (!lic) {
      throw new Error(`License ${licenseName} not on beat ${beatId}`)
    }
    expected += lic.price
    return {
      id:          `${beatId}-${licenseName}`,
      name:        beat.name,
      license:     licenseName,
      price:       lic.price,
      audioUrl:    lic.file_path,
      cover:       lic.cover_url || null,
      wav:         lic.wav_url   || null,
      stems:       lic.stems_url || null,
    }
  })

  // 3) compare
  if (Math.abs(expected - paidAmount) > 0.005) {
    return res.status(400).json({
      error: 'Amount mismatch',
      expected,
      paid: paidAmount
    })
  }

  // 4) insert purchase with supabaseAdmin (service role)
  const { error: insertErr } = await supabaseAdmin
    .from('purchases')
    .insert([{
      user_id:               order.payer.payer_id,   // or map to your auth uid
      email:                 order.payer.email_address,
      beats:                 enriched,
      total:                 expected,
      paypal_transaction_id: order.id,
      created_at:            new Date().toISOString(),
    }])

  if (insertErr) {
    return res.status(500).json({ error: 'Failed to record purchase', detail: insertErr })
  }

  return res.status(200).json({ success: true })
}
