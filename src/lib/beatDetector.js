// src/lib/beatDetector.js
//
// Adaptive transient detection on the low end of the FFT. Pure module, no React —
// it's called once per animation frame from inside the render loop.

/**
 * Compares instantaneous low-band energy against a decaying running maximum.
 * A fixed threshold would either miss quiet tracks or fire constantly on loud
 * ones; the decay lets the threshold track the material.
 */
export function createBeatDetector({
  band = [1, 12],
  sensitivity = 1.45,
  decay = 0.98,
  minIntervalMs = 120,
} = {}) {
  let energyAvg = 0;
  let lastHitMs = -Infinity;

  return function detect(freqData, nowMs, opts = {}) {
    const [lo, hi] = opts.band || band;
    const sens = opts.sensitivity ?? sensitivity;
    const minGap = opts.minIntervalMs ?? minIntervalMs;

    let energy = 0;
    for (let i = lo; i < hi; i++) energy += freqData[i];
    energy /= Math.max(1, hi - lo);

    const overThreshold = energy > energyAvg * sens;
    const pastCooldown = nowMs - lastHitMs > minGap;
    const hit = overThreshold && pastCooldown && energy > 8; // ignore near-silence

    // Rise instantly, fall slowly.
    energyAvg = Math.max(energy, energyAvg * decay);

    if (hit) {
      lastHitMs = nowMs;
      return { hit: true, energy, strength: energyAvg > 0 ? energy / energyAvg : 0 };
    }
    return { hit: false, energy, strength: 0 };
  };
}

/**
 * Fills `out` with a plausible waveform when the analyser can't see the audio
 * (cross-origin taint). Driven by elapsed time and BPM so it still moves with
 * the track rather than looking frozen.
 */
export function synthesizeWave(out, timeSec, bpm = 120) {
  const beatsPerSec = bpm / 60;
  const phase = timeSec * beatsPerSec;
  const beatEnv = Math.pow(1 - (phase % 1), 3); // kick thump decaying across each beat

  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const carrier =
      Math.sin(t * Math.PI * 2 * 3 + timeSec * 6) * 0.5 +
      Math.sin(t * Math.PI * 2 * 7 + timeSec * 11) * 0.25 +
      Math.sin(t * Math.PI * 2 * 13 - timeSec * 4) * 0.12;
    const noise = (Math.sin(i * 12.9898 + timeSec * 78.233) * 43758.5453) % 1;

    const amp = 0.18 + beatEnv * 0.6;
    const v = carrier * amp + noise * 0.03;
    out[i] = Math.max(0, Math.min(255, 128 + v * 127));
  }
  return out;
}

/** Matching synthetic spectrum so FFT bars and beat detection still animate. */
export function synthesizeSpectrum(out, timeSec, bpm = 120) {
  const phase = (timeSec * bpm) / 60;
  const beatEnv = Math.pow(1 - (phase % 1), 4);

  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const tilt = Math.pow(1 - t, 2.2); // natural spectral rolloff
    const wobble = 0.5 + 0.5 * Math.sin(timeSec * 3 + i * 0.15);
    const kick = i < 12 ? beatEnv * 0.9 : 0;
    out[i] = Math.max(0, Math.min(255, (tilt * (0.45 + wobble * 0.3) + kick) * 255));
  }
  return out;
}
