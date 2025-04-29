// src/components/BeatCard.jsx
import { usePlayer } from '../context/PlayerContext';

export default function BeatCard({ beat }) {
  const { setCurrentBeat } = usePlayer();

  const handleClick = () => {
    console.log('Clicked Beat:', beat);

    // Safely generate audio file if missing
    const safeAudioFile = beat.audioFile
      ? beat.audioFile
      : `${beat.title.replace(/\s+/g, '')}.mp3`; // e.g., "Quag" -> "Quag.mp3"

    setCurrentBeat({
      name: beat.title,
      audioUrl: `/audio/${safeAudioFile}`, 
      cover: beat.cover,
      price: beat.price,
    });
  };

  return (
    <div 
      className="rounded shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <img src={beat.cover} alt={beat.title} className="rounded-t w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-bold">{beat.title}</h3>
        <p className="text-gray-500">${beat.price}</p>
      </div>
    </div>
  );
}
