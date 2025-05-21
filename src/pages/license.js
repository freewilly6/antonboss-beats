import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const licenses = [
  {
    name: 'Basic License',
    price: '$24.99',
    terms: `This Non-Exclusive Basic License Agreement...`,
  },
  {
    name: 'Premium License',
    price: '$34.99',
    terms: `This Non-Exclusive Premium License Agreement...`,
  },
  {
    name: 'Premium Plus License',
    price: '$49.99',
    terms: `This Non-Exclusive Premium Plus License Agreement...`,
  },
  {
    name: 'Unlimited License',
    price: '$99.99',
    terms: `This Non-Exclusive Unlimited License Agreement...`,
  },
  {
    name: 'Exclusive License',
    price: 'MAKE AN OFFER',
    terms: `This Exclusive License Agreement...`,
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
                <ul className="text-sm space-y-1 mb-6">
                  <li>• Used for Music Recording</li>
                  <li>• Distribute copies</li>
                  <li>• Online Audio Streams</li>
                  <li>• 1 Music Video</li>
                  <li>• Live Performances</li>
                  <li>• Radio Broadcasting</li>
                </ul>
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
