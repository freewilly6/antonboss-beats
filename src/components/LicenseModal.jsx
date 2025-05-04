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

  // keep track of what licenses the user already purchased
  const [purchasedIds, setPurchasedIds] = useState([]);

  useEffect(() => {
    async function loadPurchases() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
    }
    loadPurchases();
  }, []);

  if (!selectedBeat) return null;

  const beatId    = selectedBeat.id || selectedBeat.beatId;
  const beatTitle = selectedBeat.name || 'Untitled';
  const cover     = selectedBeat.cover || '/images/beats/default-cover.png';

  const licenses = [
    { name: 'Basic License',       price: 24.99,  terms: 'MP3 | Personal Use',      fileUrl: selectedBeat.audioUrl || selectedBeat.audiourl || '' },
    { name: 'Premium License',     price: 49.99,  terms: 'MP3 + WAV',               fileUrl: selectedBeat.wav    || '' },
    { name: 'Premium Plus License',price: 99.99,  terms: 'MP3 + WAV + STEMS',      fileUrl: selectedBeat.stems  || '' },
    { name: 'Unlimited License',   price: 159.99, terms: 'Full Package',           fileUrl: selectedBeat.stems  || '' },
    { name: 'Exclusive License',   price: 'MAKE AN OFFER', terms: 'Negotiate',         fileUrl: null },
  ];

  const handleClick = (lic) => {
    const thisId = `${beatId}-${lic.name}`;

    // 1️⃣ don’t let them re-buy something they already purchased
    if (purchasedIds.includes(thisId)) {
      return;
    }

    // 2️⃣ exclusive goes to contact form
    if (lic.name === 'Exclusive License') {
      closeLicenseModal();
      return router.push('/contact');
    }

    // 3️⃣ guard against missing data
    if (!beatId || !lic.fileUrl) return;

    // 4️⃣ add to cart
    addToCart({
      id:          thisId,
      name:        beatTitle,
      price:       lic.price,
      licenseType: lic.name,
      cover,
      audioUrl:    lic.fileUrl,
    });

    closeLicenseModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full">
        <button
          onClick={closeLicenseModal}
          className="absolute top-4 right-4 text-2xl hover:text-pink-400"
        >
          ✕
        </button>

        <div className="flex items-center gap-4 mb-6">
          <img src={cover} alt={beatTitle} className="w-20 h-20 rounded" />
          <h2 className="text-2xl font-bold">
            {beatTitle} — Choose License
          </h2>
        </div>

        {licenses.map((lic) => {
          const thisId = `${beatId}-${lic.name}`;
          const alreadyPurchased = purchasedIds.includes(thisId);
          const alreadyInCart    = cart.some(item => item.id === thisId);
          const disabled         = alreadyPurchased || alreadyInCart;

          const label = alreadyPurchased
            ? 'Purchased'
            : alreadyInCart
              ? 'Added'
              : typeof lic.price === 'number'
                ? `+ $${lic.price.toFixed(2)}`
                : `+ ${lic.price}`;

          return (
            <div
              key={lic.name}
              className="flex justify-between p-4 bg-gray-800 rounded mb-3"
            >
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
