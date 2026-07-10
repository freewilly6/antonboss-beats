// src/hooks/useHashTarget.js
//
// Resolves the one hash the router can't: /beats/123 redirects to /#beat-123,
// which names a beat rather than an element. Scroll to the beats section and
// start that track.
//
// Plain section hashes (#about, #freedom) are deliberately left alone — Next's
// router already scrolls to them on load, and handling them here as well fired
// scrollIntoView twice for the same navigation.
//
// It must fire exactly once. The effect legitimately re-runs while it waits for
// the beat queue to load, and PillNav writes a hash on every click — so without
// the latch below, any later re-run would scroll the visitor back to whatever
// section is named in the URL, making it impossible to scroll away from it.

import { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useBeatQueue } from '@/context/BeatQueueContext';

export function useHashTarget() {
  const { queue } = useBeatQueue();
  const { playBeat } = usePlayer();

  const resolvedRef = useRef(false);
  // Read the hash once, on mount. We rewrite it below, and PillNav rewrites it
  // on every nav click, so location.hash is not a stable source of intent.
  const initialHashRef = useRef(null);
  if (initialHashRef.current === null) {
    initialHashRef.current = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  }

  useEffect(() => {
    if (resolvedRef.current) return;

    const beatMatch = initialHashRef.current.match(/^beat-(.+)$/);
    if (!beatMatch) {
      resolvedRef.current = true;
      return;
    }

    // The queue loads async. Stay unresolved and let the effect re-run.
    if (!queue.length) return;

    const beat = queue.find((b) => String(b.id) === beatMatch[1]);
    document.getElementById('beats')?.scrollIntoView({ behavior: 'smooth' });
    if (beat) playBeat(beat);

    history.replaceState(null, '', '#beats');
    resolvedRef.current = true;
  }, [queue, playBeat]);
}
