import { useRef, useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useBeatQueue } from '@/context/BeatQueueContext';
import BeatQueuePanel from './BeatQueuePanel';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatPlayer() {
  const {
    currentBeat,
    shouldAutoPlay,
    setShouldAutoPlay,
    playbackTime,
    setPlaybackTime,
    playBeat,
  } = usePlayer();

  const { shuffledQueue } = useBeatQueue();
  const { openLicenseModal } = useLicenseModal(); // ✅ Added hook

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef(null);

  const activeBeat = currentBeat || shuffledQueue[currentIndex];
  const audioUrl = activeBeat?.audioUrl;
  const coverImage = activeBeat?.cover || '/images/beats/default-cover.png';
  const title = activeBeat?.name || 'Untitled';
  const artist = activeBeat?.artist || 'Anton Boss';

  const togglePlay = () => {
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
  };

  const handleSeek = (e) => {
    const newProgress = e.target.value;
    const audio = audioRef.current;
    if (audio) {
      const newTime = (newProgress / 100) * duration;
      audio.currentTime = newTime;
      setProgress(newProgress);
      setCurrentTime(newTime);
      setPlaybackTime(newTime);
    }
  };

  const handleVolume = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const skipNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < shuffledQueue.length) {
      setCurrentIndex(nextIndex);
      playBeat(shuffledQueue[nextIndex]);
      setShouldAutoPlay(true);
    }
  };

  const skipBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      playBeat(shuffledQueue[prevIndex]);
      setShouldAutoPlay(true);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const fullUrl = window.location.origin + audioUrl;
    if (audio.src !== fullUrl) {
      audio.src = audioUrl;
      audio.load();

      audio.onloadedmetadata = () => {
        if (playbackTime > 0 && playbackTime < audio.duration) {
          audio.currentTime = playbackTime;
        }

        if (shouldAutoPlay) {
          audio.play()
            .then(() => {
              setIsPlaying(true);
              setShouldAutoPlay(false);
            })
            .catch(err => {
              console.warn('Autoplay failed:', err);
              setIsPlaying(false);
              setShouldAutoPlay(false);
            });
        }
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeBeat) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
      setPlaybackTime(audio.currentTime);
    };

    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      if (currentIndex < shuffledQueue.length - 1) {
        skipNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeBeat, currentIndex]);

  if (!activeBeat) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      <audio ref={audioRef} />

      {/* Progress Bar */}
      <div className="relative w-full h-1 bg-gray-800">
        <input
          type="range"
          value={progress}
          onChange={handleSeek}
          className="absolute top-0 left-0 w-full h-1 appearance-none accent-pink-500"
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Track Info */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <img src={coverImage} alt="Cover" className="w-12 h-12 rounded" />
          <div>
            <h4 className="font-bold">{title}</h4>
            <p className="text-sm text-gray-400">{artist}</p>
          </div>
          <button
            onClick={() => openLicenseModal(activeBeat)} // ✅ New price button
            className="ml-2 bg-pink-400 hover:bg-pink-500 text-white font-bold py-1 px-3 text-sm rounded shadow"
          >
            From $24.99
          </button>
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center gap-1 flex-grow max-w-md">
          <div className="flex gap-4 items-center">
            <button onClick={skipBack}>⏮</button>
            <button onClick={togglePlay}>{isPlaying ? '⏸' : '▶️'}</button>
            <button onClick={skipNext}>⏭</button>
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right: Volume + Queue */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <span>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="accent-purple-500"
          />
          <button onClick={() => setIsExpanded(prev => !prev)}>
            {isExpanded ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <BeatQueuePanel
          queue={shuffledQueue}
          currentIndex={currentIndex}
          onSelect={(i) => {
            setCurrentIndex(i);
            playBeat(shuffledQueue[i]);
            setShouldAutoPlay(true);
          }}
        />
      )}
    </div>
  );
}
