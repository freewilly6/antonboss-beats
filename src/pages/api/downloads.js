// pages/api/downloads.js
//
// A signed-in buyer's library. For every beat in a PAID purchase (matched by
// account, or by the PayPal email on older purchases), returns presigned GET
// links — valid 24 hours, with clean filenames — for exactly the files that
// license tier includes. Also returns pending and past orders for display.
//
// Basic tier needs an MP3. Beats uploaded before the untagged-MP3 slot have
// only the tagged preview, so until the admin uploads an untagged one, Basic
// buyers get the tagged MP3 — signed from whichever bucket currently holds it,
// so this works before, during and after the bucket split.

import { requireUser } from '../../lib/serverAuth';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { PUBLIC_BUCKET, PRIVATE_BUCKET, DOWNLOAD_TTL, keyFromR2Url, presignDownload, objectExists } from '../../lib/r2';
import { tierIndex, filesForTier, normalizeLicense, TIERS, FILE_LABELS } from '../../lib/licenses';

const TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav', stems: 'application/zip' };

const parseItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

/** "Anton Boss - Supernova (WAV).wav", minus characters filesystems dislike. */
function fileName(beat, kind, key) {
  const ext = (key.match(/\.[a-z0-9]{2,4}$/i)?.[0] || `.${kind === 'stems' ? 'zip' : kind}`).toLowerCase();
  const base = `${beat.artist || 'Anton Boss'} - ${beat.name || 'Beat'} (${FILE_LABELS[kind]})`;
  return base.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() + ext;
}

/** Purchases for this buyer: by account, plus older ones by PayPal email. */
async function buyerPurchases(user) {
  const cols = 'paypal_order_id, paypal_transaction_id, created_at, total, status, beats';
  const queries = [supabaseAdmin.from('purchases').select(cols).eq('user_id', user.id)];
  if (user.email) {
    // ilike for a case-insensitive exact match; escape its wildcards.
    const email = user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
    queries.push(supabaseAdmin.from('purchases').select(cols).ilike('email', email));
  }
  const results = await Promise.all(queries);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;

  const seen = new Set();
  return results
    .flatMap((r) => r.data || [])
    .filter((p) => {
      const id = p.paypal_order_id || p.paypal_transaction_id || `${p.created_at}|${p.total}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function signFile(beat, assets, kind) {
  const column = { mp3: 'mp3_key', wav: 'wav_key', stems: 'stems_key' }[kind];
  const key = assets?.[column];
  if (key) return { kind, label: FILE_LABELS[kind], filename: fileName(beat, kind, key), url: await presignDownload(PRIVATE_BUCKET, key, fileName(beat, kind, key), TYPES[kind]) };

  if (kind === 'mp3') {
    const tagged = keyFromR2Url(beat.audiourl);
    if (!tagged) return null;
    // Before the split the tagged MP3 lives in the (soon private) old bucket;
    // after it, in the public one. Sign from wherever it is.
    const bucket = (await objectExists(PRIVATE_BUCKET, tagged)) ? PRIVATE_BUCKET : PUBLIC_BUCKET;
    const name = fileName(beat, 'mp3', tagged);
    return { kind, label: FILE_LABELS.mp3, filename: name, url: await presignDownload(bucket, tagged, name, TYPES.mp3), tagged: true };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  // Signed links are personal and short-lived: never cache this response.
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const purchases = await buyerPurchases(user);

    // Best tier owned per beat, across all paid purchases.
    const owned = new Map();
    for (const p of purchases.filter((p) => p.status === 'paid' || p.status == null)) {
      for (const item of parseItems(p.beats)) {
        const beatId = Number(item.id ?? item.beatId);
        const tier = tierIndex(item.license ?? item.licenseType ?? item.name);
        if (!Number.isInteger(beatId) || tier < 0) continue;
        const prev = owned.get(beatId);
        if (!prev || tier > prev.tier) owned.set(beatId, { tier, purchasedAt: p.created_at });
      }
    }

    const ids = [...owned.keys()];
    const [{ data: beats, error: bErr }, { data: assets, error: aErr }] = ids.length
      ? await Promise.all([
          supabaseAdmin.from('BeatFiles').select('id, name, artist, cover, audiourl').in('id', ids),
          supabaseAdmin.from('beat_assets').select('beat_id, mp3_key, wav_key, stems_key').in('beat_id', ids),
        ])
      : [{ data: [] }, { data: [] }];
    if (bErr || aErr) throw bErr || aErr;

    const library = await Promise.all(
      ids.map(async (id) => {
        const { tier, purchasedAt } = owned.get(id);
        const beat = beats.find((b) => b.id === id);
        if (!beat) return { beatId: id, name: 'Removed beat', license: TIERS[tier], purchasedAt, files: [], unavailable: true };
        const a = assets.find((x) => x.beat_id === id);
        const kinds = filesForTier(tier);
        const files = (await Promise.all(kinds.map((k) => signFile(beat, a, k)))).filter(Boolean);
        return {
          beatId: id,
          name: beat.name,
          artist: beat.artist,
          cover: beat.cover,
          license: TIERS[tier],
          purchasedAt,
          files,
          missing: kinds.filter((k) => !files.some((f) => f.kind === k)),
        };
      })
    );

    const orders = purchases.map((p) => ({
      orderId: p.paypal_order_id || p.paypal_transaction_id || null,
      createdAt: p.created_at,
      total: p.total,
      status: p.status || 'paid',
      items: parseItems(p.beats).map((i) => ({ name: i.name, license: normalizeLicense(i.license ?? i.licenseType ?? '') })),
    }));

    return res.status(200).json({
      library: library.sort((a, b) => String(b.purchasedAt).localeCompare(String(a.purchasedAt))),
      orders,
      pending: orders.some((o) => o.status === 'pending'),
      expiresAt: new Date(Date.now() + DOWNLOAD_TTL * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[downloads] failed:', err);
    return res.status(500).json({ error: 'Could not load your downloads' });
  }
}
