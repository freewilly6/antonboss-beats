// src/components/WaveformPlayer.jsx
import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function WaveformPlayer({ beat }) {
  const waveformRef = useRef();
  const wavesurfer = useRef(null);

  useEffect(() => {
    if (!beat) return;

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#888',
      progressColor: '#4F46E5',
      height: 80,
      barWidth: 2,
      responsive: true,
      url: beat.audio,
    });

    wavesurfer.current.on('ready', () => {
      wavesurfer.current.play();
    });

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [beat]);

  if (!beat) return null;

  return (
    <div className="w-full px-8 mt-6">
      <div ref={waveformRef}></div>
    </div>
  );
}
