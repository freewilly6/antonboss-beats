// src/components/Footer.jsx
import Link from 'next/link';
import { usePlayer } from '../context/PlayerContext';
import { useState, useRef, useEffect } from 'react';

export default function Footer() {
  const { currentBeat } = usePlayer();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const privacyRef = useRef(null);
  const termsRef   = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showPrivacy && privacyRef.current && !privacyRef.current.contains(e.target)) {
        setShowPrivacy(false);
      }
      if (showTerms && termsRef.current && !termsRef.current.contains(e.target)) {
        setShowTerms(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPrivacy, showTerms]);

  const year = new Date().getFullYear();

  return (
    <>
      <footer className="bg-gray-900 text-gray-400 mt-16 pb-32">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 sm:grid-cols-3 gap-6 items-start text-center sm:text-left">

          {/* Brand spans both cols on mobile, one col on desktop */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-2xl font-bold text-pink-300">ANTONBOSS</h3>
            <p className="mt-2 text-sm">&copy; {year} AntonBoss. All Rights Reserved.</p>
          </div>

          {/* Primary links */}
          <nav className="flex flex-col space-y-2 self-start">

            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/beats" className="hover:text-white">Beats</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link
              href="https://www.youtube.com/@AntonBoss-pd"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline text-sm"
            >
              YouTube
            </Link>
          </nav>

          {/* Legal links */}
          <nav className="flex flex-col space-y-2 self-start">

            <button
              onClick={() => setShowTerms(true)}
              className="hover:text-white text-left"
            >
              Terms of Use
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-white text-left"
            >
              Privacy Policy
            </button>
            <Link href="/license" className="hover:text-white text-left">Licensing Info</Link>
          </nav>
        </div>
      </footer>

      {/* PRIVACY MODAL */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center px-4 sm:px-6">
          <div
            ref={privacyRef}
            className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-lg overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pink-300 mb-2">Privacy Policy</h2>
            {/* ...privacy content... */}
          </div>
        </div>
      )}

      {/* TERMS MODAL */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center px-4 sm:px-6">
          <div
            ref={termsRef}
            className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-lg overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowTerms(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pink-300 mb-2">Terms of Use</h2>
            {/* ...terms content... */}
          </div>
        </div>
      )}
    </>
  );
}
