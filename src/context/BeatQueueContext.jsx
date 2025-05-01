// /src/context/BeatQueueContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const BeatQueueContext = createContext();

export function BeatQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);

 useEffect(() => {
  const beats = [
    {
      name: 'Quag',
      audioUrl: '/audio/Quag.mp3',
      artist: 'Anton Boss',
      genre: 'hip hop',
      price: '24.99',
      cover: '/images/beats/beat1.png',
    },
    {
      name: 'Bonix',
      audioUrl: '/audio/Bonix.mp3',
      artist: 'Anton Boss',
      genre: 'trap',
      price: '24.99',
      cover: '/images/beats/beat2.png',
    },
    // Add more beats here as needed...
  ];

  setQueue(beats);
  setShuffledQueue([...beats].sort(() => Math.random() - 0.5));
}, []);
  return (
    <BeatQueueContext.Provider value={{ queue, shuffledQueue }}>
      {children}
    </BeatQueueContext.Provider>
  );
}

export const useBeatQueue = () => useContext(BeatQueueContext);
