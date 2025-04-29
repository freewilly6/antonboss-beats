import { useState, useRef, useEffect } from 'react';

export default function BeatPlayer({ beat }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [dataArray, setDataArray] = useState(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const setAudioData = () => setDuration(audio.duration);
    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', updateProgress);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', updateProgress);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext) audioContext.close();
    };
  }, [audioContext]);

  const setupVisualization = () => {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const source = context.createMediaElementSource(audioRef.current);
      const analyserNode = context.createAnalyser();

      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      analyserNode.connect(context.destination);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setAnalyser(analyserNode);
      setAudioContext(context);
      setDataArray(dataArray);

      visualize();
    }
  };

  const visualize = () => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / dataArray.length * 2;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = isPlaying ? dataArray[i] / 255 * height : height / 4;
      const hue = i * 360 / dataArray.length;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    animationRef.current = requestAnimationFrame(visualize);
  };

  const togglePlay = () => {
    if (!audioContext) {
      setupVisualization();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const seekPosition = e.target.value;
    audioRef.current.currentTime = (seekPosition / 100) * duration;
    setProgress(seekPosition);
  };

  const handleVolume = (e) => {
    const volumeValue = e.target.value;
    setVolume(volumeValue);
    audioRef.current.volume = volumeValue;
  };

  return (
    <div className="w-full bg-gray-900 text-white flex items-center p-4 gap-4">
      {/* Audio element */}
      <audio ref={audioRef} src={beat.audioUrl} />

      {/* Beat cover & info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-700 rounded-md overflow-hidden">
          {/* If you have cover images later, insert <img src="..." /> here */}
          <canvas ref={canvasRef} width={200} height={100} className="w-full h-full object-cover"></canvas>
        </div>
        <div>
          <h4 className="text-lg font-bold">{beat.name}</h4>
          <p className="text-sm text-gray-400">Anton Boss</p> {/* Hardcoded artist for now */}
        </div>
      </div>

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="bg-pink-600 hover:bg-pink-700 rounded-full p-2 flex items-center justify-center ml-4"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        )}
      </button>

      {/* Progress bar */}
      <div className="flex flex-col flex-grow mx-4">
        <input
          type="range"
          value={progress}
          onChange={handleSeek}
          className="w-full accent-pink-500"
        />
        <div className="flex justify-between text-xs mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume control */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={handleVolume}
        className="w-24 accent-purple-400"
      />

      {/* Cart Button */}
      <div className="flex items-center gap-2">
  <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
    ${beat.price.toFixed(2)}
  </button>
</div>

    </div>
  );
}
