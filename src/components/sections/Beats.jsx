// src/components/sections/Beats.jsx

import React from 'react';
import dynamic from 'next/dynamic';
import Reveal from '@/components/Reveal';
import { useBeatQueue } from '@/context/BeatQueueContext';

// BeatList drags in Swiper, Headless UI and Heroicons — the largest chunk on the
// page, for a section that starts a full viewport below the fold. The beats are
// fetched client-side anyway, so there is no server-rendered content to lose.
//
// BEAT_LIST_MIN_H must match the height BeatList settles at, and the placeholder
// and the mounted component must both carry it. Reserve too little and the late
// mount grows #beats, shoving About, Freedom and the horse down the page.
const BEAT_LIST_MIN_H = 'min-h-[42rem]';

const BeatList = dynamic(() => import('@/components/BeatList'), {
  ssr: false,
  loading: () => <div className={BEAT_LIST_MIN_H} aria-hidden="true" />,
});

export default function Beats() {
  // BeatQueueProvider already fetches and normalizes every beat for the player
  // queue. Reuse it rather than issuing a second identical Supabase query.
  const { queue } = useBeatQueue();

  return (
    <section id="beats" className="relative min-h-screen w-full px-6 py-28 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="ab-label mb-3">Beats</h2>
          <p className="ab-label-dim mb-14">Play one — the scope follows it</p>
        </Reveal>
        <Reveal delay={120} className={BEAT_LIST_MIN_H}>
          <BeatList beats={queue} />
        </Reveal>
      </div>
    </section>
  );
}
