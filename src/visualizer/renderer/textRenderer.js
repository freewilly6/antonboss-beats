// src/visualizer/renderer/textRenderer.js
//
// Per-glyph drawing so each character can breathe, warp and tear independently.
// Measuring every glyph every frame is the cost of that; at a line's worth of
// characters it's negligible next to the GL pass.

import { MONO_STACK } from '../config';

export function drawTextLine(ctx, line, opts) {
  const {
    width,
    height,
    timeSec,
    bass,          // 0..1, envelope-followed low-band energy
    glitchAmount,
    reactivity = 1,
    glow = 0.5,
    fontFamily,
    fontSize,
    color,
    reducedMotion,
  } = opts;

  const chars = [...line.text];
  if (!chars.length) return;

  const react = reducedMotion ? 0 : reactivity;
  const energy = bass * react;

  const px = Math.max(12, fontSize * height);
  const family = fontFamily ? `'${fontFamily}', ${MONO_STACK}` : MONO_STACK;

  // The whole line swells on the kick.
  const size = px * (1 + energy * line.pulse);

  ctx.save();
  ctx.font = `${size}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);

  // Letters push apart as the track gets loud.
  const tracking = energy * size * 0.06;
  const spread = total + tracking * (chars.length - 1);

  let x = (width - spread) / 2;
  const baseY = height / 2;

  const warpAmp = line.warpAmp * size * 0.35 * react;
  const glitch = reducedMotion ? 0 : glitchAmount * line.glitch;

  // Glow blooms with the music rather than sitting at a fixed radius.
  ctx.shadowColor = color;
  ctx.shadowBlur = size * glow * (0.25 + energy * 0.9);

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    const cx = x + w / 2;
    const t = chars.length === 1 ? 0 : i / (chars.length - 1);

    // A travelling wave down the line, amplitude driven by the bass.
    const warpY = Math.sin(t * Math.PI * 2 * line.warpFreq + timeSec * 3) * warpAmp * (0.25 + energy);

    // Each glyph also scales a touch out of phase with its neighbours, so the
    // word ripples instead of pumping as one rigid block.
    const glyphScale = 1 + Math.sin(t * Math.PI * 3 - timeSec * 5) * energy * 0.10;

    // RGB split on transients — letters tear into channels, snap back as it decays.
    if (glitch > 0.02) {
      const dx = glitch * size * 0.07;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,0,64,0.75)';
      drawGlyph(ctx, chars[i], cx - dx, baseY + warpY, glyphScale);
      ctx.fillStyle = 'rgba(0,255,255,0.75)';
      drawGlyph(ctx, chars[i], cx + dx, baseY + warpY, glyphScale);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Hard displacement: a few glyphs jump their track on a strong hit.
    const slip = glitch > 0.3 && hash(i, Math.floor(timeSec * 24)) > 0.8
      ? (hash(i * 7, Math.floor(timeSec * 24)) - 0.5) * size * 0.6
      : 0;

    ctx.fillStyle = color;
    drawGlyph(ctx, chars[i], cx + slip, baseY + warpY, glyphScale);

    x += w + tracking;
  }

  ctx.restore();
}

// Scale about the glyph's own centre; fillText alone would scale about the origin.
function drawGlyph(ctx, char, cx, cy, scale) {
  if (scale === 1) {
    ctx.fillText(char, cx, cy);
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillText(char, 0, 0);
  ctx.restore();
}

function hash(a, b) {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
