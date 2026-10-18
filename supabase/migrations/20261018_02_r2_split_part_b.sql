-- PART B — cleanup. Run ONLY after the new code is deployed and you have
-- confirmed downloads work from /account. The old code reads the URLs this
-- removes; the new code never does.

begin;

-- 1. No paid-file locations on the public BeatFiles table.
update public."BeatFiles" set wav = null, stems = null
where wav is not null or stems is not null;

-- licenses keeps tier names and prices only (file_path was a full file URL).
update public."BeatFiles" b
set licenses = (
  select coalesce(jsonb_agg(jsonb_build_object('name', l->>'name', 'price', (l->>'price')::numeric)), '[]'::jsonb)
  from jsonb_array_elements(b.licenses::jsonb) l
)
where b.licenses is not null and jsonb_typeof(b.licenses::jsonb) = 'array';

-- 2. Purchases keep what was bought, not where the files were. Handles rows
--    stored as a JSON array or as a JSON string holding one.
update public.purchases p
set beats = (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id',      coalesce(i->'id', i->'beatId'),
           'name',    i->'name',
           'license', coalesce(i->'license', i->'licenseType'),
           'price',   i->'price'))), '[]'::jsonb)
  from jsonb_array_elements(
         case when jsonb_typeof(p.beats::jsonb) = 'string' then (p.beats::jsonb #>> '{}')::jsonb
              else p.beats::jsonb end) i
)
where p.beats is not null
  and jsonb_typeof(case when jsonb_typeof(p.beats::jsonb) = 'string' then (p.beats::jsonb #>> '{}')::jsonb
                        else p.beats::jsonb end) = 'array';

-- 3. From now on a purchase starts pending; only the webhook marks it paid.
alter table public.purchases alter column status set default 'pending';

commit;

-- Check: should all be 0.
select (select count(*) from public."BeatFiles" where wav is not null or stems is not null) as beat_urls_left,
       (select count(*) from public."BeatFiles" where licenses::text like '%file_path%')    as license_paths_left,
       (select count(*) from public.purchases where beats::text ~ 'https?://')             as purchase_urls_left;
