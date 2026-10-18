// src/lib/r2.js — SERVER ONLY. Never import from a page or component.
//
// Two Cloudflare R2 buckets:
//
//   R2_PUBLIC_BUCKET   (beat-previews)  tagged preview MP3s and cover art,
//                                       served publicly at PUBLIC_R2_URL
//                                       (https://cdn.antonboss.com). The
//                                       database stores full public URLs.
//   R2_PRIVATE_BUCKET  (beat-audio)     paid files: untagged MP3s, WAVs,
//                                       stems. No public domain. The database
//                                       stores object KEYS only, and buyers
//                                       get short-lived presigned links.
//
// Key layout (the same in both buckets, so legacy keys never collide):
//   <ts>-<name>.mp3          tagged preview (root, as it always was)
//   covers/<ts>-<name>       cover art
//   mp3/<ts>-<name>.mp3      untagged MP3
//   wav/<ts>-<name>.wav      WAV
//   stems/<ts>-<name>.zip    stems

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

export const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET || 'beat-previews';
// R2_BUCKET is the old single-bucket name; honoured so nothing breaks mid-rollout.
export const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || process.env.R2_BUCKET || 'beat-audio';
export const PUBLIC_URL = (process.env.PUBLIC_R2_URL || 'https://cdn.antonboss.com').replace(/\/+$/, '');

/** Seconds a buyer's download link stays valid. */
export const DOWNLOAD_TTL = 24 * 60 * 60;
/** Seconds an admin upload link stays valid. */
const UPLOAD_TTL = 15 * 60;

/** What each kind of upload is, where it lives, and how its key starts. */
export const UPLOAD_KINDS = {
  preview: { bucket: 'public', prefix: '', exts: ['.mp3'], types: ['audio/mpeg'] },
  cover: { bucket: 'public', prefix: 'covers/', exts: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  mp3: { bucket: 'private', prefix: 'mp3/', exts: ['.mp3'], types: ['audio/mpeg'] },
  wav: { bucket: 'private', prefix: 'wav/', exts: ['.wav'], types: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] },
  stems: { bucket: 'private', prefix: 'stems/', exts: ['.zip'], types: ['application/zip', 'application/x-zip-compressed'] },
};

export const bucketFor = (kind) => (UPLOAD_KINDS[kind].bucket === 'public' ? PUBLIC_BUCKET : PRIVATE_BUCKET);

/** A fresh key for an upload of `kind`, built from a sanitised filename. */
export function newKey(kind, filename) {
  const safe = String(filename || 'upload').replace(/[^a-z0-9.\-_]/gi, '_').slice(-120);
  return `${UPLOAD_KINDS[kind].prefix}${Date.now()}-${safe}`;
}

/** True when `key` could have been issued by newKey() for `kind`. */
export function isKeyForKind(key, kind) {
  const spec = UPLOAD_KINDS[kind];
  if (!spec || typeof key !== 'string' || key.length > 300 || key.includes('..')) return false;
  if (!/^[a-z0-9.\-_/]+$/i.test(key)) return false;
  if (spec.prefix) return key.startsWith(spec.prefix) && !key.slice(spec.prefix.length).includes('/');
  return !key.includes('/'); // previews live at the root
}

export const publicUrlFor = (key) => `${PUBLIC_URL}/${key}`;

/**
 * The object key behind one of our R2 URLs, or null. Accepts the public
 * domain and legacy r2.dev hosts (beats uploaded before the custom domain).
 * Supabase-hosted covers and anything else return null.
 */
export function keyFromR2Url(url) {
  if (!url || typeof url !== 'string') return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const ours = new URL(PUBLIC_URL).host;
  if (u.host !== ours && !u.host.endsWith('.r2.dev')) return null;
  const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
  return key || null;
}

/** Presigned PUT, for the admin's browser to upload straight to R2. */
export function presignPut(bucket, key, contentType) {
  return getSignedUrl(r2, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: UPLOAD_TTL,
  });
}

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 name. */
function attachment(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Presigned GET that downloads as `filename`. */
export function presignDownload(bucket, key, filename, contentType) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: attachment(filename),
      ...(contentType ? { ResponseContentType: contentType } : {}),
    }),
    { expiresIn: DOWNLOAD_TTL }
  );
}

export async function objectExists(bucket, key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

/** Delete, ignoring "already gone". Logs and swallows other failures. */
export async function deleteQuietly(bucket, key) {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.warn(`[r2] could not delete ${bucket}/${key}:`, err.message);
  }
}
