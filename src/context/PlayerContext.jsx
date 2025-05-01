// src/context/PlayerContext.jsx
import { createContext, useContext, useState } from 'react';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentBeat, setCurrentBeat] = useState(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const playBeat = (beat) => {
    setCurrentBeat(beat);          // ✅ THIS is correct
    setShouldAutoPlay(true);       // ✅ Set autoplay only for manual triggers
    setPlaybackTime(0);            // ✅ Reset playback time on new beat
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
