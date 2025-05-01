import { useCart } from '@/context/CartContext';
import { useLicenseModal } from '@/context/LicenseModalContext';
import { useRouter } from 'next/router'; // ✅ import router

export default function LicenseModal() {
  const { selectedBeat, closeLicenseModal } = useLicenseModal();
  const { addToCart } = useCart();
  const router = useRouter(); // ✅ initialize router

  if (!selectedBeat) return null;

  const licenses = [
    { name: 'Basic License', price: 24.99, terms: 'MP3 | Personal Use' },
    { name: 'Premium License', price: 49.99, terms: 'MP3 + WAV' },
    { name: 'Premium Plus License', price: 99.99, terms: 'MP3 + WAV + STEMS' },
    { name: 'Unlimited License', price: 159.99, terms: 'Unlimited Use' },
    { name: 'Exclusive License', price: 'MAKE AN OFFER', terms: 'Negotiate' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={closeLicenseModal}
          className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
        >
          ✕
        </button>
        <div className="flex items-center gap-4 mb-6">
          <img
            src={selectedBeat.cover || '/images/beats/default-cover.png'}
            alt={selectedBeat.title}
            className="w-20 h-20 object-cover rounded"
          />
          <h2 className="text-2xl font-bold">{selectedBeat.title} — Choose License</h2>
        </div>
        {licenses.map((license, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3"
          >
            <div>
              <h4 className="font-semibold">{license.name}</h4>
              <p className="text-sm text-gray-400">{license.terms}</p>
            </div>
            <button
              className="bg-pink-300 text-black px-4 py-2 rounded font-bold hover:bg-pink-400 transition"
              onClick={() => {
                if (license.name === 'Exclusive License') {
                  closeLicenseModal();            // ✅ close modal first
                  router.push('/contact');        // ✅ redirect to contact page
                } else {
                  const newItem = {
                    id: `${selectedBeat.id}-${license.name}`,
                    title: selectedBeat.title,
                    price: typeof license.price === 'number' ? license.price : 0,
                    image: selectedBeat.cover || '/images/beats/default-cover.png',
                    license: license.name,
                  };
                  addToCart(newItem);
                  closeLicenseModal();
                }
              }}
            >
              + {typeof license.price === 'number' ? `$${license.price}` : license.price}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
