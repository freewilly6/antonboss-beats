// src/components/cd/textures.js
//
// Texture helpers shared by the 3D CD cases and the MPC. Everything here is
// drawn on a <canvas> or loaded once and cached — no font files or HDRs are
// fetched at runtime, so the scenes work offline and never wait on a CDN.

import * as THREE from 'three';

const coverCache = new Map(); // url -> THREE.Texture
const loader = typeof window !== 'undefined' ? new THREE.TextureLoader() : null;
if (loader) loader.setCrossOrigin('anonymous');

export const DEFAULT_COVER = '/images/beats/default-cover.png';

// Covers are uploaded at full size, but a disc texture is 512px. Next's image
// optimizer (already configured for the Supabase bucket in next.config.js)
// serves a resized WebP — typically a few dozen KB instead of a few MB. 640 is
// the smallest configured width that covers 512.
const COVER_WIDTH = 640;
function optimized(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${COVER_WIDTH}&q=75`;
}

/**
 * Cover art as a texture, cached per URL so each image is fetched and decoded
 * once however many discs print it. Falls back to the default
 * cover if the image can't be loaded (bad URL, missing CORS header).
 * `onReady(texture)` fires once the image is in, synchronously if cached.
 */
export function getCoverTexture(url, onReady) {
  const key = url || DEFAULT_COVER;
  const cached = coverCache.get(key);
  if (cached) {
    // Already loaded: call back straight away. The texture is passed in, since
    // the caller hasn't received the return value yet at this point.
    if (cached.image) onReady?.(cached);
    else cached.userData.waiters.push(onReady);
    return cached;
  }

  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.waiters = [onReady];
  coverCache.set(key, tex);

  const done = (img) => {
    tex.image = img;
    tex.needsUpdate = true;
    tex.userData.waiters.forEach((fn) => fn?.(tex));
    tex.userData.waiters = [];
  };

  // Resized copy first, then the original, then the default cover.
  const tries = [optimized(key), key, DEFAULT_COVER].filter((u, i, a) => a.indexOf(u) === i);
  const attempt = (i) => {
    if (i >= tries.length) return;
    loader.load(tries[i], (t) => done(t.image), undefined, () => attempt(i + 1));
  };
  attempt(0);

  return tex;
}

/** A canvas-backed texture you can redraw. Call `draw(ctx, w, h)` then it uploads. */
export function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const redraw = (fn = draw) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    fn(ctx, width, height);
    tex.needsUpdate = true;
  };

  redraw();
  return { texture: tex, redraw };
}

export const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
