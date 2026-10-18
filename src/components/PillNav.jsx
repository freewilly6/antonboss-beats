// src/components/PillNav.jsx

import React, { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { usePlayer } from '@/context/PlayerContext';

const SECTIONS = [
  { id: 'scope', label: 'Scope' },
  { id: 'beats', label: 'Beats' },
  { id: 'about', label: 'About' },
  { id: 'freedom', label: 'Freedom' },
];

export default function PillNav({ onOpenCart }) {
  const [active, setActive] = useState('scope');
  const { cart } = useCart();
  const { currentBeat } = usePlayer();
  const count = cart?.length ?? 0;

  useEffect(() => {
    // rootMargin pins the trip-wire to the viewport's middle band, so a section
    // becomes "active" only once it actually dominates the screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The playbar carries its own controls; with both up, the bottom of a phone
  // screen is all chrome. The nav steps aside while a beat is loaded.
  if (currentBeat) return null;

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2"
      // z-chrome keeps it above the VHS overlay so it stays readable.
      style={{ zIndex: 'var(--z-chrome)' }}
      aria-label="Section navigation"
    >
      <div className="pill-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            aria-current={active === s.id ? 'true' : undefined}
            className={`pill-nav-item ${active === s.id ? 'is-active' : ''}`}
          >
            {s.label}
          </button>
        ))}

        <span className="pill-nav-divider" />

        <button
          onClick={onOpenCart}
          className={`pill-nav-item ${count ? 'has-items' : ''}`}
        >
          Cart{count ? ` (${count})` : ''}
        </button>
      </div>
    </nav>
  );
}
