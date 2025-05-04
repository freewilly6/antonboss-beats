// src/pages/beat/[beatid].js
import Layout from '../../components/Layout';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';
import { usePlayer } from '../../context/PlayerContext';
import Footer from '../../components/Footer';

export default function BeatDetail() {
  const router = useRouter();
  const { beatid } = router.query;
  const { addToCart } = useCart();
  const { playBeat } = usePlayer();

  const [beatData, setBeatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hueRotate, setHueRotate] = useState(0);

  const [user, setUser] = useState(null);
  const [purchasedIds, setPurchasedIds] = useState([]);

  // fetch beat metadata
  useEffect(() => {
    if (!beatid) return;
    (async () => {
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
    })();
  }, [beatid]);

  // animate background
  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotate(prev => (prev + 1) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // fetch current user and their purchased beat-license IDs
  useEffect(() => {
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('beats')
        .eq('user_id', session.user.id);

      if (!error && purchases) {
        const ids = purchases
          .flatMap(p => p.beats || [])
          .map(item => item.id);
        setPurchasedIds(ids);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!beatData) return <div className="text-center py-20">Beat not found</div>;

  // license tiers for this beat
  const licenses = [
    {
      name:    'Basic License',
      price:   24.99,
      terms:   'MP3 | Personal Use',
      fileUrl: beatData.audiourl || ''
    },
    {
      name:    'Premium License',
      price:   49.99,
      terms:   'MP3 + WAV',
      fileUrl: beatData.wav || ''
    },
    {
      name:    'Premium Plus License',
      price:   99.99,
      terms:   'MP3 + WAV + STEMS',
      fileUrl: beatData.stems || ''
    },
    {
      name:    'Unlimited License',
      price:   159.99,
      terms:   'Full Package',
      fileUrl: beatData.stems || ''
    },
    {
      name:    'Exclusive License',
      price:   'MAKE AN OFFER',
      terms:   'Negotiate',
      fileUrl: null
    }
  ];

  // add to cart with unique id per beat+license
  const handleAddToCart = (licenseName, price, fileUrl) => {
    if (!beatData.id) return;
    if (!fileUrl) return;

    const itemId = `${beatData.id}-${licenseName}`;
    addToCart({
      id:          itemId,
      name:        beatData.name,
      price:       typeof price === 'number' ? price : beatData.price || 24.99,
      licenseType: licenseName,
      cover:       beatData.cover,
      audioUrl:    fileUrl
    });
    router.push('/cart');
  };

  return (
    <Layout>
      <div className="astroworld-container p-8 max-w-4xl mx-auto relative overflow-hidden">
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 z-0"
          style={{
            filter: `hue-rotate(${hueRotate}deg)`,
            animation: 'pulse 8s infinite alternate',
            opacity: 0.9
          }}
        />
        <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay z-0" />

        <div className="relative z-10 backdrop-blur-sm bg-black bg-opacity-30 p-8 rounded-xl border border-purple-500 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-md uppercase tracking-widest mb-2 text-green-400 animate-pulse">
              {beatData.artist} Type Beat
            </h2>
            <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500">
              {beatData.name}
            </h1>
            <div className="flex justify-center items-center gap-6 text-lg">
              <span className="text-cyan-300 font-mono font-bold">
                BPM: {beatData.bpm || 'N/A'}
              </span>
              <span className="text-pink-300 font-mono font-bold">
                Key: {beatData.key || 'Unknown'}
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={() =>
                playBeat({
                  name:     beatData.name,
                  audioUrl: beatData.audiourl,
                  cover:    beatData.cover,
                  artist:   beatData.artist,
                  price:    beatData.price || 24.99
                })
              }
              className="inline-block px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold text-xl"
            >
              ▶️ Play {beatData.name}
            </button>
          </div>

          <p className="my-6 text-lg font-medium text-white text-center max-w-xl mx-auto">
            {beatData.description || 'No description available.'}
          </p>

          {/* license buttons */}
          <div className="mt-8 text-center space-y-4">
            {licenses.map(lic => {
              const thisId = `${beatData.id}-${lic.name}`;
              const already = purchasedIds.includes(thisId);

              return (
                <button
                  key={lic.name}
                  disabled={already}
                  onClick={() => handleAddToCart(lic.name, lic.price, lic.fileUrl)}
                  className={`m-2 inline-block bg-gradient-to-r from-purple-600 to-pink-600 
                    hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 
                    rounded-full text-lg uppercase tracking-wider transition-all 
                    ${already ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:rotate-1'} 
                    border border-white border-opacity-20`}
                >
                  {typeof lic.price === 'number'
                    ? `${lic.name} — $${lic.price}`
                    : `${lic.name} — ${lic.price}`}
                  {already && ' (Purchased)'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </Layout>
  );
}
