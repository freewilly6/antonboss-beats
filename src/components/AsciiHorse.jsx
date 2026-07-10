// src/components/AsciiHorse.jsx
//
// A galloping horse, 16 frames of ASCII at ~12fps, from an ASCII Motion export.
// See horseFrames.js for why the frames are rows of strings rather than the
// sparse cell tuples the tool emits.
//
// Rendering: one <pre> whose text content swaps each frame. With four frames it
// was cheaper to stack them and toggle visibility, but sixteen stacked layers
// each carrying a text-shadow is a lot of retained raster; re-laying-out 731
// glyphs twelve times a second is not.

import React, { useEffect, useRef, useState } from 'react';
import { FRAME_MS, FRAMES } from './horseFrames';

// Every frame is the same width and height, so the box never reflows.
const ART = FRAMES.map((rows) => rows.join('\n'));

export default function AsciiHorse() {
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const wrapRef = useRef(null);

  // Only animate while it's on screen, and never for reduced-motion visitors.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % ART.length), FRAME_MS);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div ref={wrapRef} className="ascii-horse-stage">
      <div className="ascii-horse-runner">
        {/* Deliberately not .ab-glow — that class's wide blur would re-rasterize
            every glyph on every frame. .ascii-horse carries a cheaper glow. */}
        <pre className="ascii-horse" role="img" aria-label="A horse galloping">
          {ART[frame]}
        </pre>
      </div>
      <div className="ascii-ground" aria-hidden="true">
        {'~-._.-~'.repeat(80)}
      </div>
    </div>
  );
}
