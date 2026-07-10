// src/components/sections/Freedom.jsx
//
// The word, scattered and drifting. A callback to the definition block that used
// to sit under the old homepage card.

import React, { useMemo } from 'react';

const WORD_COUNT = 34;

/**
 * Deterministic PRNG (mulberry32). Positions must be identical on the server and
 * on the client — Math.random() here would produce different markup each render
 * and React would throw a hydration mismatch.
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildField() {
  const rand = mulberry32(0x5eed);
  return Array.from({ length: WORD_COUNT }, (_, i) => {
    const depth = rand(); // 0 = far (small, dim, slow), 1 = near
    return {
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      depth,
      size: 0.7 + depth * 2.6,          // rem
      peak: 0.05 + depth * 0.30,        // brightest point of its fade cycle
      // Each blur() forces its own compositing pass on every animated frame, and
      // each text-shadow layer re-rasterizes the glyphs. Both are spent only
      // where they read: blur on the distant words, glow on the near ones.
      blur: depth < 0.45 ? Math.min(1.6, (1 - depth) * 2.0) : 0,
      glow: depth > 0.4,
      duration: 26 + rand() * 44,       // drift, s
      delay: -rand() * 60,              // negative: mid-drift on arrival
      driftX: (rand() - 0.5) * 90,      // px
      driftY: (rand() - 0.5) * 70,
      rotate: (rand() - 0.5) * 8,       // deg
      // Fade runs on its own clock, uncoupled from the drift, so words don't
      // pulse in unison. Negative delay again: the field is already breathing
      // when you arrive rather than all igniting at once.
      fadeDuration: 9 + rand() * 15,    // s
      fadeDelay: -rand() * 24,
    };
  });
}

export default function Freedom() {
  const field = useMemo(buildField, []);

  return (
    <section
      id="freedom"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6"
    >
      {/* The drifting field. Decorative — one readable copy lives in the middle,
          so screen readers aren't handed the word thirty-four times. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {field.map((w) => (
          <span
            key={w.id}
            className={`absolute select-none whitespace-nowrap ${w.glow ? 'ab-glow' : ''}`}
            style={{
              left: `${w.left}%`,
              top: `${w.top}%`,
              fontSize: `${w.size}rem`,
              // The base opacity the fade keyframes peak at — and the value that
              // applies verbatim when animations are off (reduced motion).
              opacity: w.peak,
              filter: w.blur ? `blur(${w.blur.toFixed(2)}px)` : undefined,
              animation:
                `freedom-drift ${w.duration}s ease-in-out ${w.delay}s infinite alternate, ` +
                `freedom-fade ${w.fadeDuration}s ease-in-out ${w.fadeDelay}s infinite`,
              '--dx': `${w.driftX}px`,
              '--dy': `${w.driftY}px`,
              '--rot': `${w.rotate}deg`,
              // Stringified: a bare number risks React appending a unit.
              '--peak': String(w.peak),
            }}
          >
            Freedom
          </span>
        ))}
      </div>

      <div className="relative z-10 max-w-xl text-center">
        <h2 className="ab-glow text-5xl sm:text-7xl">Freedom</h2>
        <p className="ab-meta mt-4 italic">/&#712;fri&#720;d&#601;m/</p>
        <p className="ab-body mx-auto mt-8 max-w-md">
          &ldquo;The power or right to act, speak, or think as one wants without
          hindrance or restraint.&rdquo;
        </p>
      </div>
    </section>
  );
}
