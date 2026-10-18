// pages/api/admin/upload-url.js
//
// Hands the admin's browser a 15-minute presigned PUT so files go straight
// to R2. Uploading through this server can't work on Vercel: request bodies
// are capped at 4.5 MB and the filesystem is read-only.
//
// The client says what KIND of file it is; the server alone decides the
// bucket and the key. Previews and covers land in the public bucket and come
// back with their public URL; paid files land in the private bucket and come
// back with only their key.

import { requireAdmin } from '../../../lib/serverAuth';
import { UPLOAD_KINDS, bucketFor, newKey, presignPut, publicUrlFor, R2_NOT_CONFIGURED } from '../../../lib/r2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!(await requireAdmin(req, res))) return;

  const { kind, filename, contentType } = req.body || {};
  const spec = UPLOAD_KINDS[kind];
  if (!spec) return res.status(400).json({ error: 'Unknown file kind' });

  const name = String(filename || '').toLowerCase();
  if (!spec.exts.some((ext) => name.endsWith(ext))) {
    return res.status(400).json({ error: `Expected ${spec.exts.join(' / ')}` });
  }
  // Browsers report some types inconsistently (zip especially); fall back to
  // the canonical type for the kind rather than rejecting a valid file.
  const type = spec.types.includes(contentType) ? contentType : spec.types[0];

  try {
    const key = newKey(kind, filename);
    const uploadUrl = await presignPut(bucketFor(kind), key, type);
    return res.status(200).json({
      uploadUrl,
      contentType: type,
      key,
      ...(spec.bucket === 'public' ? { publicUrl: publicUrlFor(key) } : {}),
    });
  } catch (err) {
    console.error('[upload-url] presign failed:', err);
    // Admin only, so the configuration hint is safe to show.
    return res.status(500).json({ error: err.message === R2_NOT_CONFIGURED ? err.message : 'Could not prepare the upload' });
  }
}
