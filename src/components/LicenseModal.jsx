// src/components/LicenseModal.jsx

import { useState, useEffect } from 'react';
import { useRouter }            from 'next/router';
import { supabase }             from '../lib/supabaseClient';
import { useCart }              from '@/context/CartContext';
import { useLicenseModal }      from '@/context/LicenseModalContext';

export default function LicenseModal() {
  const router                        = useRouter();
  const { isOpen, beat, closeLicenseModal } = useLicenseModal();
  const { addToCart, cart }          = useCart();
  const [purchasedIds, setPurchasedIds] = useState([]);

  // Load exactly the same "beats" JSON you use on DownloadsPage,
  // but normalize every combo into a clean "BeatName-LicenseName" string.
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();
      if (sessErr) {
        console.error('Session error:', sessErr);
        return;
      }
      if (!session) return;

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('beats')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error loading purchases:', error);
        return;
      }

      const ids = purchases.flatMap(purchase => {
        let arr = purchase.beats;
        // Supabase JSON columns usually come back as objects/arrays,
        // but if yours is text, parse it.
        if (typeof arr === 'string') {
          try {
            arr = JSON.parse(arr);
          } catch (e) {
            console.error('Failed to parse beats JSON:', e);
            arr = [];
          }
        }
        return (arr || []).map(item => {
          // 1) Prefer the stored combo (id or beatId) if it isn’t clearly broken
          let raw = null;
          if (
            typeof item.id === 'string' &&
            !/^undefined-/.test(item.id) &&
            !/^-/.test(item.id)
          ) {
            raw = item.id;
          } else if (
            typeof item.beatId === 'string' &&
            !/^undefined-/.test(item.beatId) &&
            !/^-/.test(item.beatId)
          ) {
            raw = item.beatId;
          } else if (item.name && item.license) {
            // 2) Fallback to name+license
            raw = `${encodeURIComponent(item.name)}-${item.license}`;
          }

          if (!raw) return null;

          // 3) Decode any %20 left over
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        })
        .filter(Boolean);
      });

      console.log('purchasedIds:', ids);
      setPurchasedIds(ids);
    })();
  }, [isOpen]);

  if (!isOpen || !beat) return null;

  // Use the human name here so it lines up with our decoded combos
  const title    = beat.name || beat.title || 'Untitled';
  const coverUrl = beat.cover || '/images/beats/default-cover.png';

  const licenses = [
    { name: 'Basic License',        price: 24.99, terms: 'MP3 | Personal Use',   url: beat.audiourl || beat.audioUrl || null },
    { name: 'Premium License',      price: 34.99, terms: 'MP3 + WAV',            url: beat.wav || null },
    { name: 'Premium Plus License', price: 49.99, terms: 'MP3 + WAV + STEMS',   url: beat.stems || null },
    { name: 'Unlimited License',    price: 99.99, terms: 'Full Package',        url: beat.stems || null },
    { name: 'Exclusive License',    price: null,  terms: 'Negotiate',           url: null },
  ];

  function handleClick(lic) {
    // Build the same "BeatName-LicenseName" combo we decoded above
    const combo = `${title}-${lic.name}`;

    // Already purchased?
    if (purchasedIds.includes(combo)) {
      return;
    }

    // Exclusive license → contact form
    if (lic.name === 'Exclusive License') {
      closeLicenseModal();
      router.push('/contact');
      return;
    }

    // Otherwise add to cart
    addToCart({
      id:           combo,        // so inCart() sees it
      beatId:       beat.id,      // real supabase ID if you need it later
      name:         title,
      title:        beat.title || '',
      cover:        coverUrl,
      licenseType:  lic.name,
      price:        lic.price || 0,
      audioUrl:     lic.url,
      wav:          beat.wav   || null,
      stems:        beat.stems || null,
    });

    closeLicenseModal();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="relative bg-gray-900 text-white rounded-lg w-full max-w-2xl overflow-hidden">
        {/* close */}
        <button
          onClick={closeLicenseModal}
          className="absolute top-4 right-4 text-2xl hover:text-pink-400"
        >
          ✕
        </button>

        {/* header */}
        <div className="flex items-center gap-3 bg-gray-800 p-4">
          <img src={coverUrl} alt={title} className="w-16 h-16 rounded object-cover" />
          <h2 className="text-2xl font-bold">{title} — Choose License</h2>
        </div>

        {/* options */}
        <div className="p-4 space-y-3">
          {licenses.map(lic => {
            const combo  = `${title}-${lic.name}`;
            const bought = purchasedIds.includes(combo);
            const inCart = cart.some(item => item.id === combo);

            let label, btnClass;
            if (bought) {
              label    = 'Purchased';
              btnClass = 'bg-gray-600 text-gray-300 cursor-not-allowed';
            } else if (inCart) {
              label    = 'Added';
              btnClass = 'bg-gray-600 text-gray-300 cursor-not-allowed';
            } else if (lic.name === 'Exclusive License') {
              label    = 'Contact';
              btnClass = 'border-2 border-pink-300 text-pink-300 hover:bg-pink-500 hover:text-white';
            } else {
              label    = `+ $${lic.price.toFixed(2)}`;
              btnClass = 'bg-pink-300 text-black hover:bg-pink-500';
            }

            return (
              <div key={lic.name} className="flex justify-between items-center bg-gray-800 rounded p-4">
                <div>
                  <h4 className="font-semibold">{lic.name}</h4>
                  <p className="text-sm text-gray-400">{lic.terms}</p>
                </div>
                <button
                  disabled={bought || inCart}
                  onClick={() => handleClick(lic)}
                  className={`${btnClass} px-4 py-2 rounded font-semibold transition`}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
