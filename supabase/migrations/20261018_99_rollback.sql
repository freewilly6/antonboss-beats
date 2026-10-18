-- ROLLBACK. Run the section matching how far you got. Revert the code deploy
-- FIRST if the new code is live: it needs the part A tables.

-- ── Undo PART B (restores URLs from the backups made in part A) ────────────
begin;
update public."BeatFiles" b
   set wav = k.wav, stems = k.stems, licenses = k.licenses
  from backup."BeatFiles_20261018" k
 where k.id = b.id;
update public.purchases p
   set beats = k.beats
  from backup.purchases_20261018 k
 where k.created_at = p.created_at
   and k.paypal_transaction_id is not distinct from p.paypal_transaction_id;
alter table public.purchases alter column status set default 'paid';
commit;

-- ── Undo PART A (only with the OLD code deployed) ──────────────────────────
-- Purchases made through the new checkout after part A keep their rows; they
-- just lose the status column, so check none are still 'pending' first:
--   select * from public.purchases where status <> 'paid';
begin;
drop table if exists public.paypal_webhook_events;
drop table if exists public.beat_assets;
drop index if exists public.purchases_paypal_order_id_key;
drop index if exists public.purchases_paypal_capture_id_idx;
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases
  drop column if exists status,
  drop column if exists paypal_order_id,
  drop column if exists paypal_capture_id,
  drop column if exists paid_at;
commit;

-- Backups stay in schema `backup` until you drop them:
--   drop schema backup cascade;
