// src/components/Footer.jsx
import Link from 'next/link';
import { usePlayer } from '../context/PlayerContext';
import { useState, useRef, useEffect } from 'react';

export default function Footer() {
  const { currentBeat } = usePlayer();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const privacyRef = useRef(null);
  const termsRef = useRef(null);

  // Click outside modal to close
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

  return (
    <>
      <footer className="bg-gray-900 text-gray-400 mt-16">
        {/* Footer Links */}
        <div className="container mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-xl font-bold text-indigo-300">ANTONBOSS</div>

          <nav className="flex flex-col">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/beats" className="hover:text-white">Beats</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link
  href="https://www.youtube.com/@AntonBoss-pd"
  className="hover:text-white underline text-sm"
  target="_blank"
  rel="noopener noreferrer"
>
  YouTube
</Link>
          </nav>

          <nav className="flex flex-col">
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
            <Link href="/license" className="hover:text-white">Licensing Info</Link>
          </nav>
        </div>

        <div className="text-center text-sm mt-8 pb-4">
          &copy; {new Date().getFullYear()} AntonBoss. All Rights Reserved.
        </div>
      </footer>

      {/* === PRIVACY MODAL === */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center px-4">
          <div
            ref={privacyRef}
            className="bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pink-300 mb-2">Privacy Policy</h2>
            <p className="text-xl font-bold mb-4 text-pink-200">https://Antonboss.com Privacy Policy</p>
            <p className="text-sm text-gray-400 mb-4">Effective date: May 8 2025</p>
            <p className="mb-4">
              <strong>Anton ("Website", "us", "we", or "our")</strong> are committed to protecting your privacy online...
            </p>
            <p className="mb-4">We operate the Website and other related websites and applications (the "Service").</p>
            <p className="mb-4">This page informs you of our policies regarding the collection, use, and disclosure of personal data...</p>
            <p className="mb-4"><strong>Definitions</strong><br />Personal Data means data about a living individual...</p>
            <p className="mb-4"><strong>Usage Data</strong>: collected automatically...</p>
            <p className="mb-4"><strong>Cookies</strong>: small files stored on your device...</p>
          </div>
        </div>
      )}

      {/* === TERMS MODAL === */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center px-4">
          <div
            ref={termsRef}
            className="bg-gray-900 text-white p-6 rounded-lg max-w-3xl w-full relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowTerms(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-pink-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pink-300 mb-2">Terms of Use</h2>
            <p className="text-sm text-gray-400 mb-4">Last updated: May 8, 2025</p>
            <p className="mb-4">By accessing and using this website, you accept and agree to be bound by the terms and conditions of this agreement...</p>
            <p className="mb-4">You must not misuse the content, violate copyright rules, or engage in activities that harm the website or its users...</p>
            <p className="mb-4"><strong>License</strong>: All beats remain the intellectual property of their respective producers unless otherwise stated.</p>
            <p className="mb-4"><strong>Limitation of Liability</strong>: We are not liable for indirect, incidental, or consequential damages arising from use.</p>
            <p className="mb-4"><strong>Changes</strong>: We reserve the right to update these terms at any time.</p>
          </div>
        </div>
      )}
    </>
  );
}
