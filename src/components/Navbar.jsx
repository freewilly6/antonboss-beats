// src/components/Navbar.jsx
//
// Chrome for the standalone routes (license, cart, downloads, signin). The
// scroll page uses PillNav instead and never mounts this.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { createClient } from '@supabase/supabase-js';
import { UserIcon } from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Point at the sections directly — /beats and /about only exist as redirects now.
const LINKS = [
  ['/', 'Home'],
  ['/#beats', 'Beats'],
  ['/#about', 'About'],
  ['/downloads', 'Downloads'],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const { getTotal } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user || null);
    });
    return () => listener.subscription?.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMobileOpen(false);
  };

  return (
    <nav
      style={{ zIndex: 'var(--z-chrome)' }}
      className={`fixed left-0 top-0 w-full bg-black transition-colors ${
        scrolled ? 'border-b border-[var(--fg-10)]' : ''
      }`}
    >
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link href="/">
          <img
            src="/images/logo.png"
            alt="Anton Boss"
            className="h-12 cursor-pointer invert sm:h-14"
          />
        </Link>

        <div className="hidden items-center gap-7 sm:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="ab-label hover:text-white">
              {label}
            </Link>
          ))}

          <Link href="/cart" className="ab-label hover:text-white">
            Cart <span className="ml-1 text-[var(--accent)]">${getTotal().toFixed(2)}</span>
          </Link>

          {!user ? (
            <Link href="/signin" aria-label="Sign in" className="text-[var(--fg-50)] hover:text-white">
              <UserIcon className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={user.user_metadata?.avatar_url || '/images/user-default.png'}
                alt=""
                className="h-8 w-8 rounded-full object-cover grayscale"
              />
              <button onClick={handleSignOut} className="ab-btn ab-btn-sm">
                Sign out
              </button>
            </div>
          )}
        </div>

        <button
          className="ab-btn ab-btn-bare text-lg sm:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '×' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="flex flex-col border-t border-[var(--fg-10)] bg-black px-6 py-2 sm:hidden">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="ab-label border-b border-[var(--fg-10)] py-4 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}

          <Link
            href="/cart"
            className="ab-label border-b border-[var(--fg-10)] py-4 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            Cart <span className="ml-1 text-[var(--accent)]">${getTotal().toFixed(2)}</span>
          </Link>

          {!user ? (
            <Link
              href="/signin"
              className="ab-label py-4 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
          ) : (
            <div className="flex items-center gap-3 py-4">
              <img
                src={user.user_metadata?.avatar_url || '/images/user-default.png'}
                alt=""
                className="h-8 w-8 rounded-full object-cover grayscale"
              />
              <button onClick={handleSignOut} className="ab-btn ab-btn-sm">
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
