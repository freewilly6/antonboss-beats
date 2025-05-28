// src/context/PlayerContext.jsx
import { createContext, useContext, useState } from 'react';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentBeat, setCurrentBeat] = useState(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const playBeat = (beat) => {
    // normalize id: prefer beat.id, fall back to beat.beatId
    const normalizedId = beat.id ?? beat.beatId;

    setCurrentBeat({
      ...beat,
      id: normalizedId,
    });

    setShouldAutoPlay(true);
    setPlaybackTime(0);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentBeat,
        setCurrentBeat,
        playBeat,
        shouldAutoPlay,
        setShouldAutoPlay,
        playbackTime,
        setPlaybackTime,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
