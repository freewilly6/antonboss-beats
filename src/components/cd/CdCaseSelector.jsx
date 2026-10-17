// src/components/cd/CdCaseSelector.jsx
//
// Beat selection as a shelf of 3D CD cases. Arrow keys, swipes or clicks move
// along the shelf; clicking the front case (or Enter) opens it and the disc
// slides out; playing a beat spins its disc.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlayer } from '@/context/PlayerContext';
import { useLicenseModal } from '@/context/LicenseModalContext';

const CdShelf = dynamic(() => import('./CdShelf'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="ab-label-dim">Loading cases…</span>
    </div>
  ),
});

const BASE_PRICE = 24.99;

export default function CdCaseSelector({ beats }) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const swipeX = useRef(null);

  const { toggleBeat, currentBeat, isPlaying } = usePlayer();
  const { openLicenseModal } = useLicenseModal();

  // Filtering can shrink the list under the current selection.
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, beats.length - 1)));
  }, [beats.length]);

  const select = useCallback(
    (i) => {
      if (!beats.length) return;
      setSelected(Math.max(0, Math.min(beats.length - 1, i)));
      setOpen(false);
    },
    [beats.length]
  );

  const toggleOpen = useCallback((force) => {
    setOpen((o) => (typeof force === 'boolean' ? force : !o));
  }, []);

  const beat = beats[selected];
  const isThisPlaying = !!beat && currentBeat?.id === beat.id && isPlaying;

  const play = () => {
    if (!beat) return;
    // Playing opens the case so you can watch the disc spin.
    if (!isThisPlaying) setOpen(true);
    toggleBeat(beat);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); select(selected + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); select(selected - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); toggleOpen(); }
    else if (e.key === ' ') { e.preventDefault(); play(); }
  };

  if (!beats.length) {
    return <p className="ab-label-dim py-24 text-center">No beats found</p>;
  }

  return (
    <div>
      <div
        className="relative h-[24rem] w-full touch-pan-y outline-none sm:h-[28rem]"
        // Above the VHS overlay: the tape grain falls behind the cases, not on
        // them. The canvas is transparent, so only the cases themselves cover it.
        style={{ zIndex: 'calc(var(--z-overlay) + 1)' }}
        tabIndex={0}
        role="listbox"
        aria-label="Beat cases. Arrow keys to browse, Enter to open, Space to play."
        aria-activedescendant={`cd-case-${beat.id}`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => { swipeX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (swipeX.current == null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) > 50) select(selected + (dx < 0 ? 1 : -1));
        }}
      >
        <CdShelf
          beats={beats}
          selected={selected}
          open={open}
          playingId={isPlaying ? currentBeat?.id : null}
          onSelect={select}
          onToggleOpen={toggleOpen}
        />
        <span id={`cd-case-${beat.id}`} role="option" aria-selected="true" className="sr-only">
          {beat.name}
        </span>
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-5 text-center">
        <p className="ab-label-dim">
          {String(selected + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}
        </p>
        <div className="w-full min-w-0">
          <p className="ab-display truncate">{beat.name}</p>
          <p className="ab-meta mt-3 truncate">
            {[beat.genre, beat.mood, beat.key, beat.bpm && `${beat.bpm} BPM`, beat.artist]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button className="ab-btn" onClick={() => select(selected - 1)} disabled={selected === 0} aria-label="Previous beat">
            ←
          </button>
          <button className={`ab-btn ${isThisPlaying ? 'ab-btn-active' : ''}`} onClick={play}>
            {isThisPlaying ? 'Pause' : 'Play'}
          </button>
          <button className="ab-btn" onClick={() => toggleOpen()}>
            {open ? 'Close case' : 'Open case'}
          </button>
          <button className="ab-btn ab-btn-solid" onClick={() => openLicenseModal(beat)}>
            From ${BASE_PRICE.toFixed(2)}
          </button>
          <button
            className="ab-btn"
            onClick={() => select(selected + 1)}
            disabled={selected === beats.length - 1}
            aria-label="Next beat"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
