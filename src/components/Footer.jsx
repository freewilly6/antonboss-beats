// src/components/Footer.jsx
//
// Chrome for the standalone routes. The scroll page uses SiteFooter.

import Link from 'next/link';
import LegalLinks from './LegalLinks';

const YOUTUBE = 'https://www.youtube.com/@AntonBoss-pd';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-[var(--fg-10)] pb-32">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-12 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <h3 className="ab-label !text-white">Anton Boss</h3>
          <p className="ab-meta mt-3">&copy; {year} Anton Boss. All rights reserved.</p>
        </div>

        <nav className="flex flex-col items-start gap-3">
          <Link href="/" className="ab-label hover:text-white">Home</Link>
          <Link href="/#beats" className="ab-label hover:text-white">Beats</Link>
          <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" className="ab-label hover:text-white">
            YouTube
          </a>
        </nav>

        <nav className="flex flex-col items-start gap-3">
          <LegalLinks />
          <Link href="/license" className="ab-label hover:text-white">Licensing Info</Link>
        </nav>
      </div>
    </footer>
  );
}
