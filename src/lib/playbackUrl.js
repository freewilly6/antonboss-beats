// src/lib/playbackUrl.js
//
// Decides what URL the <audio> element should actually load.
//
// The element is wired into a Web Audio graph (see lib/audioGraph.js), and a
// graph emits silence for cross-origin media the browser cannot CORS-verify.
// So anything not already same-origin gets routed through /api/audio-proxy.
//
// Once the R2 bucket sends Access-Control-Allow-Origin, set NEXT_PUBLIC_AUDIO_CORS=1
// and this returns the direct URL instead — no proxy hop, no server bandwidth.

const AUDIO_CORS_ENABLED = process.env.NEXT_PUBLIC_AUDIO_CORS === '1';

/** The URL to feed the audio element. Falls back to the original on anything odd. */
export function toPlaybackUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (AUDIO_CORS_ENABLED) return url;
  if (typeof window === 'undefined') return url;

  // blob: and data: URLs (visitor uploads) are already same-origin.
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;

  let parsed;
  try {
    parsed = new URL(url, window.location.href);
  } catch {
    return url;
  }

  if (parsed.origin === window.location.origin) return url;
  return `/api/audio-proxy?url=${encodeURIComponent(parsed.toString())}`;
}

/** Absolute form, for comparing against `audio.src` — the DOM always reports it resolved. */
export function resolveSrc(url) {
  if (!url || typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}
