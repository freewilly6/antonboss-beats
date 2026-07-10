// src/lib/audioGraph.js
//
// Web Audio graph for the oscilloscope visualizer.
//
// Lives at module scope, NOT in React. `createMediaElementSource` may be called
// exactly once per media element for the lifetime of the page — a second call
// throws InvalidStateError. React StrictMode double-invokes effects, and route
// changes remount consumers, so the graph is memoized against the element itself.

const graphs = new WeakMap(); // HTMLMediaElement -> { ctx, source, analyser }

export const FFT_SIZE = 2048; // 2048 time-domain samples, 1024 frequency bins

/**
 * Returns the singleton graph for `audioEl`, building it on first call.
 * Returns null if Web Audio is unavailable.
 */
export function getAudioGraph(audioEl) {
  if (!audioEl) return null;
  if (graphs.has(audioEl)) return graphs.get(audioEl);

  const AudioCtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtor) return null;

  let bundle;
  try {
    const ctx = new AudioCtor();
    const source = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    // Required. Once the element is routed through the graph its own output is
    // superseded — without this the beat plays back silently.
    analyser.connect(ctx.destination);

    bundle = { ctx, source, analyser };
  } catch (err) {
    console.error('[audioGraph] failed to build graph:', err);
    return null;
  }

  graphs.set(audioEl, bundle);
  return bundle;
}

/** AudioContext starts suspended under autoplay policy. Call from a user gesture. */
export function resumeAudioGraph(audioEl) {
  const g = audioEl && graphs.get(audioEl);
  if (g && g.ctx.state === 'suspended') return g.ctx.resume();
  return Promise.resolve();
}

export function getAudioContextState(audioEl) {
  const g = audioEl && graphs.get(audioEl);
  return g ? g.ctx.state : 'closed';
}

/**
 * One-shot global unlock. Browsers only let an AudioContext resume inside a
 * user gesture; the site's own play button usually supplies one, but a visitor
 * who scrolls straight to a section that autoplays needs this net.
 */
export function installGlobalUnlock(audioEl) {
  if (typeof window === 'undefined' || !audioEl) return () => {};

  const unlock = () => {
    resumeAudioGraph(audioEl).finally(teardown);
  };
  const teardown = () => {
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };

  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  return teardown;
}
