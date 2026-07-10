// src/components/sections/About.jsx

import React, { useCallback, useEffect, useState } from 'react';
import Reveal from '@/components/Reveal';

const PADS = [
  { name: 'kick', key: 'k' },
  { name: 'snare', key: 's' },
  { name: 'hihat', key: 'h' },
  { name: 'clap', key: 'c' },
  { name: 'tom', key: 't' },
  { name: 'rim', key: 'r' },
];

export default function About() {
  const [activePad, setActivePad] = useState(null);
  const [lastHit, setLastHit] = useState('');

  const playSound = useCallback((name) => {
    // One-shot samples, deliberately outside the global player — they layer over
    // whatever beat is running rather than interrupting it.
    const audio = new Audio(`/audio/${name}.wav`);
    audio.play().catch(() => {});
    setActivePad(name);
    setLastHit(name.toUpperCase());
    setTimeout(() => setActivePad(null), 200);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // The visualizer's lyric input lives on this same page now — typing "k"
      // there must not fire a kick drum.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const match = PADS.find((p) => p.key === e.key.toLowerCase());
      if (match) playSound(match.name);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playSound]);

  return (
    <section id="about" className="relative min-h-screen w-full px-6 py-28 sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-20 md:grid-cols-2">
        <Reveal>
          <h2 className="ab-label mb-3">About</h2>
          <p className="ab-display mt-10 max-w-md">
            Just your average noise-making enjoyer.
          </p>
          <p className="ab-body mt-8 max-w-md">
            Check the YouTube channel for remixes, or hit the pads. Keys{' '}
            <span className="text-[var(--accent)]">K S H C T R</span>.
          </p>
        </Reveal>

        <Reveal delay={160} className="flex flex-col items-center">
          <div className="mb-10 flex h-16 w-64 items-center justify-center border border-[var(--fg-20)]">
            <span
              className="font-mono text-xl tracking-[0.3em]"
              style={{ color: lastHit ? 'var(--accent)' : 'var(--fg-35)' }}
            >
              {lastHit || 'READY'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PADS.map((pad) => (
              <button
                key={pad.name}
                onClick={() => playSound(pad.name)}
                className={`ab-btn h-24 w-24 flex-col gap-1 ${
                  activePad === pad.name ? 'ab-btn-solid' : ''
                }`}
              >
                <span>{pad.name}</span>
                <span className="opacity-40">{pad.key}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
