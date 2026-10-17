// src/components/Reveal.jsx
//
// Fades content in the first time it enters the viewport. Wraps the *contents*
// of a section rather than the section itself, so the ids and heights that
// PillNav's scroll-spy observes stay put and never shift under it.

import React, { useEffect, useRef, useState } from 'react';

export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anyone who asked for less motion gets the content immediately.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.unobserve(entry.target); // reveal once; don't re-fade on scroll back
      },
      // Start the moment the block's top edge clears the bottom few percent of
      // the screen. Waiting for 12% of it to be visible left tall blocks blank
      // for a beat while you scrolled into them.
      { threshold: 0, rootMargin: '0px 0px -4% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`ab-reveal ${shown ? 'ab-reveal-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
