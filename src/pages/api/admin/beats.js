// pages/api/admin/beats.js
//
// The admin page's catalogue API (admin only, service role):
//
//   GET    list beats, with which files each has (booleans — keys stay here)
//   POST   create a beat from already-uploaded files
//   PATCH  edit details and/or swap files
//
// Public files (preview MP3, cover) are stored as full public URLs on
// BeatFiles. Paid files (untagged MP3, WAV, stems) are stored as object KEYS
// in beat_assets, a table with row-level security on and no policies, so the
// storefront's anon key can never read them.

import { requireAdmin } from '../../../lib/serverAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { PUBLIC_URL, PRIVATE_BUCKET, isKeyForKind, keyFromR2Url, deleteQuietly } from '../../../lib/r2';

const TEXT_FIELDS = ['name', 'artist', 'genre', 'mood', 'key', 'bpm'];
const ASSET_FIELDS = { mp3Key: ['mp3', 'mp3_key'], wavKey: ['wav', 'wav_key'], stemsKey: ['stems', 'stems_key'] };

// Prices only. Files are resolved per tier at download time.
const DEFAULT_LICENSES = [
  { name: 'Basic License', price: 24.99 },
  { name: 'Premium License', price: 34.99 },
  { name: 'Premium Plus License', price: 49.99 },
  { name: 'Unlimited License', price: 74.99 },
];

const pickText = (body) =>
  Object.fromEntries(
    TEXT_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, String(body[f] ?? '').trim().slice(0, 200)])
  );

/** A public URL we issued for `kind`, else an error message. */
function checkPublicUrl(url, kind) {
  if (typeof url !== 'string' || !url.startsWith(`${PUBLIC_URL}/`)) return `${kind} must be an uploaded file`;
  if (!isKeyForKind(keyFromR2Url(url), kind)) return `${kind} must be an uploaded file`;
  return null;
}

/** { mp3_key, ... } from the body's asset fields, validated. */
function pickAssets(body) {
  const out = {};
  for (const [field, [kind, column]] of Object.entries(ASSET_FIELDS)) {
    if (body[field] === undefined) continue;
    if (body[field] !== null && !isKeyForKind(body[field], kind)) throw new Error(`Invalid ${kind} upload`);
    out[column] = body[field];
  }
  return out;
}

async function list(res) {
  const [{ data: beats, error }, { data: assets, error: aErr }] = await Promise.all([
    supabaseAdmin
      .from('BeatFiles')
      .select('id, name, artist, genre, mood, key, bpm, audiourl, cover, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('beat_assets').select('beat_id, mp3_key, wav_key, stems_key'),
  ]);
  if (error || aErr) throw error || aErr;
  const byBeat = new Map((assets || []).map((a) => [a.beat_id, a]));
  return res.status(200).json({
    beats: (beats || []).map((b) => {
      const a = /** @type {{ mp3_key?: string, wav_key?: string, stems_key?: string }} */ (byBeat.get(b.id) || {});
      return { ...b, has: { mp3: !!a.mp3_key, wav: !!a.wav_key, stems: !!a.stems_key } };
    }),
  });
}

async function create(req, res, admin) {
  const body = req.body || {};
  const fields = pickText(body);
  if (!fields.name) return res.status(400).json({ error: 'Name required' });
  const bad = checkPublicUrl(body.previewUrl, 'preview') || checkPublicUrl(body.coverUrl, 'cover');
  if (bad) return res.status(400).json({ error: bad });
  const assets = pickAssets(body);

  const { data: beat, error } = await supabaseAdmin
    .from('BeatFiles')
    .insert([{ ...fields, audiourl: body.previewUrl, cover: body.coverUrl, user_id: admin.id, licenses: DEFAULT_LICENSES }])
    .select('id')
    .single();
  if (error) throw error;

  const { error: aErr } = await supabaseAdmin.from('beat_assets').upsert({ beat_id: beat.id, ...assets });
  if (aErr) {
    // Don't leave a beat whose paid files nobody can find.
    await supabaseAdmin.from('BeatFiles').delete().eq('id', beat.id);
    throw aErr;
  }
  return res.status(201).json({ id: beat.id });
}

async function update(req, res) {
  const body = req.body || {};
  const id = Number(body.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Missing beat id' });

  const updates = pickText(body);
  for (const [field, column, kind] of [['previewUrl', 'audiourl', 'preview'], ['coverUrl', 'cover', 'cover']]) {
    if (body[field] === undefined) continue;
    const bad = checkPublicUrl(body[field], kind);
    if (bad) return res.status(400).json({ error: bad });
    updates[column] = body[field];
  }
  const assets = pickAssets(body);

  if (Object.keys(updates).length) {
    const { error } = await supabaseAdmin.from('BeatFiles').update(updates).eq('id', id);
    if (error) throw error;
  }
  if (Object.keys(assets).length) {
    const { data: old } = await supabaseAdmin
      .from('beat_assets')
      .select('mp3_key, wav_key, stems_key')
      .eq('beat_id', id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from('beat_assets').upsert({ beat_id: id, ...assets, updated_at: new Date().toISOString() });
    if (error) throw error;
    // Downloads are signed against the current key, so the replaced file is
    // unreachable now. Remove it rather than pay to store it.
    for (const column of Object.keys(assets)) {
      if (old?.[column] && old[column] !== assets[column]) await deleteQuietly(PRIVATE_BUCKET, old[column]);
    }
  }
  return res.status(200).json({ success: true });
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return await list(res);
    if (req.method === 'POST') return await create(req, res, admin);
    if (req.method === 'PATCH') return await update(req, res);
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(`[admin/beats] ${req.method} failed:`, err);
    return res.status(err.message?.startsWith('Invalid') ? 400 : 500).json({ error: err.message || 'Server error' });
  }
}
