// src/components/BeatQueuePanel.jsx
import React from 'react';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatQueuePanel({ queue, currentIndex, onSelect }) {
  const { openLicenseModal } = useLicenseModal();
  const basePrice = 24.99;

  // 1) Tag each track with its original index
  const indexed = React.useMemo(
    () => queue.map((track, idx) => ({ track, originalIdx: idx })),
    [queue]
  );

  // 2) Pull the “current” item to the front
  const displayList = React.useMemo(() => {
    if (
      currentIndex == null ||
      currentIndex < 0 ||
      currentIndex >= indexed.length
    ) {
      return indexed;
    }
    const copy = [...indexed];
    const [currentItem] = copy.splice(currentIndex, 1);
    return [currentItem, ...copy];
  }, [indexed, currentIndex]);

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 max-h-[250px] overflow-y-auto text-sm">
      {/* Header: hidden on xs, shows on sm+ */}
      <div className="hidden sm:grid grid-cols-6 text-xs text-gray-400 font-semibold py-1 border-b border-gray-600">
        <div>#</div>
        <div className="col-span-2">Title</div>
        <div>Genre</div>
        <div>Artist</div>
        <div className="text-right">Price</div>
      </div>

      {/* Items: flex on xs, grid on sm+ */}
      {displayList.map(({ track, originalIdx }, displayIdx) => {
        const isActive = displayIdx === 0;
        const title    = track.name || track.title || 'Untitled';
        const genre    = track.genre || 'Unknown';
        const artist   = track.artist || '—';
        const cover    = track.cover || '/images/beats/default-cover.png';

        return (
          <div
            key={track.id ?? originalIdx}
            onClick={() => onSelect(originalIdx)}
            className={`
              flex justify-between items-center py-2 px-2 transition
              sm:grid sm:grid-cols-6 sm:items-center
              ${isActive
                ? 'bg-gray-700 font-semibold'
                : 'hover:bg-gray-700'}
            `}
          >
            {/* # */}
            <div className="w-6 flex-shrink-0 text-xs text-gray-300">
              {displayIdx + 1}
            </div>

            {/* Title + Cover */}
            <div className="flex items-center gap-2 col-span-2 min-w-0">
              <img
                src={cover}
                alt={title}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
              <span className="truncate">{title}</span>
            </div>

            {/* Genre (hidden on xs) */}
            <div className="hidden sm:block truncate text-xs text-gray-300">
              {genre}
            </div>

            {/* Artist (hidden on xs) */}
            <div className="hidden sm:block truncate text-xs text-gray-300">
              {artist}
            </div>

            {/* Price */}
            <div className="w-16 flex-shrink-0 text-right">
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
