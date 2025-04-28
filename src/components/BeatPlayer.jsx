// src/components/BeatPlayer.jsx
import { useRef, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

export default function BeatPlayer({ audioSrc }) {
  const audioRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg shadow-md text-white">
      <button
        onClick={togglePlay}
        className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full"
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <audio ref={audioRef} src={audioSrc} />
      <div className="flex-1">
        <div className="text-sm">Preview Track</div>
      </div>
    </div>
  );
}
