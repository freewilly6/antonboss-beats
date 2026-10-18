// pages/api/paypal/capture-order.js
//
// Step 2 of checkout, after the buyer approves in PayPal. Captures the
// payment for an order this buyer created. It does NOT mark the purchase
// paid: only the verified webhook does (lib/purchases.js). The response tells
// the page whether that has happened yet.

import { requireUser } from '../../../lib/serverAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { captureOrder, firstCapture } from '../../../lib/paypal';
import { settleFromRecordedEvents } from '../../../lib/purchases';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const orderID = String(req.body?.orderID || '');
  if (!orderID) return res.status(400).json({ error: 'Missing order' });

  const { data: rows, error } = await supabaseAdmin
    .from('purchases')
    .select('status, user_id')
    .eq('paypal_order_id', orderID);
  if (error) return res.status(500).json({ error: 'Server error' });
  const row = rows?.[0];
  if (!row || row.user_id !== user.id) return res.status(404).json({ error: 'Order not found' });

  try {
    const order = await captureOrder(orderID);
    const capture = firstCapture(order);
    const payerEmail = order?.payer?.email_address;
    await supabaseAdmin
      .from('purchases')
      .update({
        ...(capture ? { paypal_capture_id: capture.id } : {}),
        ...(payerEmail ? { email: payerEmail } : {}),
      })
      .eq('paypal_order_id', orderID);

    // The webhook may have beaten us here.
    await settleFromRecordedEvents(orderID);
    const { data: after } = await supabaseAdmin.from('purchases').select('status').eq('paypal_order_id', orderID);
    return res.status(200).json({ status: after?.[0]?.status || 'pending', captureStatus: capture?.status || order.status });
  } catch (err) {
    console.error('[capture-order] failed:', err);
    return res.status(502).json({ error: 'PayPal couldn’t complete the payment. You have not been charged twice — please try again.' });
  }
}
