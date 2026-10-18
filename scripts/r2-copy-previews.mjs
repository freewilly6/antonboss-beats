#!/usr/bin/env node
// scripts/r2-copy-previews.mjs
//
// Copies every tagged preview MP3 — the .mp3 objects at the ROOT of the
// private bucket (beat-audio) — into the public bucket (beat-previews) at the
// SAME key, so every stored preview URL keeps working once cdn.antonboss.com
// points at beat-previews. Server-side copies: nothing is downloaded.
//
// Also copies cover art stored under covers/ (older covers live in Supabase
// Storage and aren't affected). Paid files are never touched: nothing under
// wav/, stems/ or mp3/ is listed.
//
//   node --env-file=.env.local scripts/r2-copy-previews.mjs            # dry run
//   node --env-file=.env.local scripts/r2-copy-previews.mjs --apply    # copy
//   node --env-file=.env.local scripts/r2-copy-previews.mjs --verify   # check every
//        beat's preview exists in the public bucket (needs Supabase env vars)
//
// Needs: R2_ENDPOINT (or R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_PUBLIC_BUCKET, R2_PRIVATE_BUCKET; for --verify also
// NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { S3Client, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const VERIFY = args.has('--verify');

const env = (name, fallback) => {
  const v = process.env[name] || fallback;
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
};

const endpoint = process.env.R2_ENDPOINT || `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`;
const FROM = env('R2_PRIVATE_BUCKET', process.env.R2_BUCKET);
const TO = env('R2_PUBLIC_BUCKET');
const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
});

async function head(bucket, key) {
  try {
    return await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return null;
    throw err;
  }
}

async function* list(bucket, prefix, keep) {
  let token;
  do {
    // Delimiter "/" lists one level only; subfolders come back as CommonPrefixes.
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/', ContinuationToken: token })
    );
    for (const o of page.Contents || []) if (keep(o.Key)) yield o;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

async function* publicObjects(bucket) {
  yield* list(bucket, '', (k) => k.toLowerCase().endsWith('.mp3'));
  yield* list(bucket, 'covers/', () => true);
}

async function copyAll() {
  console.log(`${APPLY ? 'Copying' : 'DRY RUN — would copy'} root .mp3s and covers/: ${FROM} → ${TO}\n`);
  let copied = 0, skipped = 0, failed = 0;
  for await (const obj of publicObjects(FROM)) {
    const existing = await head(TO, obj.Key);
    if (existing && existing.ContentLength === obj.Size) {
      skipped++;
      continue;
    }
    if (!APPLY) {
      console.log(`  would copy  ${obj.Key}  (${(obj.Size / 1e6).toFixed(1)} MB)`);
      copied++;
      continue;
    }
    try {
      await r2.send(
        new CopyObjectCommand({ Bucket: TO, Key: obj.Key, CopySource: `${FROM}/${encodeURIComponent(obj.Key)}` })
      );
      console.log(`  copied      ${obj.Key}`);
      copied++;
    } catch (err) {
      console.error(`  FAILED      ${obj.Key}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${APPLY ? 'Copied' : 'To copy'}: ${copied}   already there: ${skipped}   failed: ${failed}`);
  if (failed) process.exitCode = 1;
}

async function verify() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${url}/rest/v1/BeatFiles?select=id,name,audiourl,cover`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
  const beats = await res.json();
  console.log(`Checking ${beats.length} beats' previews exist in ${TO}…\n`);
  const keyOf = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  // Covers in Supabase Storage aren't part of the move.
  const onR2 = (url) => /(^|\.)r2\.dev$|^cdn\.antonboss\.com$/.test(new URL(url).host);
  let missing = 0;
  for (const b of beats) {
    const k = b.audiourl ? keyOf(b.audiourl) : null;
    if (!k || !(await head(TO, k))) {
      console.log(`  MISSING  #${b.id} ${b.name}  ${b.audiourl || '(no preview URL)'}`);
      missing++;
    }
    if (b.cover && onR2(b.cover) && !(await head(TO, keyOf(b.cover)))) {
      console.log(`  MISSING  #${b.id} ${b.name} cover  ${b.cover}`);
      missing++;
    }
  }
  console.log(missing ? `\n${missing} missing — do not move the domain yet.` : '\nAll previews present ✓');
  if (missing) process.exitCode = 1;
}

(VERIFY ? verify() : copyAll()).catch((err) => {
  console.error(err);
  process.exit(1);
});
