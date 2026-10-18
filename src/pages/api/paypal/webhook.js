// pages/api/paypal/webhook.js
//
// The only thing that unlocks downloads. PayPal calls this when a payment
// settles; we verify the signature with PayPal, record the event, and move
// the matching purchase to paid (or refunded / reversed / denied).
//
// Set up in the PayPal dashboard: Apps & Credentials → your app → Webhooks,
// URL https://<site>/api/paypal/webhook, events PAYMENT.CAPTURE.COMPLETED,
// .DENIED, .REFUNDED, .REVERSED. Its ID goes in PAYPAL_WEBHOOK_ID.

import { verifyWebhook } from '../../../lib/paypal';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { confirmCapture, setStatus } from '../../../lib/purchases';

// Signature verification needs the exact bytes PayPal sent.
export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/** The capture id a refund/reversal points back to. */
const captureIdFromLinks = (resource) =>
  resource?.links?.find((l) => l.rel === 'up' && /\/captures\//.test(l.href))?.href.split('/captures/')[1]?.split(/[/?]/)[0];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const raw = await readRaw(req);
  let ok = false;
  try {
    ok = await verifyWebhook(req.headers, raw);
  } catch (err) {
    console.error('[paypal-webhook] verification error:', err);
    return res.status(500).end(); // PayPal retries
  }
  if (!ok) {
    console.warn('[paypal-webhook] rejected an unverified delivery');
    return res.status(400).end();
  }

  const event = JSON.parse(raw);
  const r = event.resource || {};
  const type = event.event_type;

  try {
    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      const amount = Number(r.amount?.value);
      if (r.amount?.currency_code !== 'USD') console.warn('[paypal-webhook] non-USD capture', event.id);

      // Record first, so a purchase row created later can settle against it.
      await supabaseAdmin
        .from('paypal_webhook_events')
        .upsert(
          { id: event.id, event_type: type, order_id: orderId, capture_id: r.id, amount },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      if (orderId) {
        const result = await confirmCapture({ orderId, captureId: r.id, amount });
        console.log(`[paypal-webhook] ${type} ${orderId}: ${result}`);
      }
    } else if (type === 'PAYMENT.CAPTURE.DENIED') {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      if (orderId) await setStatus({ orderId, status: 'denied' });
    } else if (type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED') {
      const captureId = captureIdFromLinks(r) || r.id;
      // A partial refund (a goodwill discount, say) leaves the license intact.
      const { data } = await supabaseAdmin.from('purchases').select('total').eq('paypal_capture_id', captureId);
      const total = Number(data?.[0]?.total);
      const refunded = Number(r.amount?.value);
      if (type === 'PAYMENT.CAPTURE.REVERSED' || !(refunded < total - 0.01)) {
        await setStatus({ captureId, status: type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refunded' : 'reversed' });
      } else {
        console.log(`[paypal-webhook] partial refund on ${captureId}: ${refunded} of ${total}; license kept`);
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`[paypal-webhook] handling ${type} failed:`, err);
    return res.status(500).end(); // PayPal retries
  }
}
