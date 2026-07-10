// src/components/sections/Horse.jsx

import React from 'react';
import dynamic from 'next/dynamic';
import Reveal from '@/components/Reveal';

// 15 frames of ASCII in a module that only matters once you've scrolled past
// Freedom. Reserve the height so the late mount shifts nothing.
const AsciiHorse = dynamic(() => import('@/components/AsciiHorse'), {
  ssr: false,
  loading: () => <div className="min-h-[18rem]" aria-hidden="true" />,
});

export default function Horse() {
  return (
    <section id="horse" className="relative flex min-h-[70vh] w-full flex-col justify-center overflow-hidden py-24">
      <Reveal className="px-6 sm:px-10">
        <div className="mx-auto mb-16 max-w-6xl">
          <h2 className="ab-label mb-3">Run</h2>
          <p className="ab-label-dim">No hindrance. No restraint.</p>
        </div>
      </Reveal>

      <AsciiHorse />
    </section>
  );
}
