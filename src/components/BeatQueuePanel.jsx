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
    <div className="
        bg-gray-800 border-t border-gray-700
        px-4 py-2
        h-[12rem] overflow-y-auto
        text-sm text-white
      ">
      {/* Header */}
      <div className="
          hidden sm:grid grid-cols-6
          text-xs text-gray-400 font-semibold
          py-1 border-b border-gray-600
        ">
        <div>#</div>
        <div className="col-span-2">Title</div>
        <div>Genre</div>
        <div>Artist</div>
        <div className="text-right">Price</div>
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
            className="
              grid grid-cols-3 sm:grid-cols-6 items-center
              py-2 px-2 transition hover:bg-gray-700 cursor-pointer
            "
          >
            <div className="text-xs text-gray-300">
              {displayIdx + 1}
            </div>

            <div className="flex items-center gap-2 min-w-0 sm:col-span-2">
              <img
                src={cover}
                alt={title}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
              <span className="truncate text-xs">{title}</span>
            </div>

            <div className="hidden sm:block truncate text-xs text-gray-300">
              {genre}
            </div>

            <div className="hidden sm:block truncate text-xs text-gray-300">
              {artist}
            </div>

            <div className="flex justify-end">
              {track.inCart ? (
                <span className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs">
                  IN CART
                </span>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openLicenseModal(track);
                  }}
                  className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs hover:bg-pink-400"
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
