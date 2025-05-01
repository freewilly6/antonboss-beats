// src/components/Navbar.jsx
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { getTotal } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-shadow bg-white text-black ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <Link href="/">
        <img src="/images/logo.png" alt="AntonBoss Logo" className="h-12 cursor-pointer" />
      </Link>
      <div className="flex gap-6 font-medium items-center">
        <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
        <Link href="/beats" className="hover:text-indigo-600 transition">Beats</Link>
        <Link href="/about" className="hover:text-indigo-600 transition">About</Link>
        <Link href="/contact" className="hover:text-indigo-600 transition">Contact</Link>
        <Link href="/cart" className="hover:text-indigo-600 transition relative">
          Cart
          <span className="ml-1 font-semibold text-pink-600">
            ${getTotal().toFixed(2)}
          </span>
        </Link>
        <Link href="/signin" className="hover:scale-110 transition text-2xl">🧑‍🦯</Link>
      </div>
    </nav>
  );
}
