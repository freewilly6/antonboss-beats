// src/context/PlayerContext.jsx
import { createContext, useContext, useRef, useState, useEffect } from 'react';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  const [currentBeat, setCurrentBeat]   = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration]         = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Initialize Audio (client‐only)
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate    = () => setPlaybackTime(audio.currentTime);
    const onLoaded        = () => setDuration(audio.duration);
    const onPlay          = () => setIsPlaying(true);
    const onPauseOrEnded  = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPauseOrEnded);
    audio.addEventListener('ended', onPauseOrEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPauseOrEnded);
      audio.removeEventListener('ended', onPauseOrEnded);
    };
  }, []);

  // ▶️ Start a brand‐new beat (always resets to 0)
  const playBeat = (beat) => {
    if (!audioRef.current) return;
    const url = beat.audioUrl ?? beat.audiourl;
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setCurrentBeat({ ...beat, id: beat.id ?? beat.beatId });
    setShouldAutoPlay(false);
  };

  // ▶️ Resume the **current** beat from wherever it was paused
  const resumeBeat = () => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => {});
    // `play` event listener will set isPlaying=true
  };

  // ⏸️ Pause
  const pauseBeat = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  // ↔️ Toggle: pause/resume if same beat, or play a new beat
  const toggleBeat = (beat) => {
    const id = beat.id ?? beat.beatId;
    if (currentBeat?.id === id) {
      // same track → pause or resume
      isPlaying ? pauseBeat() : resumeBeat();
    } else {
      // new track → start from zero
      playBeat(beat);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        currentBeat,
        isPlaying,
        playbackTime,
        duration,
        shouldAutoPlay,
        setShouldAutoPlay,
        setPlaybackTime,

        playBeat,
        resumeBeat,
        pauseBeat,
        toggleBeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
