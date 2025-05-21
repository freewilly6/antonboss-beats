// src/components/BeatCard.jsx
import { usePlayer } from '@/context/PlayerContext';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatCard({ beat }) {
  const { playBeat } = usePlayer();
  const { openLicenseModal } = useLicenseModal();
  const basePrice = 24.99;

  const title    = beat?.name  || beat?.title || 'Untitled';
  const audioUrl = beat?.audiourl || beat?.audioUrl;
  const cover    = beat?.cover || '/images/beats/default-cover.png';

  const handlePlay = () => {
    if (!audioUrl) {
      console.warn('⚠️ Missing audio URL for beat:', beat);
      return;
    }
    playBeat({
      id:       beat.id,      // include id here too if your player uses it
      name:     title,
      audioUrl,
      cover,
      artist:   beat.artist  || 'Anton Boss',
      genre:    beat.genre   || '',
      price:    basePrice,
    });
  };

  const handleBuy = (e) => {
    e.stopPropagation();        // prevent triggering the play on parent div
    openLicenseModal(beat);     // pass the *entire* beat, id included!
  };

  return (
    <div
      className="rounded shadow-lg hover:shadow-xl transition-shadow bg-white"
      onClick={handlePlay}
    >
      <img
        src={cover}
        alt={title}
        className="rounded-t w-full h-48 object-cover"
      />
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-gray-600 text-sm">By {beat?.artist || 'Anton Boss'}</p>
        <p className="text-pink-600 font-semibold">From ${basePrice.toFixed(2)}</p>
        <button
          onClick={handleBuy}
          className="mt-2 w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded"
        >
          Buy
        </button>
      </div>
    </div>
  );
}