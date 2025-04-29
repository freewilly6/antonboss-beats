// src/pages/about.js
import Layout from '../components/Layout';
import React, { useEffect, useState } from 'react';

const sounds = [
  { name: 'kick', key: 'k' },
  { name: 'snare', key: 's' },
  { name: 'hihat', key: 'h' },
  { name: 'clap', key: 'c' },
  { name: 'tom', key: 't' },
  { name: 'rim', key: 'r' }
];

const DrumPad = () => {
  const [activePad, setActivePad] = useState(null);
  const [lastHit, setLastHit] = useState('');

  const playSound = (soundName) => {
    const audio = new Audio(`/audio/${soundName}.wav`);
    audio.currentTime = 0;
    audio.play();
    setActivePad(soundName);
    setLastHit(soundName.toUpperCase());

    setTimeout(() => setActivePad(null), 200);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const match = sounds.find((s) => s.key === key);
      if (match) {
        playSound(match.name);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center mt-12">
      <h2 className="text-3xl font-bold mb-4 text-black">MPC Drum Pad</h2>

      {/* Display Screen */}
      <div className="w-64 h-16 mb-8 bg-black border-4 border-gray-700 rounded-lg flex items-center justify-center">
        <span className="text-green-400 text-2xl font-mono tracking-widest">
          {lastHit || 'READY'}
        </span>
      </div>

      {/* Pad Grid */}
      <div className="grid grid-cols-3 gap-6">
        {sounds.map((sound) => (
          <button
            key={sound.name}
            onClick={() => playSound(sound.name)}
            className={`w-24 h-24 rounded-lg bg-gray-300 border-4 border-gray-500 text-xl font-bold text-black shadow-md transition-transform duration-150 hover:bg-gray-400 ${
              activePad === sound.name ? 'animate-bounce-small bg-blue-400' : ''
            }`}
          >
            {sound.name.charAt(0).toUpperCase() + sound.name.slice(1)}
            <br />
            <span className="text-sm text-gray-700">({sound.key.toUpperCase()})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function AboutPage() {
  return (
    <Layout>
      <div className="text-black p-8">
        <h1 className="text-4xl font-bold mb-6">About Me</h1>
        <p className="mb-10 text-lg">
          Welcome to my beat store! Check out the drum pad below and make some noise!
        </p>
        <DrumPad />
      </div>
    </Layout>
  );
}
