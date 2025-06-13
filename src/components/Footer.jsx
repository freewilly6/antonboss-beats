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
            {<div className="text-sm text-gray-300 space-y-4">
  <p>
    This Privacy Policy explains how Anton Boss ("we", "our", or "us") collects, uses, and protects your information when you use this website.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">1. Information We Collect</h3>
  <p>
    - Information you provide through forms (such as name, email address, purchase details).<br />
    - Automatically collected information (such as IP address, browser type, device information) through cookies and analytics tools.<br />
    - This website is hosted on Vercel. Certain technical information such as IP address and browser type may be collected automatically by Vercel for security and analytics purposes. Please refer to{' '}
    <a href="https://vercel.com/legal/privacy-policy" className="text-pink-300 underline" target="_blank" rel="noopener noreferrer">
      Vercel’s Privacy Policy
    </a>{' '}
    for more information.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">2. How We Use Your Information</h3>
  <p>
    - To process purchases and transactions.<br />
    - To send important updates or respond to inquiries.<br />
    - To analyze website performance and improve user experience.<br />
    - We do not sell or rent your information to third parties.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">3. Cookies</h3>
  <p>
    We use cookies to provide a better browsing experience and for analytics purposes. You can manage your cookie preferences through your browser settings.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">4. Security</h3>
  <p>
    We take reasonable steps to protect your information. However, no system is completely secure. Use this website at your own risk.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">5. Your Rights</h3>
  <p>
    You may request access, correction, or deletion of your personal data by contacting us.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">6. Changes to This Policy</h3>
  <p>
    We may update this Privacy Policy at any time. Changes will be posted on this page.
  </p>

  <p>
    If you have any questions about this Privacy Policy, please contact us at antonbosspd@gmail.com.
  </p>
</div>
}
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
            {<div className="text-sm text-gray-300 space-y-4">
  <p>
    Welcome to Anton Boss Beats. By using this website, you agree to the following Terms of Use. If you do not agree, please do not use the website.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">1. Intellectual Property</h3>
  <p>
    All beats, audio files, and content on this site are the property of Anton Boss and are protected by copyright laws.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">2. License Terms</h3>
  <p>
    When you purchase a license, you are granted specific rights outlined in that license. You may not use the beats beyond what is allowed in the license.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">3. Prohibited Uses</h3>
  <p>
    You may not resell, redistribute, or sub-license any beats or content from this website without written permission.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">4. Disclaimer</h3>
  <p>
    All content is provided "as is." We make no warranties regarding the accuracy or fitness for a particular purpose.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">5. Limitation of Liability</h3>
  <p>
    We are not liable for any damages resulting from your use of this website or purchased content.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">6. Governing Law</h3>
  <p>
    These Terms of Use are governed by and construed in accordance with the laws of your jurisdiction.
  </p>

  <h3 className="text-lg font-semibold text-pink-300">7. Changes to Terms</h3>
  <p>
    We reserve the right to update these Terms of Use at any time. Changes will be posted on this page.
  </p>

  <p>
    For any questions, please contact antonbosspd@gmail.com.
  </p>
</div>
}
          </div>
        </div>
      )}
    </>
  );
}
