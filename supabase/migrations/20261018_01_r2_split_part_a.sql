-- PART A — additive only. Safe to run while the CURRENT site is live: it adds
-- tables and columns but changes nothing the current code reads or writes.
-- Run after the preflight checks, before deploying the new code.

-- 0. Backups. Schema `backup` is not exposed through the Supabase API, so these
--    copies (which still contain file URLs) are not publicly readable.
create schema if not exists backup;
revoke all on schema backup from anon, authenticated;
create table backup."BeatFiles_20261018" as table public."BeatFiles";
create table backup.purchases_20261018 as table public.purchases;

begin;

-- 1. Paid-file keys, in a table the storefront can't read: RLS on, no policies,
--    no grants. Only the service role (our API routes) can touch it.
create table if not exists public.beat_assets (
  beat_id    bigint primary key references public."BeatFiles"(id) on delete cascade,
  mp3_key    text,   -- untagged MP3 (new; none exist yet)
  wav_key    text,
  stems_key  text,
  updated_at timestamptz not null default now()
);
alter table public.beat_assets enable row level security;
revoke all on public.beat_assets from anon, authenticated;

-- Keys = the URL path after the host: https://cdn.antonboss.com/wav/123-x.wav → wav/123-x.wav
insert into public.beat_assets (beat_id, wav_key, stems_key)
select id,
       case when wav   ~ '^https?://' then nullif(regexp_replace(wav,   '^https?://[^/]+/', ''), '') end,
       case when stems ~ '^https?://' then nullif(regexp_replace(stems, '^https?://[^/]+/', ''), '') end
from public."BeatFiles"
on conflict (beat_id) do update
  set wav_key   = coalesce(public.beat_assets.wav_key,   excluded.wav_key),
      stems_key = coalesce(public.beat_assets.stems_key, excluded.stems_key);

-- 2. Purchase status. Every existing row was checked COMPLETED with PayPal when
--    it was recorded, so they are all paid.
alter table public.purchases
  add column if not exists status            text,
  add column if not exists paypal_order_id   text,
  add column if not exists paypal_capture_id text,
  add column if not exists paid_at           timestamptz;

update public.purchases set status = 'paid', paid_at = coalesce(paid_at, created_at) where status is null;

-- The current code inserts without a status (after verifying payment), so the
-- default stays 'paid' until the new code is live. Part B flips it to 'pending'.
alter table public.purchases alter column status set default 'paid';
alter table public.purchases alter column status set not null;
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
  check (status in ('pending', 'paid', 'refunded', 'reversed', 'denied'));

-- One purchase per PayPal order (closes replaying one payment for other beats).
-- If an order was recorded twice, the earliest row takes the order id; the
-- others stay paid, just without it.
with firsts as (
  select distinct on (paypal_transaction_id) ctid as c
  from public.purchases
  where paypal_transaction_id is not null
  order by paypal_transaction_id, created_at
)
update public.purchases set paypal_order_id = paypal_transaction_id
where ctid in (select c from firsts) and paypal_order_id is null;

create unique index if not exists purchases_paypal_order_id_key
  on public.purchases (paypal_order_id) where paypal_order_id is not null;
create index if not exists purchases_paypal_capture_id_idx on public.purchases (paypal_capture_id);

-- 3. Verified PayPal webhook deliveries (server only).
create table if not exists public.paypal_webhook_events (
  id          text primary key,           -- PayPal event id (dedupes retries)
  event_type  text not null,
  order_id    text,
  capture_id  text,
  amount      numeric(10, 2),
  received_at timestamptz not null default now()
);
alter table public.paypal_webhook_events enable row level security;
revoke all on public.paypal_webhook_events from anon, authenticated;
create index if not exists paypal_webhook_events_order_idx on public.paypal_webhook_events (order_id);

commit;

-- Check: every beat with a WAV/stems URL now has a key.
select count(*) filter (where b.wav   is not null) as wav_urls,   count(a.wav_key)   as wav_keys,
       count(*) filter (where b.stems is not null) as stems_urls, count(a.stems_key) as stems_keys
from public."BeatFiles" b left join public.beat_assets a on a.beat_id = b.id;
