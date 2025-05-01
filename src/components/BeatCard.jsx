// src/components/BeatCard.jsx
import { usePlayer } from "../context/PlayerContext";

export default function BeatCard({ beat }) {
  const { playBeat } = usePlayer();
  const basePrice = 24.99;

  const handleClick = () => {
    console.log("▶️ Clicked Beat:", beat);

    const safeTitle = beat.title?.replace(/\s+/g, "") || "Untitled";
    const audioUrl = beat.audioUrl || `/audio/${safeTitle}.mp3`;
    const cover = beat.cover || "/images/beats/default-cover.png";

    playBeat({
      name: beat.title || "Untitled",
      audioUrl,
      cover,
      artist: beat.artist || "Anton Boss",
      genre: beat.genre || "",
      price: beat.price || basePrice,
    });
  };

  return (
    <div
      className="rounded shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <img
        src={beat.cover || "/images/beats/default-cover.png"}
        alt={beat.title}
        className="rounded-t w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold">{beat.title}</h3>
        <p className="text-gray-500">From ${basePrice.toFixed(2)}</p>
      </div>
    </div>
  );
}