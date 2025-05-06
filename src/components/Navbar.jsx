// src/components/Navbar.jsx
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [user, setUser]             = useState(null);
  const { getTotal }                = useCart();
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

  const links = [
    ['/', 'Home'],
    ['/beats', 'Beats'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/downloads', 'Downloads'],
  ];

  return (
    <nav
      className={`
        fixed top-0 left-0 w-full z-50 bg-white text-black transition-shadow
        ${scrolled ? 'shadow-md' : ''}
      `}
    >
      {/* full-width flex container */}
      <div className="w-full flex items-center justify-between px-6 py-4">
        {/* Logo flush left */}
        <Link href="/">
          <img
            src="/images/logo.png"
            alt="AntonBoss Logo"
            className="h-10 sm:h-16 cursor-pointer"
          />
        </Link>

        {/* Desktop links flush right */}
        <div className="hidden sm:flex items-center gap-6 font-medium">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-indigo-600 transition">
              {label}
            </Link>
          ))}

          <Link href="/cart" className="hover:text-indigo-600 transition">
            Cart <span className="ml-1 font-semibold text-pink-600">${getTotal().toFixed(2)}</span>
          </Link>

          {!user ? (
            <Link href="/signin" className="text-2xl hover:scale-110 transition">
              🧑‍🦯
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={user.user_metadata?.avatar_url || '/images/user-default.png'}
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <button
                onClick={handleSignOut}
                className="text-sm bg-gray-200 hover:bg-gray-300 rounded px-3 py-1"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Mobile toggle (still flush right on xs) */}
        <button
          className="sm:hidden text-2xl p-2"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '×' : '☰'}
        </button>
      </div>

      {/* …mobile menu unchanged… */}
    </nav>
  );
}
