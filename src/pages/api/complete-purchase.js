// pages/api/complete-purchase.js — LEGACY, for the rollout window only.
//
// The old cart created and captured PayPal orders in the browser, then called
// this route. A buyer whose cart page loaded before the new deploy still runs
// that code; if this route vanished, they'd pay and get nothing recorded.
//
// So it stays, hardened: it records a PENDING purchase (the webhook still has
// to confirm it), prices from the database, checks the amount PayPal actually
// captured, and one order id can only ever be recorded once.
//
// Safe to delete a week or so after the deploy (see docs/r2-private-rollout.md).

import { requireUser } from '../../lib/serverAuth';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { getOrder, firstCapture } from '../../lib/paypal';
import { priceItems, toPurchaseItems } from '../../lib/checkoutItems';
import { settleFromRecordedEvents } from '../../lib/purchases';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const orderID = String(req.body?.orderID || '');
  if (!orderID) return res.status(400).json({ error: 'Missing orderID' });

  let items;
  try {
    items = await priceItems(req.body?.items);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const order = await getOrder(orderID);
    const capture = firstCapture(order);
    if (order.status !== 'COMPLETED' || !capture) return res.status(400).json({ error: 'Order not completed' });

    const total = items.reduce((s, i) => s + i.price, 0);
    if (Math.abs(total - capture.amount) > 0.01) {
      return res.status(400).json({ error: 'Amount mismatch', expected: total, paid: capture.amount });
    }

    const { error } = await supabaseAdmin.from('purchases').insert([
      {
        user_id: user.id,
        email: order.payer?.email_address || user.email,
        beats: toPurchaseItems(items),
        total: Number(total.toFixed(2)),
        paypal_order_id: orderID,
        paypal_transaction_id: orderID,
        paypal_capture_id: capture.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      // Unique paypal_order_id: this payment is already recorded.
      if (error.code === '23505') return res.status(409).json({ error: 'This payment is already recorded' });
      throw error;
    }

    await settleFromRecordedEvents(orderID);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[complete-purchase] failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
