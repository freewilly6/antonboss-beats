// src/components/BeatPlayer.jsx
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { usePlayer }           from '@/context/PlayerContext';
import { useBeatQueue }        from '@/context/BeatQueueContext';
import BeatQueuePanel         from './BeatQueuePanel';
import { useLicenseModal }     from '@/context/LicenseModalContext';
import {
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,               // ← import repeat icon
} from '@heroicons/react/24/outline';

export default function BeatPlayer() {
  const {
    currentBeat,
    shouldAutoPlay,
    setShouldAutoPlay,
    playbackTime,
    setPlaybackTime,
    playBeat,
  } = usePlayer();

  const { queue, shuffledQueue } = useBeatQueue();
  const { openLicenseModal }     = useLicenseModal();

  const audioRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying,   setIsPlaying]     = useState(false);
  const [progress,    setProgress]      = useState(0);
  const [volume,      setVolume]        = useState(1);
  const [duration,    setDuration]      = useState(0);
  const [currentTime, setCurrentTime]   = useState(0);
  const [isExpanded,  setIsExpanded]    = useState(false);
  const [isShuffled,  setIsShuffled]    = useState(false);
  const [isRepeat,    setIsRepeat]      = useState(false);  // ← repeat state

  // pick queue based on shuffle
  const currentQueue = useMemo(
    () => (isShuffled ? shuffledQueue : queue),
    [isShuffled, queue, shuffledQueue]
  );
  const activeBeat = useMemo(
    () => currentBeat || currentQueue[currentIndex],
    [currentBeat, currentQueue, currentIndex]
  );

  const audioUrl   = activeBeat?.audioUrl   || '';
  const coverImage = activeBeat?.cover      || '/images/beats/default-cover.png';
  const title      = activeBeat?.name       || 'Untitled';
  const artist     = activeBeat?.artist     || 'Anton Boss';
  const basePrice  = useMemo(
    () => activeBeat?.licenses?.[0]?.price ?? 24.99,
    [activeBeat]
  );

  // play / pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.warn('Playback error:', err));
    }
  }, [isPlaying]);

  // next
  const skipNext = useCallback(() => {
    const next = currentIndex + 1;
    if (next < currentQueue.length) {
      setCurrentIndex(next);
      playBeat(currentQueue[next]);
      setShouldAutoPlay(true);
    }
  }, [currentIndex, currentQueue, playBeat, setShouldAutoPlay]);

  // back / restart
  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      setPlaybackTime(0);
    } else {
      const prev = currentIndex - 1;
      if (prev >= 0) {
        setCurrentIndex(prev);
        playBeat(currentQueue[prev]);
        setShouldAutoPlay(true);
      }
    }
  }, [currentIndex, currentQueue, playBeat, setShouldAutoPlay, setPlaybackTime]);

  // shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const nextShuffle = !prev;
      const q = nextShuffle ? shuffledQueue : queue;
      const idx = q.findIndex(b => b.id === activeBeat.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
      return nextShuffle;
    });
  }, [queue, shuffledQueue, activeBeat.id]);

  // repeat
  const toggleRepeat = useCallback(() => {
    setIsRepeat(r => !r);
  }, []);

  // seek
  const handleSeek = useCallback((e) => {
    const p = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = (p / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(p);
    setPlaybackTime(newTime);
  }, [duration, setPlaybackTime]);

  // volume
  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // space = play/pause
  useEffect(() => {
    const onKey = e => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  // load & metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        if (playbackTime > 0 && playbackTime < audio.duration) {
          audio.currentTime = playbackTime;
        }
        if (shouldAutoPlay) {
          audio.play()
            .then(() => {
              setIsPlaying(true);
              setShouldAutoPlay(false);
            })
            .catch(() => {
              setIsPlaying(false);
              setShouldAutoPlay(false);
            });
        }
      };
    }
  }, [audioUrl, playbackTime, shouldAutoPlay, setShouldAutoPlay]);

  // update progress & auto-next / repeat
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const ct = audio.currentTime;
      setCurrentTime(ct);
      setProgress((ct / audio.duration) * 100);
      setPlaybackTime(ct);
    };
    const onEnd = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        skipNext();
      }
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [skipNext, setPlaybackTime, isRepeat]);

  if (!activeBeat) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      <audio ref={audioRef} />

      {/* Progress bar */}
      <div className="px-3">
        <div className="relative w-full h-1 sm:h-2 bg-gray-800 rounded">
          <input
            type="range"
            min={0} max={100}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ec4899 ${progress}%, #374151 ${progress}%)`
            }}
          />
        </div>
      </div>

      {/* Main row */}
      <div className="relative flex items-center justify-between px-3 py-2">
        {/* Left: track info */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <img src={coverImage} alt="" className="w-10 h-10 rounded" />
          <div className="truncate">
            <h4 className="font-semibold truncate">{title}</h4>
            <p className="text-xs text-gray-400 truncate">{artist}</p>
          </div>
          <button
            onClick={() => openLicenseModal(activeBeat)}
            className="ml-1 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-2 rounded"
            aria-label="Choose license"
          >
            From ${basePrice}
          </button>
        </div>

        {/* Centered, content-sized control block */}
        <div
          className="
            absolute 
            left-1/2 top-1/2 
            transform -translate-x-1/2 -translate-y-1/2 
            flex flex-col items-center
          "
        >
          {/* icon row */}
          <div className="flex items-center">
            {/* 1) Left group: shuffle + back */}
            <div className="flex items-center gap-2">
              <button onClick={toggleShuffle} aria-label="Shuffle">
                <ArrowsRightLeftIcon className="h-5 w-5 hover:text-pink-400" />
              </button>
              <button onClick={skipBack} aria-label="Previous/Rewind">
                <ArrowLeftIcon className="h-6 w-6 hover:text-pink-400" />
              </button>
            </div>

            {/* 2) Center: play/pause */}
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="mx-6"
            >
              {isPlaying
                ? <PauseIcon className="h-8 w-8 hover:text-pink-400" />
                : <PlayIcon  className="h-8 w-8 hover:text-pink-400" />}
            </button>

            {/* 3) Right group: next + repeat */}
            <div className="flex items-center gap-2">
              <button onClick={skipNext} aria-label="Next">
                <ArrowRightIcon className="h-6 w-6 hover:text-pink-400" />
              </button>
              <button
                onClick={toggleRepeat}
                aria-label={isRepeat ? 'Disable repeat' : 'Enable repeat'}
              >
                <ArrowPathIcon
                  className={`h-6 w-6 transition-colors ${
                    isRepeat ? 'text-pink-400' : 'hover:text-pink-400'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* time display underneath */}
          <div className="text-[10px] sm:text-xs text-gray-400 mt-1 text-center">
            {`${String(Math.floor(currentTime/60)).padStart(2,'0')}:` +
              `${String(Math.floor(currentTime%60)).padStart(2,'0')} / ` +
              `${String(Math.floor(duration/60)).padStart(2,'0')}:` +
              `${String(Math.floor(duration%60)).padStart(2,'0')}`}
          </div>
        </div>

        {/* Right: volume & queue toggle */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <span role="img" aria-label="Volume">🔊</span>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={volume}
            onChange={handleVolume}
            className="w-16 accent-purple-500"
          />
          <button
            onClick={() => setIsExpanded(e => !e)}
            aria-label={isExpanded ? 'Close queue' : 'Open queue'}
            className="ml-1 text-lg hover:text-pink-400"
          >
            {isExpanded ? '×' : '☰'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <BeatQueuePanel
          queue={isShuffled ? shuffledQueue : queue}
          currentIndex={currentIndex}
          onSelect={i => {
            setCurrentIndex(i);
            playBeat((isShuffled ? shuffledQueue : queue)[i]);
            setShouldAutoPlay(true);
          }}
        />
      )}
    </div>
  );
}
