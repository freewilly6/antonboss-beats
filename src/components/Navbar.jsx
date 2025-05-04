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
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const { getTotal } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-shadow bg-white text-black ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <Link href="/">
        <img src="/images/logo.png" alt="AntonBoss Logo" className="h-17 cursor-pointer" />
      </Link>
      <div className="flex gap-6 font-medium items-center">
        <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
        <Link href="/beats" className="hover:text-indigo-600 transition">Beats</Link>
        <Link href="/about" className="hover:text-indigo-600 transition">About</Link>
        <Link href="/contact" className="hover:text-indigo-600 transition">Contact</Link>
        <Link href="/downloads" className="hover:text-indigo-600 transition">Downloads</Link>
        <Link href="/cart" className="hover:text-indigo-600 transition relative">
          Cart
          <span className="ml-1 font-semibold text-pink-600">
            ${getTotal().toFixed(2)}
          </span>
        </Link>

        {/* Auth */}
        {!user ? (
          <Link href="/signin" className="hover:scale-110 transition text-2xl">🧑‍🦯</Link>
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
    </nav>
  );
}
