// components/LicenseModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '@/context/CartContext';
import { useLicenseModal } from '@/context/LicenseModalContext';
import { useRouter } from 'next/router';

export default function LicenseModal() {
  const { selectedBeat, closeLicenseModal } = useLicenseModal();
  const { addToCart, cart } = useCart();
  const router = useRouter();

  const [purchasedIds, setPurchasedIds] = useState([]);

  // reload purchases any time we open for a new beat
  useEffect(() => {
    async function loadPurchases() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('beats')
        .eq('user_id', session.user.id);

      if (!error && purchases) {
        const ids = purchases.flatMap(p => p.beats || []).map(b => b.id);
        setPurchasedIds(ids);
      }
    }
    if (selectedBeat) loadPurchases();
  }, [selectedBeat]);

  if (!selectedBeat) return null;

  // ─── normalize IDs & URLs ─────────────────────────────────────────────
  const {
    id: raw1,
    beatId: raw2,
    beat_id: raw3,
    name,
    cover,
    audioUrl,
    audiourl,
    wav,
    stems,
  } = selectedBeat;

  const beatId     = raw1 ?? raw2 ?? raw3;
  const fallback   = name ?? audioUrl ?? 'unknown-beat';
  const baseKey    = beatId ?? encodeURIComponent(fallback);
  const beatTitle  = name ?? 'Untitled';
  const coverUrl   = cover ?? '/images/beats/default-cover.png';

  const licenses = [
    { name: 'Basic License',       price: 24.99,  terms: 'MP3 | Personal Use',      fileUrl: audioUrl ?? audiourl ?? null },
    { name: 'Premium License',     price: 49.99,  terms: 'MP3 + WAV',               fileUrl: wav ?? null },
    { name: 'Premium Plus License',price: 99.99,  terms: 'MP3 + WAV + STEMS',      fileUrl: stems ?? null },
    { name: 'Unlimited License',   price: 159.99, terms: 'Full Package',           fileUrl: stems ?? null },
    { name: 'Exclusive License',   price: 'MAKE AN OFFER', terms: 'Negotiate',     fileUrl: null },
  ];

  const handleClick = (lic) => {
    const thisId = `${baseKey}-${lic.name}`;

    // 1️⃣ prevent re-adding
    if (purchasedIds.includes(thisId) || cart.some(item => item.id === thisId)) {
      return;
    }

    // 2️⃣ exclusive → contact form
    if (lic.name === 'Exclusive License') {
      closeLicenseModal();
      return router.push('/contact');
    }

    // 3️⃣ finally, add to cart (even if fileUrl is null)
    addToCart({
      id:          thisId,
      name:        beatTitle,
      price:       lic.price,
      licenseType: lic.name,
      cover:       coverUrl,
      audioUrl:    lic.fileUrl,
    });

    closeLicenseModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="relative bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full">
        <button
          onClick={closeLicenseModal}
          className="absolute top-4 right-4 text-2xl hover:text-pink-400"
        >✕</button>

        <div className="flex items-center gap-4 mb-6">
          <img src={coverUrl} alt={beatTitle} className="w-20 h-20 rounded" />
          <h2 className="text-2xl font-bold">
            {beatTitle} — Choose License
          </h2>
        </div>

        {licenses.map(lic => {
          const thisId        = `${baseKey}-${lic.name}`;
          const isPurchased   = purchasedIds.includes(thisId);
          const isInCart      = cart.some(item => item.id === thisId);
          const disabled      = isPurchased || isInCart;

          // label logic
          let label;
          if (isPurchased)      label = 'Purchased';
          else if (isInCart)    label = 'Added';
          else if (typeof lic.price === 'number')
            label = `+ $${lic.price.toFixed(2)}`;
          else
            label = `+ ${lic.price}`;

          return (
            <div key={lic.name} className="flex justify-between p-4 bg-gray-800 rounded mb-3">
              <div>
                <h4 className="font-semibold">{lic.name}</h4>
                <p className="text-sm text-gray-400">{lic.terms}</p>
              </div>
              <button
                disabled={disabled}
                onClick={() => handleClick(lic)}
                className={`px-4 py-2 rounded font-bold transition ${
                  disabled
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-pink-300 text-black hover:bg-pink-400'
                }`}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
