import Layout from '../../components/Layout';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';
import { usePlayer } from '../../context/PlayerContext';

export default function BeatDetail() {
  const router = useRouter();
  const { beatid } = router.query;
  const { addToCart } = useCart();
  const { playBeat } = usePlayer();

  const [beatData, setBeatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [hueRotate, setHueRotate] = useState(0);

  useEffect(() => {
    if (!beatid) return;

    const fetchBeat = async () => {
      const { data, error } = await supabase
        .from('BeatFiles')
        .select('*')
        .eq('id', beatid)
        .single();

      if (error) {
        console.error('Error fetching beat:', error);
        setLoading(false);
        return;
      }

      setBeatData(data);
      setLoading(false);
    };

    fetchBeat();
  }, [beatid]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotate((prev) => (prev + 1) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!beatData) return <div className="text-center py-20">Beat not found</div>;

  const licenses = [
    { name: 'Basic License', price: 24.99, terms: 'MP3 | Personal Use' },
    { name: 'Premium License', price: 49.99, terms: 'MP3 + WAV' },
    { name: 'Premium Plus License', price: 99.99, terms: 'MP3 + WAV + STEMS' },
    { name: 'Unlimited License', price: 159.99, terms: 'Unlimited Use' },
    { name: 'Exclusive License', price: 'MAKE AN OFFER', terms: 'Negotiate' },
  ];

  return (
    <Layout>
      <div className="astroworld-container p-8 max-w-4xl mx-auto relative overflow-hidden">
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 z-0"
          style={{ filter: `hue-rotate(${hueRotate}deg)`, animation: 'pulse 8s infinite alternate', opacity: 0.9 }}
        ></div>
        <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay z-0"></div>

        <div className="relative z-10 backdrop-blur-sm bg-black bg-opacity-30 p-8 rounded-xl border border-purple-500 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-md uppercase tracking-widest mb-2 text-green-400 animate-pulse">
              {beatData.artist} Type Beat
            </h2>
            <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500">
              {beatData.name}
            </h1>
            <div className="flex justify-center items-center gap-6 text-lg">
              <span className="text-cyan-300 font-mono font-bold">BPM: {beatData.bpm || 'N/A'}</span>
              <span className="text-pink-300 font-mono font-bold">Key: {beatData.key || 'Unknown'}</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={() =>
                playBeat({
                  name: beatData.name,
                  audioUrl: beatData.audiourl,
                  cover: beatData.cover,
                  artist: beatData.artist,
                  price: beatData.price || 24.99,
                })
              }
              className="inline-block px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold text-xl"
            >
              ▶️ Play {beatData.name}
            </button>
          </div>

          <p className="my-6 text-lg font-medium text-white text-center max-w-xl mx-auto">
            {beatData.description || 'No description available for this beat.'}
          </p>

          <div className="text-center my-8">
            <button
              onClick={() => {
                addToCart({
                  id: `${beatData.id}-Default License`,
                  name: beatData.name,
                  price: beatData.price || 24.99,
                  licenseType: 'Default License',
                  cover: beatData.cover,
                  audioUrl: beatData.audioUrl || beatData.audiourl || '',
                  wav: beatData.wav || '',
                  stems: beatData.stems || '',
                });
                router.push('/cart');
              }}
              className="inline-block px-8 py-4 rounded-full transform rotate-3 hover:rotate-0 transition-all"
              style={{
                background: 'linear-gradient(45deg, #ff00cc, #3333ff)',
                boxShadow: '0 0 20px #ff00cc, 0 0 40px #3333ff',
              }}
            >
              <span className="text-2xl font-black text-white">${beatData.price || 24.99}</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-12 rounded-full text-xl uppercase tracking-wider transition-all hover:scale-105 hover:rotate-1 border border-white border-opacity-20"
              onClick={() => {
                addToCart({
                  id: `${beatData.id}-Default License`,
                  name: beatData.name,
                  price: beatData.price || 24.99,
                  licenseType: 'Default License',
                  cover: beatData.cover,
                  audioUrl: beatData.audioUrl || beatData.audiourl || '',
                  wav: beatData.wav || '',
                  stems: beatData.stems || '',
                });
                router.push('/cart');
              }}
            >
              Add To Cart
            </button>
          </div>
        </div>

        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-pink-600 blur-3xl opacity-30 animate-bounce"></div>
        <div className="absolute bottom-8 left-8 w-40 h-40 rounded-full bg-purple-600 blur-3xl opacity-30 animate-pulse"></div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
          <div className="bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
            >
              ✕
            </button>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <img src={beatData.cover} alt="Beat Cover" className="rounded w-40 h-40 object-cover" />
                <h3 className="text-lg font-bold mt-2">{beatData.name}</h3>
                <p className="text-sm text-gray-400">{beatData.artist}</p>
              </div>

              <div className="flex-grow space-y-4">
                {licenses.map((license, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{license.name}</h4>
                      <p className="text-sm text-gray-400">{license.terms}</p>
                    </div>
                    <button
                      onClick={() => {
                        addToCart({
                          id: `${beatData.id}-${license.name}`,
                          name: beatData.name,
                          price: license.price || beatData.price || 24.99,
                          licenseType: license.name,
                          cover: beatData.cover,
                          audioUrl: beatData.audioUrl || beatData.audiourl || '',
                          wav: beatData.wav || '',
                          stems: beatData.stems || '',
                        });
                        setShowModal(false);
                        router.push('/cart');
                      }}
                      className="bg-pink-300 text-black px-4 py-2 rounded font-bold hover:bg-pink-400 transition"
                    >
                      + {typeof license.price === 'number' ? `$${license.price}` : license.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
