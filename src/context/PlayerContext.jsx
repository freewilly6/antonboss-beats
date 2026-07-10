// src/context/PlayerContext.jsx
import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { resumeAudioGraph } from '@/lib/audioGraph';
import { resolveSrc, toPlaybackUrl } from '@/lib/playbackUrl';

const PlayerContext = createContext();

// `timeupdate` fires ~4x/second. Keeping playbackTime in the main context made
// every consumer — the visualizer, the nav, the beat list — re-render on each
// tick, and re-created every callback identity along with it, which silently
// re-fired downstream effects. Only the playbar cares about elapsed time, so it
// lives in its own context and only the playbar subscribes.
const PlaybackTimeContext = createContext();

// Reading analyser samples from cross-origin audio requires BOTH crossOrigin
// on the element and Access-Control-Allow-Origin from the bucket. If we set
// crossOrigin without the header, the media fetch itself fails CORS and nothing
// plays at all. So this stays off until R2 is configured, at which point set
// NEXT_PUBLIC_AUDIO_CORS=1. Until then, R2 beats drive a synthesized waveform
// and the bundled /public/audio tracks (same-origin) drive a real one.
const AUDIO_CORS_ENABLED = process.env.NEXT_PUBLIC_AUDIO_CORS === '1';

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const localUrlRef = useRef(null); // object URL for a visitor-uploaded file

  const [currentBeat, setCurrentBeat]   = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration]         = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Create the element during render, not in an effect. React runs child effects
  // before parent effects, so consumers like useAudioAnalyser would otherwise
  // mount against a null audioRef and never attach their AnalyserNode.
  // Guarded, so it happens exactly once on the client and never during SSR.
  if (typeof window !== 'undefined' && !audioRef.current) {
    const audio = new Audio();
    // Must be set before the first `src` assignment or it won't take effect.
    if (AUDIO_CORS_ENABLED) audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
  }

  // Attach listeners to the element created above.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    };
  }, []);

  // Every method below is stable. An unstable identity here propagates into the
  // dependency array of any effect that consumes it.

  // ▶️ Start a brand‐new beat (always resets to 0)
  const playBeat = useCallback((beat) => {
    if (!audioRef.current || !beat) return;
    const original = beat.audioUrl ?? beat.audiourl;
    if (!original) return;

    // Cross-origin audio inside a Web Audio graph plays back as silence. Route
    // it through our own origin. See lib/playbackUrl.js.
    const url = toPlaybackUrl(original);

    // audio.src always reports an absolute URL, so comparing it against a
    // relative one never matches and reloads the track on every play.
    if (audioRef.current.src !== resolveSrc(url)) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    resumeAudioGraph(audioRef.current); // this call sits inside a user gesture
    setCurrentBeat({ ...beat, id: beat.id ?? beat.beatId });
    setShouldAutoPlay(false);
  }, []);

  /**
   * ▶️ Play a visitor's own audio file. Held in memory only — nothing is
   * uploaded. Same-origin blob: URL, so the analyser always gets real samples.
   */
  const playLocalFile = useCallback((file) => {
    if (!audioRef.current || !file) return;

    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const url = URL.createObjectURL(file);
    localUrlRef.current = url;

    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    resumeAudioGraph(audioRef.current);

    setCurrentBeat({
      id: `local-${file.name}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      artist: 'Your upload',
      audioUrl: url,
      cover: '/images/beats/default-cover.png',
      isLocal: true,
      licenses: [],
    });
    setShouldAutoPlay(false);
  }, []);

  // ▶️ Resume the **current** beat from wherever it was paused
  const resumeBeat = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => {});
    resumeAudioGraph(audioRef.current);
    // `play` event listener will set isPlaying=true
  }, []);

  // ⏸️ Pause
  const pauseBeat = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  // ↔️ Toggle: pause/resume if same beat, or play a new beat
  const toggleBeat = useCallback((beat) => {
    const id = beat.id ?? beat.beatId;
    if (currentBeat?.id === id) {
      // same track → pause or resume
      isPlaying ? pauseBeat() : resumeBeat();
    } else {
      // new track → start from zero
      playBeat(beat);
    }
  }, [currentBeat?.id, isPlaying, pauseBeat, resumeBeat, playBeat]);

  const playerValue = useMemo(() => ({
    audioRef,
    currentBeat,
    isPlaying,
    shouldAutoPlay,
    setShouldAutoPlay,

    playBeat,
    playLocalFile,
    resumeBeat,
    pauseBeat,
    toggleBeat,
  }), [currentBeat, isPlaying, shouldAutoPlay, playBeat, playLocalFile, resumeBeat, pauseBeat, toggleBeat]);

  const timeValue = useMemo(
    () => ({ playbackTime, duration, setPlaybackTime }),
    [playbackTime, duration]
  );

  return (
    <PlayerContext.Provider value={playerValue}>
      <PlaybackTimeContext.Provider value={timeValue}>
        {children}
      </PlaybackTimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}

/** Elapsed time and duration. Subscribing re-renders you ~4x/second — only the playbar should. */
export function usePlaybackTime() {
  return useContext(PlaybackTimeContext);
}
