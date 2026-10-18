// src/components/SiteFooter.jsx
//
// Closes the scroll. Carries the links and the mailto that the old Contact
// section used to hold, without a form.

import React from 'react';
import Link from 'next/link';
import LegalLinks from './LegalLinks';
import Reveal from './Reveal';

const LINKS = [
  { href: '/license', label: 'Licensing' },
  { href: '/account?tab=library', label: 'Downloads' },
  { href: '/signin', label: 'Sign in' },
];

export default function SiteFooter() {
  return (
    <footer className="w-full px-6 pb-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal className="ab-divider border-t pt-10">
          <div className="flex flex-wrap items-end justify-between gap-10">
            <div>
              <p className="ab-label mb-4">Get in touch</p>
              <a
                href="mailto:antonbosspd@gmail.com"
                className="ab-display transition-colors hover:text-[var(--accent)]"
              >
                antonbosspd@gmail.com
              </a>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="ab-label hover:text-white">
                  {link.label}
                </Link>
              ))}
              <a
                href="https://www.youtube.com/@AntonBoss-pd"
                target="_blank"
                rel="noreferrer"
                className="ab-label hover:text-white"
              >
                YouTube
              </a>
              <LegalLinks />
            </nav>
          </div>

          <p className="ab-label-dim mt-16">
            © {new Date().getFullYear()} Anton Boss
          </p>
        </Reveal>
      </div>
    </footer>
  );
}
