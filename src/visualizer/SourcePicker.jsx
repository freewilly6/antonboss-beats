// src/visualizer/SourcePicker.jsx
//
// These ship with the site and are served same-origin, so the analyser can
// always read their samples — no CORS dependency. They're the guaranteed-working
// floor under the visualizer.
//
// To add another: drop the file in public/audio/ and append an entry here. The
// `bpm` field is only consulted by the synthesized fallback (see beatDetector),
// which never runs for these same-origin files.

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';

export const DEMO_TRACKS = [
  {
    id: 'demo-right-time',
    name: 'Right Time',
    artist: 'Anton Boss',
    audioUrl: '/audio/right-time.mp3',
    bpm: 140,
    cover: '/images/beats/default-cover.png',
    licenses: [],
  },
];

export default function SourcePicker() {
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const onDemo = DEMO_TRACKS.some((t) => t.id === currentBeat?.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ab-label-dim mr-2">Source</span>

      {DEMO_TRACKS.map((track) => {
        const active = currentBeat?.id === track.id;
        return (
          <button
            key={track.id}
            onClick={() => toggleBeat(track)}
            className={`ab-btn ab-btn-sm ${active ? 'ab-btn-active' : ''}`}
          >
            <span aria-hidden="true">{active && isPlaying ? '❚❚' : '▶'}</span>
            {track.name}
          </button>
        );
      })}

      {currentBeat && !onDemo && (
        <span className="ab-label-dim ml-2 max-w-[16rem] truncate">
          Now: {currentBeat.name}
        </span>
      )}
    </div>
  );
}
