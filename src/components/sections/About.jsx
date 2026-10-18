// src/components/sections/About.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Reveal from '@/components/Reveal';
import { useLazyScene } from '@/hooks/useLazyScene';
import { PADS, loadKit, startSequencer, triggerPad } from '@/components/mpc/drumKit';

// Prefetched when the page goes idle, mounted once About is near the viewport
// — see useLazyScene. Fades itself in once drawn.
const loadMpc = () => import('@/components/mpc/MpcScene');
const MpcScene = dynamic(loadMpc, { ssr: false, loading: () => null });


const KEY_ROWS = ['1 2 3 4', 'Q W E R', 'A S D F', 'Z X C V'];

export default function About() {
  // Read every frame by the scene. Mutated in place, never set as state, so
  // hitting pads doesn't re-render the section.
  const live = useRef({
    hits: new Float64Array(PADS.length).fill(-1e9),
    bpm: 92,
    playing: false,
    step: -1,
    lastLabel: '',
    lastPad: '',
    version: 0,
  }).current;

  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(live.bpm);
  const onScreen = useRef(false);
  const mpcRef = useRef(null);
  const near = useLazyScene(mpcRef, loadMpc);
  const stopSeq = useRef(null);

  const flash = useCallback(
    (index) => {
      live.hits[index] = performance.now();
      live.lastLabel = PADS[index].label;
      live.lastPad = PADS[index].name;
      live.version++;
    },
    [live]
  );

  const hit = useCallback(
    (index) => {
      loadKit().then(() => triggerPad(index));
      flash(index);
    },
    [flash]
  );

  const stop = useCallback(() => {
    stopSeq.current?.();
    stopSeq.current = null;
    live.playing = false;
    live.step = -1;
    live.version++;
    setPlaying(false);
  }, [live]);

  const togglePlay = useCallback(async () => {
    if (stopSeq.current) return stop();
    live.playing = true;
    live.version++;
    setPlaying(true);
    await loadKit();
    // Stopped again while samples were still loading.
    if (!live.playing) return;
    stopSeq.current = startSequencer({
      getBpm: () => live.bpm,
      onStep: (step, pads) => {
        live.step = step;
        pads.forEach(flash);
        live.version++;
      },
    });
  }, [flash, live, stop]);

  const nudgeBpm = (delta) => {
    live.bpm = Math.max(60, Math.min(160, live.bpm + delta));
    live.version++;
    setBpm(live.bpm);
  };

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const onKey = (e) => {
      // Only while the machine is on screen, and never while typing — the
      // visualizer's lyric input and the beat search live on this page too.
      if (!onScreen.current || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const pad = PADS.find((p) => p.key === e.key.toLowerCase());
      if (pad) hit(pad.index);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit]);

  return (
    <section id="about" className="relative min-h-screen w-full px-6 py-28 sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-[2fr_3fr]">
        <Reveal>
          <h2 className="ab-label mb-3">About</h2>
          <p className="ab-display mt-10 max-w-md">
            Just your average noise-making enjoyer.
          </p>
          <p className="ab-body mt-8 max-w-md">
            Check the YouTube channel for remixes, or get on the pads. Click them, or
            play them from your keyboard:
          </p>
          <div className="mt-5 grid w-max gap-1 font-mono text-xs tracking-[0.4em] text-[var(--accent)]">
            {KEY_ROWS.map((row) => (
              <span key={row}>{row}</span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div ref={mpcRef} className="relative h-[22rem] w-full sm:h-[30rem]">
            {near && (
              <MpcScene
                live={live}
                onHit={hit}
                onTogglePlay={togglePlay}
                onStop={stop}
                onVisibleChange={(v) => (onScreen.current = v)}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button className={`ab-btn ${playing ? 'ab-btn-active' : ''}`} onClick={togglePlay}>
              {playing ? 'Stop pattern' : 'Play pattern'}
            </button>
            <button className="ab-btn" onClick={() => nudgeBpm(-4)} aria-label="Slower">
              −
            </button>
            <span className="ab-label w-20 text-center">{bpm} BPM</span>
            <button className="ab-btn" onClick={() => nudgeBpm(4)} aria-label="Faster">
              +
            </button>
          </div>

          {/* The 3D pads can't take keyboard focus; these can. */}
          <div className="sr-only">
            {PADS.map((p) => (
              <button key={p.index} onClick={() => hit(p.index)}>
                Pad {p.name}, {p.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
