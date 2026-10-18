// pages/api/delete-beat.js
//
// Admin only. Deletes a beat and its files from both buckets — but refuses
// if anyone has bought it, because their downloads are signed against these
// very files and deleting them would take away something they paid for.

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireAdmin } from '../../lib/serverAuth';
import { PUBLIC_BUCKET, PRIVATE_BUCKET, keyFromR2Url, deleteQuietly } from '../../lib/r2';

const parseItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** How many purchases include beat `id`. Paged: the API caps rows per request. */
async function timesBought(id) {
  let count = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from('purchases').select('beats').order('created_at').range(from, from + 999);
    if (error) throw error;
    count += data.filter((p) => parseItems(p.beats).some((i) => Number(i?.id ?? i?.beatId) === id)).length;
    if (data.length < 1000) return count;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!(await requireAdmin(req, res))) return;

  const id = Number(req.body?.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Missing beat ID' });

  try {
    // Checked in code rather than with a jsonb filter: older rows store the
    // cart as a JSON string, and ids as strings or as beatId.
    const count = await timesBought(id);
    if (count > 0) {
      return res.status(409).json({
        error: `This beat has been bought ${count} time${count === 1 ? '' : 's'}; deleting it would break those buyers' downloads.`,
      });
    }

    // Files are looked up here, never taken from the client.
    const [{ data: beat, error: bErr }, { data: assets }] = await Promise.all([
      supabaseAdmin.from('BeatFiles').select('audiourl, cover, wav, stems').eq('id', id).single(),
      supabaseAdmin.from('beat_assets').select('mp3_key, wav_key, stems_key').eq('beat_id', id).maybeSingle(),
    ]);
    if (bErr || !beat) return res.status(404).json({ error: 'Beat not found' });

    const { error: dErr } = await supabaseAdmin.from('BeatFiles').delete().eq('id', id); // cascades beat_assets
    if (dErr) throw dErr;

    const previewKey = keyFromR2Url(beat.audiourl);
    const coverKey = keyFromR2Url(beat.cover);
    await Promise.all([
      deleteQuietly(PUBLIC_BUCKET, previewKey),
      deleteQuietly(PUBLIC_BUCKET, coverKey),
      // The pre-split tagged MP3 still sits in the private bucket at its old key.
      deleteQuietly(PRIVATE_BUCKET, previewKey),
      deleteQuietly(PRIVATE_BUCKET, assets?.mp3_key),
      deleteQuietly(PRIVATE_BUCKET, assets?.wav_key),
      deleteQuietly(PRIVATE_BUCKET, assets?.stems_key),
      // Legacy URL columns, until migration part B clears them.
      deleteQuietly(PRIVATE_BUCKET, keyFromR2Url(beat.wav)),
      deleteQuietly(PRIVATE_BUCKET, keyFromR2Url(beat.stems)),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-beat] failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
