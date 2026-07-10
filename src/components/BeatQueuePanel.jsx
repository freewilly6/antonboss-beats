// src/components/BeatQueuePanel.jsx
import React, { useMemo } from 'react';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatQueuePanel({ queue, currentIndex, onSelect }) {
  const { openLicenseModal } = useLicenseModal();
  const basePrice = 24.99;

  const indexed = useMemo(
    () => queue.map((track, idx) => ({ track, originalIdx: idx })),
    [queue]
  );

  const displayList = useMemo(() => {
    if (
      currentIndex == null ||
      currentIndex < 0 ||
      currentIndex >= indexed.length
    ) {
      return indexed;
    }
    return indexed.filter((_, idx) => idx !== currentIndex);
  }, [indexed, currentIndex]);

  return (
    <div className="h-[12rem] overflow-y-auto border-t border-[var(--fg-10)] bg-black px-4 py-2 text-sm text-white">
      {/* Header */}
      <div className="hidden grid-cols-6 border-b border-[var(--fg-10)] py-2 sm:grid">
        <div className="ab-label-dim">#</div>
        <div className="ab-label-dim col-span-2">Title</div>
        <div className="ab-label-dim">Genre</div>
        <div className="ab-label-dim">Artist</div>
        <div className="ab-label-dim text-right">Price</div>
      </div>

      {displayList.map(({ track, originalIdx }, displayIdx) => {
        const title  = track.name || 'Untitled';
        const genre  = track.genre || 'Unknown';
        const artist = track.artist || '—';
        const cover  = track.cover || '/images/beats/default-cover.png';

        return (
          <div
            key={track.id ?? originalIdx}
            onClick={() => onSelect(originalIdx)}
            className="grid cursor-pointer grid-cols-3 items-center px-2 py-2 transition-colors hover:bg-white/5 sm:grid-cols-6"
          >
            <div className="ab-meta">
              {displayIdx + 1}
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
              <img
                src={cover}
                alt={title}
                className="h-8 w-8 flex-shrink-0 object-cover grayscale"
              />
              <span className="truncate text-xs">{title}</span>
            </div>

            <div className="ab-meta hidden truncate sm:block">
              {genre}
            </div>

            <div className="ab-meta hidden truncate sm:block">
              {artist}
            </div>

            <div className="flex justify-end">
              {track.inCart ? (
                <span className="ab-label !text-[var(--accent)]">In cart</span>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openLicenseModal(track);
                  }}
                  className="ab-btn ab-btn-sm"
                >
                  +${basePrice.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
