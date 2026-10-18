// src/components/Navbar.jsx
//
// Chrome for the standalone routes (cart, account, downloads, license,
// sign-in). Same vocabulary as the scroll page: the logo, and the white Menu
// pill that opens the full-screen menu, which carries every link. A cart
// count sits beside it once there's something in the cart.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import SiteMenu from './SiteMenu';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { cart } = useCart();
  const count = cart?.length ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      style={{ zIndex: 'var(--z-chrome)' }}
      className={`fixed left-0 top-0 w-full bg-[var(--bg)] transition-colors ${
        scrolled ? 'border-b border-[var(--fg-10)]' : 'border-b border-transparent'
      }`}
    >
      <div className="flex w-full items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" aria-label="Anton Boss — home">
          <img
            src="/images/logo-256.webp"
            alt="Anton Boss"
            width={256}
            height={256}
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        <div className="flex items-center gap-3">
          {count > 0 && (
            <Link href="/cart" className="site-menu-trigger" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              Cart <span className="text-[var(--accent)]">{count}</span>
            </Link>
          )}
          <SiteMenu />
        </div>
      </div>
    </nav>
  );
}
