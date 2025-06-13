// src/components/BeatPlayer.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePlayer }    from '@/context/PlayerContext';
import { useBeatQueue } from '@/context/BeatQueueContext';
import BeatQueuePanel   from './BeatQueuePanel';
import { useLicenseModal } from '@/context/LicenseModalContext';
import {
  PlayIcon, PauseIcon,
  ArrowLeftIcon, ArrowRightIcon,
  ArrowsRightLeftIcon, ArrowPathIcon, SpeakerWaveIcon 
} from '@heroicons/react/24/outline'; 

/** Fisher–Yates shuffle */
function shuffleArray(arr) {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

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

const Controls = React.memo(function Controls({
  isPlaying, onPlayPause, onPrev, onNext,
  skipCooldown, isShuffled, onShuffle, shuffleCooldown,
  isRepeat, onRepeat
}) {
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <button
        onClick={onShuffle}
        aria-label="Shuffle"
        aria-pressed={isShuffled}
        disabled={shuffleCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowsRightLeftIcon
          className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
            isShuffled ? 'text-pink-400' : 'text-gray-400 hover:text-pink-400'
          }`}
        />
      </button>

      <button
        onClick={onPrev}
        aria-label="Previous"
        disabled={skipCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
      </button>

      <button onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying
          ? <PauseIcon className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />
          : <PlayIcon  className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />}
      </button>

      <button
        onClick={onNext}
        aria-label="Next"
        disabled={skipCooldown}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
      </button>

      <button
        onClick={onRepeat}
        aria-label={isRepeat ? 'Disable repeat' : 'Enable repeat'}
        aria-pressed={isRepeat}
      >
        <ArrowPathIcon
          className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
            isRepeat ? 'text-pink-400' : 'text-gray-400 hover:text-pink-400'
          }`}
        />
      </button>
    </div>
  );
});

export default function BeatPlayer() {
  // pull everything from PlayerContext
  const {
    currentBeat,
    isPlaying,
    playbackTime,
    duration,
    audioRef,
    shouldAutoPlay,
    setShouldAutoPlay,
    setPlaybackTime,
    playBeat,
    pauseBeat,
    toggleBeat,
  } = usePlayer();

  const { queue } = useBeatQueue();
  const { openLicenseModal: _openLicenseModal } = useLicenseModal();

  // Local UI state
  const [currentIndex, setCurrentIndex]         = useState(0);
  const [isExpanded, setIsExpanded]             = useState(false);
  const [isShuffled, setIsShuffled]             = useState(false);
  const [isRepeat, setIsRepeat]                 = useState(false);
  const [localShuffledQueue, setLocalShuffledQueue] = useState([]);
  const [skipCooldown, setSkipCooldown]         = useState(false);
  const [shuffleCooldown, setShuffleCooldown]   = useState(false);

  const SKIP_COOLDOWN_MS    = 500;
  const SHUFFLE_COOLDOWN_MS = 500;

  // Derive queue & activeBeat
  const currentQueue = useMemo(
    () => (isShuffled ? localShuffledQueue : queue),
    [isShuffled, queue, localShuffledQueue]
  );
  const activeBeat = useMemo(
    () => currentBeat || currentQueue[currentIndex],
    [currentBeat, currentQueue, currentIndex]
  );

  // Metadata
  const audioUrl   = activeBeat?.audioUrl   || '';
  const coverImage = activeBeat?.cover      || '/images/beats/default-cover.png';
  const title      = activeBeat?.name       || 'Untitled';
  const artist     = activeBeat?.artist     || 'Unknown';
  const basePrice  = activeBeat?.licenses?.[0]?.price ?? 24.99;

  // 1️⃣ When URL or autoPlay flag changes, context’s playBeat handles loading & playing,
  //     so here we simply call it.
  useEffect(() => {
    if (!audioUrl) return;
    if (shouldAutoPlay) {
      playBeat(activeBeat);
      setShouldAutoPlay(false);
    }
  }, [audioUrl, shouldAutoPlay, activeBeat, playBeat, setShouldAutoPlay]);

  // 2️⃣ Skip/Back
  const skipNext = useCallback(() => {
    if (skipCooldown) return;
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), SKIP_COOLDOWN_MS);

    const next = (currentIndex + 1) % currentQueue.length;
    setCurrentIndex(next);
    playBeat(currentQueue[next]);
    setShouldAutoPlay(false);
  }, [skipCooldown, currentIndex, currentQueue, playBeat, setShouldAutoPlay]);

  const skipBack = useCallback(() => {
    if (skipCooldown) return;
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), SKIP_COOLDOWN_MS);

    const a = audioRef.current;
    if (a && a.currentTime > 5) {
      a.currentTime = 0;
      setPlaybackTime(0);
      return;
    }
    const prev = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    setCurrentIndex(prev);
    playBeat(currentQueue[prev]);
    setShouldAutoPlay(false);
  }, [skipCooldown, currentIndex, currentQueue, playBeat, setPlaybackTime, setShouldAutoPlay, audioRef]);

  // 3️⃣ Shuffle / Repeat
  const toggleShuffle = useCallback(() => {
    if (shuffleCooldown) return;
    setShuffleCooldown(true);
    setTimeout(() => setShuffleCooldown(false), SHUFFLE_COOLDOWN_MS);

    setIsShuffled((sh) => {
      const next = !sh;
      if (next) {
        const shuffled = shuffleArray(queue);
        setLocalShuffledQueue(shuffled);
        setCurrentIndex(shuffled.findIndex(b => b.id === activeBeat.id) || 0);
      } else {
        setLocalShuffledQueue([]);
        setCurrentIndex(queue.findIndex(b => b.id === activeBeat.id) || 0);
      }
      return next;
    });
  }, [shuffleCooldown, queue, activeBeat.id]);

  const toggleRepeat = useCallback(() => setIsRepeat(r => !r), []);

  // 4️⃣ When a track ends
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      if (isRepeat) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else {
        skipNext();
      }
    };
    a.addEventListener('ended', onEnded);
    return () => a.removeEventListener('ended', onEnded);
  }, [audioRef, isRepeat, skipNext]);

  // 5️⃣ Play/Pause button
  const onPlayPause = useCallback(() => {
    if (isPlaying) pauseBeat();
    else        toggleBeat(activeBeat);
  }, [isPlaying, pauseBeat, toggleBeat, activeBeat]);

  // 6️⃣ Seek & volume
  const handleSeek = useCallback((e) => {
    const pct     = Number(e.target.value);
    const newTime = (pct / 100) * duration;
    const a       = audioRef.current;
    if (a) {
      a.currentTime = newTime;
      setPlaybackTime(newTime);
    }
  }, [duration, setPlaybackTime, audioRef]);

  const handleVolume = useCallback((e) => {
    if (audioRef.current) {
      audioRef.current.volume = Number(e.target.value);
    }
  }, [audioRef]);

  // 7️⃣ Spacebar → play/pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const { tagName, isContentEditable } = e.target;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isContentEditable) {
        return;
      }
      e.preventDefault();
      onPlayPause();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onPlayPause]);

  if (!activeBeat) return null;

  const progress = duration ? (playbackTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      {/* Progress Bar */}
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

      {/* Main Controls */}
      <div className="relative flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6 py-2 space-y-2 sm:space-y-0">
        <CoverInfo
          coverImage={coverImage}
          title={title}
          artist={artist}
          basePrice={basePrice}
          openLicenseModal={() => _openLicenseModal(activeBeat)}
          isExpanded={isExpanded}
          toggleExpand={() => setIsExpanded(e => !e)}
        />

        <div className="flex flex-col items-center
                        sm:absolute sm:left-1/2 sm:top-1/2
                        sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Controls
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
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
            {`${String(Math.floor(playbackTime/60)).padStart(2,'0')}:` +
             `${String(Math.floor(playbackTime%60)).padStart(2,'0')} / ` +
             `${String(Math.floor(duration/60)).padStart(2,'0')}:` +
             `${String(Math.floor(duration%60)).padStart(2,'0')}`}
          </div>
        </div>

    
    <div className="hidden sm:flex items-center gap-2">
      <SpeakerWaveIcon
        className="h-5 w-5 text-purple-500"   // adjust size & color as needed
        aria-hidden="true"
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        defaultValue={1}
        onChange={handleVolume}
        className="w-16 accent-purple-500"
          />
          <button
            onClick={() => setIsExpanded(e => !e)}
            aria-label={isExpanded ? 'Close queue' : 'Open queue'}
            className="ml-2 text-xl hover:text-pink-400"
          >
            {isExpanded ? '×' : '☰'}
          </button>
        </div>
      </div>

      {/* Queue Panel */}
      {isExpanded && (
        <BeatQueuePanel
          queue={currentQueue}
          currentIndex={currentIndex}
          onSelect={(i) => {
            setCurrentIndex(i);
            playBeat(currentQueue[i]);
            setShouldAutoPlay(false);
          }}
        />
      )}
    </div>
  );
}
