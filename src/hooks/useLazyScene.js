// src/hooks/useLazyScene.js
//
// For the three.js scenes (CD shelf, MPC). three.js is the largest download
// on the site, and both scenes sit well below the fold, so neither belongs on
// the critical path. This hook:
//
//   1. prefetches the scene's chunk once the page has gone idle, so it's
//      already cached by the time anyone scrolls down, and
//   2. reports `near` once the placeholder comes within `margin` of the
//      viewport — the signal to mount the scene. Sticky: once near, always.
//
// Net effect: first load doesn't pay for three.js, and the scene is ready (not
// still downloading) when it scrolls into view.

import { useEffect, useState } from 'react';

export function useLazyScene(ref, prefetch, margin = '25% 0px') {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);

  useEffect(() => {
    // After load and an idle gap, so it never competes with first paint or
    // the hero's own scripts.
    let idle;
    const start = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => prefetch(), { timeout: 4000 })
        : setTimeout(prefetch, 1500);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
    // prefetch is a module-level import thunk; it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return near;
}

/** Fades a canvas in once it has drawn, instead of popping in half-built. */
export function sceneFadeStyle(ready) {
  return {
    opacity: ready ? 1 : 0,
    transform: ready ? 'none' : 'translateY(12px) scale(0.985)',
    transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
  };
}
