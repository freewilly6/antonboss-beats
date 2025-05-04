import { useLicenseModal } from '@/context/LicenseModalContext';
import React from 'react';

export default function BeatQueuePanel({ queue, currentIndex, onSelect }) {
  const { openLicenseModal } = useLicenseModal();
  const basePrice = 24.99;

  // 1) Tag each track with its original index so we can call onSelect properly
  const indexed = React.useMemo(
    () => queue.map((track, idx) => ({ track, originalIdx: idx })),
    [queue]
  );

  // 2) Pull out the “current” item and then re-concatenate
  const displayList = React.useMemo(() => {
    if (
      currentIndex == null ||
      currentIndex < 0 ||
      currentIndex >= indexed.length
    ) {
      return indexed;
    }
    // remove the current item
    const copy = [...indexed];
    const [currentItem] = copy.splice(currentIndex, 1);
    // put it at the front
    return [currentItem, ...copy];
  }, [indexed, currentIndex]);

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 max-h-[250px] overflow-y-auto text-sm">
      {/* Header Row */}
      <div className="grid grid-cols-6 text-xs text-gray-400 font-semibold py-1 border-b border-gray-600">
        <div>#</div>
        <div className="col-span-2">Title</div>
        <div>Genre</div>
        <div>Artist</div>
        <div className="text-right">Price</div>
      </div>

      {/* Rotated Queue */}
      {displayList.map(({ track, originalIdx }, displayIdx) => {
        const isActive = displayIdx === 0;
        const title = track.name || track.title || 'Untitled';
        const genre = track.genre || 'Unknown';
        const artist = track.artist || '';
        const cover = track.cover || '/images/beats/default-cover.png';

        return (
          <div
            key={track.id ?? originalIdx}
            onClick={() => onSelect(originalIdx)}
            className={`
              grid grid-cols-6 items-center py-1.5 px-2 hover:bg-gray-700 transition
              ${isActive ? 'bg-gray-700 font-semibold' : ''}
            `}
          >
            {/* now #1 will always be the current track */}
            <div>{displayIdx + 1}</div>

            {/* Title + Cover */}
            <div className="col-span-2 flex items-center gap-2 cursor-pointer">
              <img
                src={cover}
                alt={title}
                className="w-8 h-8 rounded object-cover"
              />
              <div className="truncate">{title}</div>
            </div>

            <div className="truncate cursor-pointer">{genre}</div>
            <div className="truncate cursor-pointer">{artist}</div>

            {/* License Button */}
            <div className="text-right">
              {track.inCart ? (
                <span className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs font-semibold">
                  IN CART
                </span>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openLicenseModal(track);
                  }}
                  className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs font-semibold hover:bg-pink-400"
                >
                  + ${basePrice.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
