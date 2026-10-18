-- Point preview URLs at the cdn domain instead of beat-audio's r2.dev URL.
--
-- Run RIGHT AFTER the new code is deployed with PUBLIC_R2_URL=https://cdn.antonboss.com
-- (the audio proxy only streams from that host). The keys stay the same, so the
-- URLs work whichever bucket cdn.antonboss.com points at: beat-audio now,
-- beat-previews after the domain move. Must be done before r2.dev access is
-- turned off on beat-audio.
--
-- Undo: update public."BeatFiles" b set audiourl = o.audiourl
--       from backup."BeatFiles_20261018" o where o.id = b.id;

update public."BeatFiles"
set audiourl = regexp_replace(audiourl, '^https?://[^/]+\.r2\.dev/', 'https://cdn.antonboss.com/')
where audiourl ~ '^https?://[^/]+\.r2\.dev/';

update public."BeatFiles"
set cover = regexp_replace(cover, '^https?://[^/]+\.r2\.dev/', 'https://cdn.antonboss.com/')
where cover ~ '^https?://[^/]+\.r2\.dev/';

-- Check: should be 0.
select count(*) as still_on_r2_dev
from public."BeatFiles"
where audiourl ~ '\.r2\.dev/' or cover ~ '\.r2\.dev/';
