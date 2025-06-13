import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const licenses = [
  {
    name: 'Basic License',
    price: '$24.99',
    shortDescription: `Ideal for demos and small personal projects. Limited streams & no radio.`,
    terms: `This Non-Exclusive Basic License Agreement grants the purchaser the right to use the beat for:
- Up to 2,000 streams (audio/video)
- Up to 1 music video
- No radio broadcast rights
- No for-profit performance rights
- Not eligible for digital downloads or physical copies
- Must credit the producer in all published works
- No ownership of the beat is transferred; producer retains full rights
- Not allowed to register the beat with any content ID system (YouTube, Facebook, etc.)`,
  },
  {
    name: 'Premium License',
    price: '$34.99',
    shortDescription: `For independent artists releasing small-scale projects. Includes limited radio & downloads.`,
    terms: `This Non-Exclusive Premium License Agreement grants the purchaser the right to use the beat for:
- Up to 10,000 streams (audio/video)
- Up to 2 music videos
- Up to 1 radio station broadcast
- Up to 500 digital downloads or physical copies
- For-profit live performances permitted (non-ticketed events)
- Must credit the producer in all published works
- No ownership of the beat is transferred; producer retains full rights
- Not allowed to register the beat with any content ID system`,
  },
  {
    name: 'Premium Plus License',
    price: '$49.99',
    shortDescription: `Best for growing artists. High streaming limits, live performances, and radio plays included.`,
    terms: `This Non-Exclusive Premium Plus License Agreement grants the purchaser the right to use the beat for:
- Up to 100,000 streams (audio/video)
- Unlimited music videos
- Up to 5 radio station broadcasts
- Up to 2,000 digital downloads or physical copies
- For-profit live performances permitted (ticketed and non-ticketed events)
- Must credit the producer in all published works
- No ownership of the beat is transferred; producer retains full rights
- Not allowed to register the beat with any content ID system`,
  },
  {
    name: 'Unlimited License',
    price: '$99.99',
    shortDescription: `Full commercial rights. No limits on streams, downloads, or performances.`,
    terms: `This Non-Exclusive Unlimited License Agreement grants the purchaser the right to use the beat for:
- Unlimited streams (audio/video)
- Unlimited music videos
- Unlimited radio broadcasts
- Unlimited digital downloads and physical copies
- For-profit live performances permitted (ticketed and non-ticketed events)
- Must credit the producer in all published works
- No ownership of the beat is transferred; producer retains full rights
- Not allowed to register the beat with any content ID system`,
  },
  {
    name: 'Exclusive License',
    price: 'MAKE AN OFFER',
    shortDescription: `Exclusive rights. No resale. Includes royalties & publishing split.`,
    terms: `This Exclusive License Agreement grants the purchaser the right to use the beat exclusively, meaning:
- Unlimited streams (audio/video)
- Unlimited music videos
- Unlimited radio broadcasts
- Unlimited digital downloads and physical copies
- For-profit live performances permitted (ticketed and non-ticketed events)
- Exclusive rights: the beat will no longer be sold to other customers
- Ownership of the master recording is transferred to the buyer (unless otherwise negotiated)
- Producer retains publishing rights and is entitled to a publishing split (standard 50/50 split unless otherwise agreed)
- Producer is entitled to songwriting credit where applicable
- Buyer is responsible for registering the composition with relevant performing rights organizations (PROs) and including producer in the registration
- Buyer may register the beat with content ID systems if agreed upon
- Credit to the producer required unless otherwise agreed in writing`,
  },
];


export default function Licensing() {
  const [selectedLicense, setSelectedLicense] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setSelectedLicense(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedLicense(null);
      }
    }

    if (selectedLicense) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLicense]);

  return (
    <div className="bg-black text-pink-200 flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-28 px-4 max-w-7xl mx-auto">
        <h1 className="text-center text-4xl font-bold mb-12">Licensing Info</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-center">
          {licenses.map((license, index) => (
            <div
              key={index}
              className="bg-gray-900 p-6 rounded-lg shadow-md flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">{license.name}</h2>
                <p className="text-2xl font-bold mb-4">{license.price}</p>
                <p className="text-sm mb-6">{license.shortDescription}</p>
              </div>
              <button
                onClick={() => setSelectedLicense(license)}
                className="bg-pink-300 text-black font-semibold py-2 rounded hover:bg-pink-400 transition"
              >
                READ LICENSE
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />

      {/* Modal */}
      {selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-gray-800 text-white max-w-2xl w-full p-6 rounded-lg shadow-lg relative overflow-y-auto max-h-[80vh]"
          >
            <button
              onClick={() => setSelectedLicense(null)}
              className="absolute top-4 right-4 text-xl text-white hover:text-pink-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4">License Preview</h2>
            <p className="text-sm whitespace-pre-wrap">{selectedLicense.terms}</p>
          </div>
        </div>
      )}
    </div>
  );
}
