// src/components/BeatPlayer.jsx
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { usePlayer }       from '@/context/PlayerContext';
import { useBeatQueue }    from '@/context/BeatQueueContext';
import BeatQueuePanel      from './BeatQueuePanel';
import { useLicenseModal } from '@/context/LicenseModalContext';
import {
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/** Fisher–Yates shuffle */
function shuffleArray(array) {
  const s = [...array];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

/** Left block: cover art, title, artist, price + expand toggle */
const CoverInfo = React.memo(function CoverInfo({
  coverImage, title, artist, basePrice,
  openLicenseModal, isExpanded, toggleExpand
}) {
  return (
    <div className="flex items-center w-full justify-between gap-2 sm:w-auto sm:justify-start">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={coverImage}
          alt=""
          className="w-8 h-8 sm:w-10 sm:h-10 rounded flex-shrink-0"
        />
        <div className="min-w-0">
          <h4 className="font-semibold truncate text-sm sm:text-base">
            {title}
          </h4>
          <p className="text-[10px] sm:text-xs text-gray-400 truncate">
            {artist}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openLicenseModal}
          className="bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-2 rounded whitespace-nowrap"
        >
          From ${basePrice}
        </button>
        <button
          onClick={toggleExpand}
          className="sm:hidden ml-1 text-lg hover:text-pink-400"
          aria-label={isExpanded ? 'Close queue' : 'Open queue'}
        >
          {isExpanded ? '×' : '☰'}
        </button>
      </div>
    </div>
  );
});

/** Center controls: shuffle, prev, play/pause, next, repeat */
const Controls = React.memo(function Controls({
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  skipCooldown,
  isShuffled,
  onShuffle,
  shuffleCooldown,
  isRepeat,
  onRepeat
}) {
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      {/* Shuffle */}
      <button
        onClick={onShuffle}
        aria-label="Shuffle"
        aria-pressed={isShuffled}
        disabled={shuffleCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowsRightLeftIcon
          className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
            isShuffled
              ? 'text-pink-400'
              : 'text-gray-400 hover:text-pink-400'
          }`}
        />
      </button>

      {/* Previous */}
      <button
        onClick={onPrev}
        aria-label="Previous"
        disabled={skipCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
      </button>

      {/* Play / Pause */}
      <button onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying
          ? <PauseIcon className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />
          : <PlayIcon  className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />}
      </button>

      {/* Next */}
      <button
        onClick={onNext}
        aria-label="Next"
        disabled={skipCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
      </button>

      {/* Repeat */}
      <button
        onClick={onRepeat}
        aria-label={isRepeat ? 'Disable repeat' : 'Enable repeat'}
        aria-pressed={isRepeat}
      >
        <ArrowPathIcon
          className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
            isRepeat
              ? 'text-pink-400'
              : 'text-gray-400 hover:text-pink-400'
          }`}
        />
      </button>
    </div>
  );
});


export default function BeatPlayer() {
  const {
    currentBeat,
    shouldAutoPlay,
    setShouldAutoPlay,
    playbackTime,
    setPlaybackTime,
    playBeat,
  } = usePlayer();
  const { queue } = useBeatQueue();
  const { openLicenseModal } = useLicenseModal();
  const audioRef = useRef(null);

  // STATE
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [isPlaying,   setIsPlaying]           = useState(false);
  const [progress,    setProgress]            = useState(0);
  const [volume,      setVolume]              = useState(1);
  const [duration,    setDuration]            = useState(0);
  const [currentTime, setCurrentTime]         = useState(0);
  const [isExpanded,  setIsExpanded]          = useState(false);
  const [isShuffled,  setIsShuffled]          = useState(false);
  const [isRepeat,    setIsRepeat]            = useState(false);       // ← re-added!
  const [localShuffledQueue, setLocalShuffledQueue] = useState([]);

  // skip/spam throttle
  const SKIP_COOLDOWN_MS    = 500;
  const [skipCooldown, setSkipCooldown]       = useState(false);

  // shuffle/spam throttle
  const SHUFFLE_COOLDOWN_MS = 500;
  const [shuffleCooldown, setShuffleCooldown] = useState(false);

  // derive currentQueue & activeBeat
  const currentQueue = useMemo(
    () => (isShuffled ? localShuffledQueue : queue),
    [isShuffled, queue, localShuffledQueue]
  );
  const activeBeat = useMemo(
    () => currentBeat || currentQueue[currentIndex],
    [currentBeat, currentQueue, currentIndex]
  );

  // metadata
  const audioUrl   = activeBeat?.audioUrl   || '';
  const coverImage = activeBeat?.cover      || '/images/beats/default-cover.png';
  const title      = activeBeat?.name       || 'Untitled';
  const artist     = activeBeat?.artist     || 'Unknown';
  const basePrice  = useMemo(
    () => activeBeat?.licenses?.[0]?.price ?? 24.99,
    [activeBeat]
  );

  // ▶️ Play / pause
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  // ⏩ Next (wraps)
  const skipNext = useCallback(() => {
    if (skipCooldown) return;
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), SKIP_COOLDOWN_MS);

    const len  = currentQueue.length;
    const next = (currentIndex + 1) % len;
    setCurrentIndex(next);
    playBeat(currentQueue[next]);
    setShouldAutoPlay(true);
  }, [
    skipCooldown, currentIndex, currentQueue,
    playBeat, setShouldAutoPlay
  ]);

  // ⏪ Prev (wraps + reset if >5s)
  const skipBack = useCallback(() => {
    if (skipCooldown) return;
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), SKIP_COOLDOWN_MS);

    const a = audioRef.current;
    if (a && a.currentTime > 5) {
      a.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      setPlaybackTime(0);
      return;
    }

    const len  = currentQueue.length;
    const prev = (currentIndex - 1 + len) % len;
    setCurrentIndex(prev);
    playBeat(currentQueue[prev]);
    setShouldAutoPlay(true);
  }, [
    skipCooldown, currentIndex, currentQueue,
    playBeat, setPlaybackTime, setShouldAutoPlay
  ]);

  // 🔀 Toggle shuffle (synchronously build & re-index)
  const toggleShuffle = useCallback(() => {
    if (shuffleCooldown) return;
    setShuffleCooldown(true);
    setTimeout(() => setShuffleCooldown(false), SHUFFLE_COOLDOWN_MS);

    setIsShuffled(prev => {
      const next = !prev;
      if (next) {
        const shuffled = shuffleArray(queue);
        setLocalShuffledQueue(shuffled);
        const idx = shuffled.findIndex(b => b.id === activeBeat.id);
        setCurrentIndex(idx < 0 ? 0 : idx);
      } else {
        setLocalShuffledQueue([]);
        const idx = queue.findIndex(b => b.id === activeBeat.id);
        setCurrentIndex(idx < 0 ? 0 : idx);
      }
      return next;
    });
  }, [queue, activeBeat.id, shuffleCooldown]);

  // 🔁 Toggle repeat
  const toggleRepeat = useCallback(() => {
    setIsRepeat(prev => !prev);
  }, []);

  // when track ends, either repeat or auto-skip
  const handleEnded = useCallback(() => {
    const a = audioRef.current;
    if (isRepeat) {
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
    } else {
      skipNext();
    }
  }, [isRepeat, skipNext]);

  // wire up the ended event
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.addEventListener('ended', handleEnded);
    return () => {
      a.removeEventListener('ended', handleEnded);
    };
  }, [handleEnded]);

  // Seek bar
  const handleSeek = useCallback((e) => {
    const pct = Number(e.target.value);
    const t   = (pct / 100) * duration;
    const a   = audioRef.current;
    if (a) {
      a.currentTime = t;
      setCurrentTime(t);
      setProgress(pct);
      setPlaybackTime(t);
    }
  }, [duration, setPlaybackTime]);

  // Volume
  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // Spacebar → play/pause
  // Spacebar → play/pause, but not when typing in inputs/textareas/etc.
useEffect(() => {
  const onKey = e => {
    if (e.code !== 'Space') return;

    const tgt = e.target;
    const tag = tgt.tagName;             // e.g. "INPUT", "TEXTAREA", "DIV"
    const isEditable = tgt.isContentEditable;

    // if focus is in an <input>, <textarea> or any contentEditable, skip toggling
    if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) {
      return;
    }

    e.preventDefault();
    togglePlay();
  };

  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [togglePlay]);


  // Load new track + autoplay
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (a.src !== audioUrl) {
      a.src = audioUrl;
      a.load();
      a.onloadedmetadata = () => {
        setDuration(a.duration);
        if (playbackTime > 0 && playbackTime < a.duration) {
          a.currentTime = playbackTime;
        }
        if (shouldAutoPlay) {
          a.play()
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

  // 🎞️ Progress raf loop
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let frame;
    const update = () => {
      const ct  = a.currentTime;
      const pct = (ct / a.duration) * 100;
      setCurrentTime(ct);
      setProgress(pct);
      setPlaybackTime(ct);
      frame = requestAnimationFrame(update);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const stop = () => cancelAnimationFrame(frame);

    a.addEventListener('play', start);
    a.addEventListener('pause', stop);
    a.addEventListener('ended', stop);
    return () => {
      cancelAnimationFrame(frame);
      a.removeEventListener('play', start);
      a.removeEventListener('pause', stop);
      a.removeEventListener('ended', stop);
    };
  }, [setPlaybackTime]);

  if (!activeBeat) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      <audio ref={audioRef} />

      {/* progress bar */}
      <div className="px-3 py-1">
        <div className="relative w-full h-1 bg-gray-800 rounded">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ec4899 ${progress}%, #374151 ${progress}%)`
            }}
          />
        </div>
      </div>

      {/* main controls */}
      <div className="relative flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6 py-2 space-y-2 sm:space-y-0">
        <CoverInfo
          coverImage={coverImage}
          title={title}
          artist={artist}
          basePrice={basePrice}
          openLicenseModal={() => openLicenseModal(activeBeat)}
          isExpanded={isExpanded}
          toggleExpand={() => setIsExpanded(exp => !exp)}
        />

        <div className="flex flex-col items-center
                        sm:absolute sm:left-1/2 sm:top-1/2
                        sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Controls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            onPrev={skipBack}
            onNext={skipNext}
            skipCooldown={skipCooldown}
            isShuffled={isShuffled}
            onShuffle={toggleShuffle}
            shuffleCooldown={shuffleCooldown}
            isRepeat={isRepeat}
            onRepeat={toggleRepeat}
          />
          <div className="text-[10px] sm:text-xs text-gray-400 mt-1 text-center">
            {`${String(Math.floor(currentTime/60)).padStart(2,'0')}:` +
             `${String(Math.floor(currentTime%60)).padStart(2,'0')} / ` +
             `${String(Math.floor(duration/60)).padStart(2,'0')}:` +
             `${String(Math.floor(duration%60)).padStart(2,'0')}`}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span role="img" aria-label="Volume">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="w-16 accent-purple-500"
          />
          <button
            onClick={() => setIsExpanded(exp => !exp)}
            aria-label={isExpanded ? 'Close queue' : 'Open queue'}
            className="ml-2 text-xl hover:text-pink-400"
          >
            {isExpanded ? '×' : '☰'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <BeatQueuePanel
          queue={currentQueue}
          currentIndex={currentIndex}
          onSelect={i => {
            setCurrentIndex(i);
            playBeat(currentQueue[i]);
            setShouldAutoPlay(true);
          }}
        />
      )}
    </div>
  );
}
