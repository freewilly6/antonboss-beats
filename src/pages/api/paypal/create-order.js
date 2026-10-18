// pages/api/paypal/create-order.js
//
// Step 1 of checkout. Prices the cart from the database, creates a PayPal
// order with those exact line items, and records a PENDING purchase tied to
// the order id. The buyer then approves in PayPal; nothing unlocks until the
// webhook confirms the capture.
//
// Fixing the contents here, server-side, is what stops one payment being
// replayed for different beats (the old flow let the client name the items
// after paying).

import { requireUser } from '../../../lib/serverAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createOrder } from '../../../lib/paypal';
import { priceItems, toPurchaseItems } from '../../../lib/checkoutItems';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  let items;
  try {
    items = await priceItems(req.body?.items);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const order = await createOrder(items);
    const { error } = await supabaseAdmin.from('purchases').insert([
      {
        user_id: user.id,
        email: user.email,
        beats: toPurchaseItems(items),
        total: Number(order.total.toFixed(2)),
        paypal_order_id: order.id,
        paypal_transaction_id: order.id, // older pages display this
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) throw error;
    return res.status(200).json({ orderID: order.id });
  } catch (err) {
    console.error('[create-order] failed:', err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
