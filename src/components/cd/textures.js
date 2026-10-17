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

  loader.load(key, (t) => done(t.image), undefined, () => {
    if (key === DEFAULT_COVER) return;
    loader.load(DEFAULT_COVER, (t) => done(t.image));
  });

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
