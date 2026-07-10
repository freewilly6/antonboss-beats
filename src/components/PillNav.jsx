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

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 transition-[bottom] duration-300"
      // BeatPlayer is fixed to bottom-0 and mounts as soon as a beat plays.
      // Ride above it rather than getting buried under it. z-chrome puts both
      // above the VHS overlay so they stay readable.
      style={{ bottom: currentBeat ? '7rem' : '1.5rem', zIndex: 'var(--z-chrome)' }}
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
