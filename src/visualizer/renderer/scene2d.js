// src/visualizer/renderer/scene2d.js
//
// Draws the source frame: background, grid, scope trace, FFT bars, dropped
// images, and text. Everything here lands on a plain 2D canvas which the GL pass
// then treats as a texture — so all of it inherits scanlines, bloom, and
// chromatic aberration for free.

import { drawTextLine } from './textRenderer';

export function drawScene(ctx, state) {
  const { width, height } = ctx.canvas;
  const { config, timeData, freqData, beatEnergy, bassEnv, glitchAmount, timeSec } = state;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = config.bg.color;
  ctx.fillRect(0, 0, width, height);

  drawImages(ctx, config, width, height, beatEnergy);

  const mode = config.scope.mode;
  const scopeOn = mode !== 'off';

  // With the trace off the graticule is just a grid on nothing — hide it too,
  // so "scope off" leaves a clean field for the type.
  if (config.scope.grid && scopeOn) drawGrid(ctx, width, height, config.scope.color);

  if (mode === 'fft' || mode === 'both') drawSpectrum(ctx, freqData, width, height, config);
  if (mode === 'wave' || mode === 'both') drawWaveform(ctx, timeData, width, height, config, glitchAmount);

  const line = config.text.lines[config.text.activeIndex];
  if (line && line.text) {
    drawTextLine(ctx, line, {
      width,
      height,
      timeSec,
      bass: bassEnv ?? 0,
      glitchAmount,
      reactivity: config.text.reactivity,
      glow: config.text.glow,
      fontFamily: config.text.fontFamily,
      fontSize: config.text.fontSize,
      color: config.text.color,
      reducedMotion: config.perf.reducedMotion,
    });
  }
}

function drawGrid(ctx, width, height, color) {
  const step = Math.max(32, Math.round(height / 10));
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Brighter centre crosshair, like a real scope graticule.
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.restore();
}

function drawWaveform(ctx, timeData, width, height, config, glitchAmount) {
  const { gain, timeScale, lineWidth, color } = config.scope;
  const mid = height / 2;

  // timeScale < 1 zooms into the centre of the buffer, so the trace stretches.
  const visible = Math.max(64, Math.floor(timeData.length * timeScale));
  const start = Math.floor((timeData.length - visible) / 2);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // A soft shadow reads as phosphor bloom even before the shader runs, and keeps
  // the 2D fallback path from looking flat.
  ctx.shadowColor = color;
  ctx.shadowBlur = config.crt.glow * 24;

  ctx.beginPath();
  for (let i = 0; i < visible; i++) {
    const sample = (timeData[start + i] - 128) / 128;
    const x = (i / (visible - 1)) * width;

    // On a beat, tear the trace horizontally in bands.
    let y = mid - sample * mid * 0.85 * gain;
    if (glitchAmount > 0.01) {
      const band = Math.floor((y / height) * 12);
      const jitter = Math.sin(band * 43.7 + i * 0.01) * glitchAmount * 18;
      y += jitter;
    }

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSpectrum(ctx, freqData, width, height, config) {
  const bars = 96;
  const barWidth = width / bars;

  // FFT bins are linear in frequency, but music isn't — nearly all the energy in
  // a beat sits below ~2kHz, which is the first tenth of the array. Mapping bars
  // to bins linearly would crush the whole spectrum into the left edge. Spread
  // the bars logarithmically instead, so each octave gets equal width.
  const minBin = 1;
  const maxBin = freqData.length;
  const ratio = maxBin / minBin;

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = config.scope.color;

  for (let b = 0; b < bars; b++) {
    const lo = Math.floor(minBin * Math.pow(ratio, b / bars));
    const hi = Math.max(lo + 1, Math.floor(minBin * Math.pow(ratio, (b + 1) / bars)));

    let sum = 0;
    for (let i = lo; i < hi && i < maxBin; i++) sum += freqData[i];
    const avg = sum / (hi - lo) / 255;

    // Soften the curve so quiet high bands still register.
    const magnitude = Math.pow(avg, 0.75);
    const h = magnitude * height * 0.42;
    if (h > 0.5) ctx.fillRect(b * barWidth + 1, height - h, barWidth - 2, h);
  }
  ctx.restore();
}

function drawImages(ctx, config, width, height, beatEnergy) {
  const images = config.assets.images;
  if (!images.length) return;

  const bump = 1 + (beatEnergy / 255) * 0.04;

  for (const img of images) {
    if (!img.bitmap) continue;
    ctx.save();
    ctx.globalAlpha = img.opacity ?? 1;
    ctx.globalCompositeOperation = img.blend || 'source-over';

    const scale = (img.scale ?? 1) * bump;
    const w = img.bitmap.width * scale;
    const h = img.bitmap.height * scale;
    const cx = (img.x ?? 0.5) * width;
    const cy = (img.y ?? 0.5) * height;

    ctx.drawImage(img.bitmap, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }
}
