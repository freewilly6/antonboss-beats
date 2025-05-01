// src/components/BeatCard.jsx
import { usePlayer } from "../context/PlayerContext";

export default function BeatCard({ beat }) {
  const { playBeat } = usePlayer();
  const basePrice = 24.99;

  const handleClick = () => {
    const title = beat?.name || beat?.title || "Untitled";
    const audioUrl = beat?.audiourl || beat?.audioUrl;

    if (!audioUrl) {
      console.warn("⚠️ Missing audio URL for beat:", beat);
      return;
    }

    playBeat({
      name: title,
      audioUrl,
      cover: beat?.cover || "/images/beats/default-cover.png",
      artist: beat?.artist || "Anton Boss",
      genre: beat?.genre || "",
      price: basePrice,
    });
  };

  return (
    <div
      className="rounded shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-white"
      onClick={handleClick}
    >
      <img
        src={beat?.cover || "/images/beats/default-cover.png"}
        alt={beat?.name || beat?.title || "Beat cover"}
        className="rounded-t w-full h-48 object-cover"
      />
      <div className="p-4 space-y-1">
        <h3 className="font-bold text-lg">{beat?.name || beat?.title || "Untitled"}</h3>
        <p className="text-gray-600 text-sm">By {beat?.artist || "Anton Boss"}</p>

        <div className="text-xs text-gray-500">
          {beat?.genre && <span>{beat.genre}</span>}
          {beat?.mood && <span> • {beat.mood}</span>}
          {beat?.key && <span> • {beat.key}</span>}
          {beat?.bpm && <span> • {beat.bpm} BPM</span>}
        </div>

        <p className="text-pink-600 font-semibold">From ${basePrice.toFixed(2)}</p>
      </div>
    </div>
  );
}
