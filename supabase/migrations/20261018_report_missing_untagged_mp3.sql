-- Beats with no untagged MP3 yet. Until one is uploaded, Basic buyers of these
-- beats receive the tagged preview. (Also shown live on /admin: "No untagged MP3".)
select b.id, b.name, b.artist, b.created_at
from public."BeatFiles" b
left join public.beat_assets a on a.beat_id = b.id
where a.mp3_key is null
order by b.created_at desc;
