// src/components/mpc/drumKit.js
//
// Sound for the MPC. Six one-shot samples, decoded once into AudioBuffers and
// re-pitched across sixteen pads. Runs in its own AudioContext, outside the
// global player, so pads layer over a playing beat instead of interrupting it.
//
// Also owns a small step sequencer with a look-ahead scheduler: steps are
// queued on the audio clock a little ahead of time, so the groove stays tight
// even when the main thread is busy rendering the scene.

// Pads in grid order, top-left to bottom-right, as they sit on the machine.
// MPC numbering starts bottom-left, so A01 is the kick.
export const PADS = [
  { key: '1', sample: 'hihat', rate: 1.0, label: 'HAT' },
  { key: '2', sample: 'hihat', rate: 0.75, label: 'HAT LO' },
  { key: '3', sample: 'rim', rate: 1.0, label: 'RIM' },
  { key: '4', sample: 'rim', rate: 1.4, label: 'PERC' },
  { key: 'q', sample: 'tom', rate: 1.3, label: 'TOM HI' },
  { key: 'w', sample: 'tom', rate: 1.0, label: 'TOM' },
  { key: 'e', sample: 'tom', rate: 0.75, label: 'TOM LO' },
  { key: 'r', sample: 'clap', rate: 1.15, label: 'CLAP HI' },
  { key: 'a', sample: 'snare', rate: 1.0, label: 'SNARE' },
  { key: 's', sample: 'snare', rate: 1.25, label: 'SNARE HI' },
  { key: 'd', sample: 'clap', rate: 1.0, label: 'CLAP' },
  { key: 'f', sample: 'snare', rate: 0.8, label: 'SNARE LO' },
  { key: 'z', sample: 'kick', rate: 1.0, label: 'KICK' },
  { key: 'x', sample: 'kick', rate: 0.85, label: 'KICK LO' },
  { key: 'c', sample: 'kick', rate: 1.2, label: 'KICK HI' },
  { key: 'v', sample: 'hihat', rate: 1.5, label: 'TICK' },
].map((p, i) => {
  const row = Math.floor(i / 4);
  const col = i % 4;
  const num = (3 - row) * 4 + col + 1;
  return { ...p, index: i, name: `A${String(num).padStart(2, '0')}` };
});

const SAMPLES = ['kick', 'snare', 'hihat', 'clap', 'tom', 'rim'];

// A boom-bap groove across 16 sixteenth-notes, as pad indices per step.
const P = Object.fromEntries(PADS.map((p) => [p.label, p.index]));
export const PATTERN = [
  [P.KICK, P.HAT], [], [P.HAT], [P.TICK],
  [P.SNARE, P.HAT], [], [P.HAT], [P.KICK],
  [P.HAT], [P.KICK], [P.KICK, P.HAT], [P.RIM],
  [P.SNARE, P.CLAP, P.HAT], [], [P['HAT LO']], [P.PERC],
];

let ctx = null;
let master = null;
const buffers = {};
let loading = null;

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

/** Fetch and decode all samples. Safe to call repeatedly. */
export function loadKit() {
  if (loading) return loading;
  const c = ensureContext();
  if (!c) return Promise.resolve();
  loading = Promise.all(
    SAMPLES.map(async (name) => {
      try {
        const res = await fetch(`/audio/${name}.wav`);
        buffers[name] = await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        // A missing sample just leaves that pad silent.
      }
    })
  );
  return loading;
}

/** Trigger a pad now, or at an audio-clock time `when`. */
export function triggerPad(index, when = 0, velocity = 1) {
  const c = ensureContext();
  const pad = PADS[index];
  if (!c || !pad) return;
  if (c.state === 'suspended') c.resume();
  const buf = buffers[pad.sample];
  if (!buf) return;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = pad.rate;
  const gain = c.createGain();
  gain.gain.value = velocity;
  src.connect(gain).connect(master);
  src.start(when || c.currentTime);
}

/**
 * Start the sequencer. `onStep(step, padIndices)` fires on the main thread
 * as each step actually sounds, for the lights and the LCD.
 * Returns a stop function.
 */
export function startSequencer({ getBpm, onStep }) {
  const c = ensureContext();
  if (!c) return () => {};
  if (c.state === 'suspended') c.resume();

  let step = 0;
  let nextTime = c.currentTime + 0.06;
  const timers = new Set();

  const tick = () => {
    const stepDur = 60 / getBpm() / 4;
    while (nextTime < c.currentTime + 0.12) {
      const s = step;
      const pads = PATTERN[s];
      // A little swing on the off-beats, MPC style.
      const swing = s % 2 ? stepDur * 0.16 : 0;
      pads.forEach((p) => triggerPad(p, nextTime + swing, s % 4 === 0 ? 1 : 0.8));

      const delay = Math.max(0, (nextTime + swing - c.currentTime) * 1000);
      const t = setTimeout(() => {
        timers.delete(t);
        onStep(s, pads);
      }, delay);
      timers.add(t);

      nextTime += stepDur;
      step = (step + 1) % PATTERN.length;
    }
  };

  tick();
  const id = setInterval(tick, 25);
  return () => {
    clearInterval(id);
    timers.forEach(clearTimeout);
  };
}
