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
    name:      'Basic License',
    price:     24.99,
    terms:     'MP3 | Personal Use',
    mp3:       beatData.audiourl,
    wav:       null,
    stems:     null,
  },
  {
    name:      'Premium License',
    price:     49.99,
    terms:     'MP3 + WAV',
    mp3:       beatData.audiourl,
    wav:       beatData.wav,
    stems:     null,
  },
  {
    name:      'Premium Plus License',
    price:     99.99,
    terms:     'MP3 + WAV + STEMS',
    mp3:       beatData.audiourl,
    wav:       beatData.wav,
    stems:     beatData.stems,
  },
    {
      name:    'Unlimited License',
      price:   159.99,
      terms:   'Full Package',
      mp3:       beatData.audiourl,
      wav:       beatData.wav,
      stems:     beatData.stems,
    },
    {
      name:    'Exclusive License',
      price:   'MAKE AN OFFER',
      terms:   'Negotiate',
      fileUrl: null
    }
  ];

   // add to cart with proper beatId
  const handleAddToCart = (lic) => {
    if (!beatData.id) return;

    addToCart({
      beatId:      beatData.id,
      name:        beatData.name,
      title:       beatData.title,
      cover:       beatData.cover,
      licenseType: lic.name,
      price:       lic.price,
      audioUrl:    lic.mp3,
      wav:         lic.wav,
      stems:       lic.stems,
    });
    router.push('/cart');
  };

  return (
    <Layout>
      <div className="astroworld-container p-8 max-w-4xl mx-auto relative overflow-hidden">
        {/* … your existing UI code … */}
        <div className="mt-8 text-center space-y-4">
          {licenses.map(lic => {
            const thisId = `${beatData.id}-${lic.name}`;
            const already = purchasedIds.includes(thisId);

            return (
              <button
                key={lic.name}
                disabled={already}
                onClick={() => handleAddToCart(lic)}
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
      <Footer />
    </Layout>
  );
}
