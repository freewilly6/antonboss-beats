// src/components/MiniPlayer.jsx
import { useState, useEffect } from 'react';

export default function MiniPlayer({ beat }) {
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    if (beat) {
      if (audio) {
        audio.pause();
      }

      const newAudio = new Audio(beat.audio);
      newAudio.play();
      setAudio(newAudio);

      return () => {
        newAudio.pause();
      };
    }
  }, [beat]);

  const togglePlay = () => {
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  if (!beat) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 px-6 py-3 rounded-full flex items-center gap-4 shadow-lg">
      <button 
        onClick={togglePlay} 
        className="text-white text-lg"
      >
        ▶️ / ⏸️
      </button>
      <div className="text-white">{beat.title}</div>
    </div>
  );
}
