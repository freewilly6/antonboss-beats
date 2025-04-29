import { createContext, useContext, useState } from 'react';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentBeat, setCurrentBeat] = useState(null);

  return (
    <PlayerContext.Provider value={{ currentBeat, setCurrentBeat }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
