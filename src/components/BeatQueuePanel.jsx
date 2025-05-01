import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatQueuePanel({ queue, currentIndex, onSelect }) {
  const { openLicenseModal } = useLicenseModal();

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

      {/* List */}
      {queue.map((track, idx) => (
        <div
          key={track.id || idx}
          className={`grid grid-cols-6 items-center py-1.5 px-2 hover:bg-gray-700 transition ${
            idx === currentIndex ? 'bg-gray-700 font-semibold' : ''
          }`}
        >
          <div onClick={() => onSelect(idx)}>{idx + 1}</div>

          {/* Title + Cover */}
          <div
            onClick={() => onSelect(idx)}
            className="col-span-2 flex items-center gap-2 cursor-pointer"
          >
            <img
              src={track.cover || '/images/beats/default-cover.png'}
              className="w-8 h-8 rounded object-cover"
              alt={track.name}
            />
            <div className="truncate">{track.name}</div>
          </div>

          <div onClick={() => onSelect(idx)} className="truncate cursor-pointer">
            {track.genre || 'hip hop'}
          </div>

          <div onClick={() => onSelect(idx)} className="truncate cursor-pointer">
            {track.artist || 'Anton Boss'}
          </div>

          {/* Price or Cart */}
          <div className="text-right">
            {track.inCart ? (
              <span className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs font-semibold">
                IN CART
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLicenseModal(track);
                }}
                className="bg-pink-300 text-black px-2 py-0.5 rounded text-xs font-semibold hover:bg-pink-400"
              >
                + ${track.price || '24.99'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
