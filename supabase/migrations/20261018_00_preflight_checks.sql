-- Read-only. Run in the Supabase SQL editor BEFORE part A and read the output.
-- Nothing here changes data.

-- 1. Column types the migration assumes. BeatFiles.id must be an integer type
--    (int4/int8): beat_assets.beat_id references it.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('BeatFiles','id'), ('BeatFiles','wav'), ('BeatFiles','stems'), ('BeatFiles','licenses'),
    ('purchases','beats'), ('purchases','paypal_transaction_id'), ('purchases','email')
  )
order by table_name, column_name;

-- 2. Paid-file URLs the migration will turn into keys. Every row should show an
--    R2 host (cdn.antonboss.com or *.r2.dev). Anything else: tell me first.
select id, name, wav, stems
from public."BeatFiles"
where (wav is not null and wav !~ '^https?://(cdn\.antonboss\.com|[^/]+\.r2\.dev)/')
   or (stems is not null and stems !~ '^https?://(cdn\.antonboss\.com|[^/]+\.r2\.dev)/');

-- 3. PayPal orders recorded more than once. Part A keeps the earliest row as
--    THE purchase for that order (all rows stay, all stay paid).
select paypal_transaction_id, count(*) as rows
from public.purchases
where paypal_transaction_id is not null
group by 1
having count(*) > 1;

-- 4. Sizes, for comparing against the backups afterwards.
select (select count(*) from public."BeatFiles") as beats,
       (select count(*) from public.purchases)   as purchases;
