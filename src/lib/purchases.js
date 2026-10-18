// src/lib/purchases.js — SERVER ONLY.
//
// Moving a purchase to "paid". Only the PayPal webhook (verified) calls
// confirmCapture; the checkout routes never mark anything paid themselves.
//
// The webhook can arrive before the purchase row exists (the legacy checkout
// route writes its row after the buyer's browser captures). So every verified
// capture is also recorded in paypal_webhook_events, and a row created later
// settles itself against that record via settleFromRecordedEvents.

import { supabaseAdmin } from './supabaseAdmin';

const close = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

/** Mark the pending purchase for `orderId` paid, if the amount matches. */
export async function confirmCapture({ orderId, captureId, amount }) {
  const { data: rows, error } = await supabaseAdmin
    .from('purchases')
    .select('paypal_order_id, total, status')
    .eq('paypal_order_id', orderId);
  if (error) throw error;
  const row = rows?.[0];
  if (!row) return 'no-row'; // recorded; the row settles when it's created
  if (row.status === 'paid') return 'already-paid';
  if (!close(row.total, amount)) {
    console.error(`[purchases] amount mismatch on ${orderId}: paid ${amount}, expected ${row.total}`);
    return 'amount-mismatch';
  }
  const { error: upErr } = await supabaseAdmin
    .from('purchases')
    .update({ status: 'paid', paypal_capture_id: captureId, paid_at: new Date().toISOString() })
    .eq('paypal_order_id', orderId)
    .eq('status', 'pending');
  if (upErr) throw upErr;
  return 'paid';
}

/** For a row created after its webhook already arrived. */
export async function settleFromRecordedEvents(orderId) {
  const { data } = await supabaseAdmin
    .from('paypal_webhook_events')
    .select('capture_id, amount')
    .eq('order_id', orderId)
    .eq('event_type', 'PAYMENT.CAPTURE.COMPLETED')
    .limit(1);
  const ev = data?.[0];
  if (ev) await confirmCapture({ orderId, captureId: ev.capture_id, amount: ev.amount });
}

/**
 * Set a terminal status (refunded / reversed / denied) by capture or order.
 * @param {{ captureId?: string, orderId?: string, status: string }} args
 */
export async function setStatus({ captureId, orderId, status }) {
  let q = supabaseAdmin.from('purchases').update({ status });
  q = captureId ? q.eq('paypal_capture_id', captureId) : q.eq('paypal_order_id', orderId);
  const { error } = await q;
  if (error) throw error;
}
