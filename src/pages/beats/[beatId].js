import Layout from '../../components/Layout';
import BeatPlayer from '../../components/BeatPlayer';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function BeatDetail() {
  const router = useRouter();
  const { beatid } = router.query;
  const [hueRotate, setHueRotate] = useState(0);
  
  // Psychedelic color shifting effect
  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotate(prev => (prev + 1) % 360);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // You would fetch this data dynamically
  const beatData = {
    title: "Quag",
    price: 29.99,
    audioSrc: "/audio/Quag.mp3",
    description: "A trap beat with heavy 808s and melodic elements",
    bpm: 140,
    key: "F minor"
  };

  return (
    <Layout>
      <div className="astroworld-container p-8 max-w-4xl mx-auto relative overflow-hidden">
        {/* Animated background gradient */}
        <div 
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 z-0"
          style={{ 
            filter: `hue-rotate(${hueRotate}deg)`,
            animation: 'pulse 8s infinite alternate',
            opacity: 0.9,
          }}
        ></div>
        
        {/* Distortion overlay */}
        <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay z-0"></div>
        
        {/* Content container */}
        <div className="relative z-10 backdrop-blur-sm bg-black bg-opacity-30 p-8 rounded-xl border border-purple-500 shadow-2xl">
          {/* Glowing neon header */}
          <div className="text-center mb-8">
            <h2 className="text-md uppercase tracking-widest mb-2 text-green-400 animate-pulse">
              Rodeo Type Beat
            </h2>
            <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500">
              {beatData.title}
            </h1>
            
            {/* Beat info with neon glow */}
            <div className="flex justify-center items-center gap-6 text-lg">
              <span className="text-cyan-300 font-mono font-bold neon-text" 
                    style={{textShadow: '0 0 8px #0ff, 0 0 12px #0ff'}}>
                BPM: {beatData.bpm}
              </span>
              <span className="text-pink-300 font-mono font-bold neon-text"
                    style={{textShadow: '0 0 8px #f0f, 0 0 12px #f0f'}}>
                Key: {beatData.key}
              </span>
            </div>
          </div>
          
          {/* Player with trippy border */}
          <div 
            className="astroworld-player mb-8 rounded-lg overflow-hidden border-2"
            style={{
              borderImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f) 1',
              boxShadow: '0 0 30px rgba(255, 0, 255, 0.5)'
            }}
          >
            <BeatPlayer audioSrc={beatData.audioSrc} />
          </div>
          
          {/* Animated description */}
          <p className="my-6 text-lg font-medium text-white text-center max-w-xl mx-auto">
            {beatData.description}
          </p>
          
          {/* 3D price display */}
          <div className="text-center my-8">
            <div 
              className="inline-block px-8 py-4 rounded-full transform rotate-3 hover:rotate-0 transition-all"
              style={{
                background: 'linear-gradient(45deg, #ff00cc, #3333ff)',
                boxShadow: '0 0 20px #ff00cc, 0 0 40px #3333ff',
              }}
            >
              <span className="text-2xl font-black text-white">${beatData.price}</span>
            </div>
          </div>
          
          {/* Cosmic purchase button */}
          <div className="mt-8 text-center">
            <button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
                       text-white font-bold py-4 px-12 rounded-full text-xl uppercase tracking-wider
                       transform transition-all duration-300 hover:scale-105 hover:rotate-1 border border-white border-opacity-20"
              onClick={() => alert('Adding to cart!')}
              style={{boxShadow: '0 0 15px rgba(255, 0, 255, 0.7)'}}
            >
              Add To Cart
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-pink-600 blur-3xl opacity-30 animate-bounce"></div>
        <div className="absolute bottom-8 left-8 w-40 h-40 rounded-full bg-purple-600 blur-3xl opacity-30 animate-pulse"></div>
      </div>
    </Layout>
  );
}