// src/visualizer/config.js
//
// The single object the render loop reads every frame. It lives in a ref, and
// the control panel mutates it in place — so dragging a slider never re-renders
// the canvas. React state exists only to keep the panel's own inputs controlled.

export function makeDefaultConfig() {
  return {
    scope: {
      gain: 1.0,
      timeScale: 1.0,
      lineWidth: 2,
      mode: 'both', // 'off' | 'wave' | 'fft' | 'both'
      color: '#ffffff',
      grid: true,
    },
    crt: {
      glow: 0.65,
      persistence: 0.82,
      scanline: 0.45,
      aberration: 0.4,
      noise: 0.22,
      barrel: 0.18,
      vignette: 0.5,
    },
    glitch: {
      onBeat: true,
      intensity: 0.6,
      decayMs: 150,
    },
    beat: {
      band: [1, 12], // FFT bins covering the kick
      sensitivity: 1.45,
      minIntervalMs: 120,
    },
    text: {
      lines: [makeLine('ANTON BOSS')],
      activeIndex: 0,
      autoCycle: true,
      cycleEveryBeats: 8,
      fontFamily: '', // '' => built-in mono stack
      fontSize: 0.12, // fraction of canvas height
      color: '#ffffff',
      // Master multiplier on every audio-driven text motion. Turn it up and the
      // letters breathe hard on the kick; at 0 the line sits perfectly still.
      reactivity: 1.4,
      glow: 0.5,
    },
    bg: {
      color: '#000000',
    },
    assets: {
      images: [], // { id, bitmap, x, y, scale, opacity, blend }
      fonts: [],  // { id, family, label }
    },
    perf: {
      maxDpr: 1.5,
      reducedMotion: false,
      pauseOffscreen: true,
    },
  };
}

let lineSeq = 0;
export function makeLine(text = '') {
  return {
    id: `line-${++lineSeq}`,
    text,
    warpAmp: 0.5,
    warpFreq: 2.2,
    pulse: 0.32,
    glitch: 0.7,
  };
}

/** Mutates `obj` at a dotted path. Used by the control panel to write configRef. */
export function setDeep(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] == null || typeof node[keys[i]] !== 'object') node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
}

export function getDeep(obj, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

export const MONO_STACK = "'Courier New', ui-monospace, monospace";
