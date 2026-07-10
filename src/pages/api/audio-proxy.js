// src/pages/api/audio-proxy.js
//
// Streams a beat from R2 through our own origin.
//
// Why this exists: the visualizer routes the global <audio> element through a
// MediaElementAudioSourceNode. Once an element is inside a Web Audio graph, the
// browser emits SILENCE for any media it cannot CORS-verify — the clock still
// advances, the playbar still moves, and no sound comes out. Setting
// crossOrigin="anonymous" without matching bucket headers is worse still: the
// media fetch fails outright and nothing loads.
//
// Serving the bytes from our own origin sidesteps both. The audio is same-origin,
// so it plays, and the analyser gets real samples.
//
// The zero-bandwidth alternative is a CORS policy on the R2 bucket plus
// NEXT_PUBLIC_AUDIO_CORS=1, which makes lib/playbackUrl.js bypass this route.

import { Readable } from 'node:stream';

const PUBLIC_R2_URL = process.env.PUBLIC_R2_URL;

/** Only ever proxy the hosts we publish audio from. Anything else is an SSRF. */
function allowedHosts() {
  const hosts = [];
  for (const base of [PUBLIC_R2_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    try {
      if (base) hosts.push(new URL(base).host);
    } catch {
      /* ignore a malformed env var */
    }
  }
  return hosts;
}

export const config = {
  api: {
    // Audio files run to several megabytes; Next caps API responses at 4MB
    // unless we opt out, and we are streaming rather than buffering anyway.
    responseLimit: false,
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end('Method Not Allowed');
  }

  const raw = req.query.url;
  if (!raw || typeof raw !== 'string') return res.status(400).end('Missing url');

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).end('Malformed url');
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).end('Unsupported protocol');
  }
  if (!allowedHosts().includes(target.host)) {
    return res.status(403).end('Host not allowed');
  }

  // Forward the browser's Range request verbatim. Without this, seeking in the
  // playbar breaks: the element needs 206 Partial Content to jump around.
  const headers = {};
  if (req.headers.range) headers.range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(target.toString(), { method: req.method, headers });
  } catch (err) {
    console.error('[audio-proxy] upstream fetch failed:', err.message);
    return res.status(502).end('Upstream fetch failed');
  }

  if (!upstream.ok && upstream.status !== 206) {
    return res.status(upstream.status).end('Upstream error');
  }

  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  if (!upstream.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.status(upstream.status);

  if (req.method === 'HEAD' || !upstream.body) return res.end();

  // Stream rather than buffer: a 3MB Buffer per listener is needless memory.
  const stream = Readable.fromWeb(upstream.body);
  stream.on('error', (err) => {
    console.error('[audio-proxy] stream error:', err.message);
    res.destroy(err);
  });
  stream.pipe(res);
}
