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
  ArrowPathIcon,
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
  const [isRepeat,    setIsRepeat]      = useState(false);

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const skipNext = useCallback(() => {
    const next = currentIndex + 1;
    if (next < currentQueue.length) {
      setCurrentIndex(next);
      playBeat(currentQueue[next]);
      setShouldAutoPlay(true);
    }
  }, [currentIndex, currentQueue]);

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
  }, [currentIndex, currentQueue]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const next = !prev;
      const q    = next ? shuffledQueue : queue;
      const idx  = q.findIndex(b => b.id === activeBeat.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
      return next;
    });
  }, [queue, shuffledQueue, activeBeat.id]);

  const toggleRepeat = useCallback(() => {
    setIsRepeat(r => !r);
  }, []);

  const handleSeek = useCallback((e) => {
    const p = Number(e.target.value);
    const t = (p / 100) * duration;
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = t;
      setCurrentTime(t);
      setProgress(p);
      setPlaybackTime(t);
    }
  }, [duration]);

  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

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
            .then(() => { setIsPlaying(true); setShouldAutoPlay(false); })
            .catch(() => { setIsPlaying(false); setShouldAutoPlay(false); });
        }
      };
    }
  }, [audioUrl, playbackTime, shouldAutoPlay]);

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
  }, [isRepeat, skipNext]);

  if (!activeBeat) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      <audio ref={audioRef} />

      {/* Progress bar */}
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

      {/* Main row: stacks on xs, rows on sm+ */}
      <div className="relative flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6 py-2 space-y-2 sm:space-y-0">

        {/* LEFT (mobile): cover+text left, price+toggle right */}
        <div className="flex items-center w-full justify-between gap-2 sm:w-auto sm:justify-start">
          {/* cover + title/artist */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={coverImage}
              alt=""
              className="w-8 h-8 sm:w-10 sm:h-10 rounded flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-semibold truncate text-sm sm:text-base">{title}</h4>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{artist}</p>
            </div>
          </div>

          {/* price & mobile queue toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openLicenseModal(activeBeat)}
              className="bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-1 px-2 rounded whitespace-nowrap"
              aria-label="Choose license"
            >
              From ${basePrice}
            </button>
            {/* mobile only */}
            <button
              onClick={() => setIsExpanded(e => !e)}
              aria-label={isExpanded ? 'Close queue' : 'Open queue'}
              className="sm:hidden ml-1 text-lg hover:text-pink-400"
            >
              {isExpanded ? '×' : '☰'}
            </button>
          </div>
        </div>

        {/* CENTER: controls & time */}
        <div className="flex flex-col items-center
                        sm:absolute sm:left-1/2 sm:top-1/2
                        sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center gap-4 sm:gap-5">
            <button onClick={toggleShuffle} aria-label="Shuffle">
              <ArrowsRightLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 hover:text-pink-400" />
            </button>
            <button onClick={skipBack} aria-label="Previous">
              <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
            </button>
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying
                ? <PauseIcon className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />
                : <PlayIcon  className="h-6 w-6 sm:h-8 sm:w-8 hover:text-pink-400" />}
            </button>
            <button onClick={skipNext} aria-label="Next">
              <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 hover:text-pink-400" />
            </button>
            <button onClick={toggleRepeat} aria-label={isRepeat ? 'Disable repeat' : 'Enable repeat'}>
              <ArrowPathIcon
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                  isRepeat ? 'text-pink-400' : 'hover:text-pink-400'
                }`}
              />
            </button>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 mt-1 text-center">
            {`${String(Math.floor(currentTime/60)).padStart(2,'0')}:` +
              `${String(Math.floor(currentTime%60)).padStart(2,'0')} / ` +
              `${String(Math.floor(duration/60)).padStart(2,'0')}:` +
              `${String(Math.floor(duration%60)).padStart(2,'0')}`}
          </div>
        </div>

        {/* RIGHT: volume & large-screen queue toggle */}
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
            onClick={() => setIsExpanded(e => !e)}
            aria-label={isExpanded ? 'Close queue' : 'Open queue'}
            className="ml-2 text-xl hover:text-pink-400"
          >
            {isExpanded ? '×' : '☰'}
          </button>
        </div>
      </div>

      {/* Queue panel */}
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
