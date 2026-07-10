// src/components/VhsOverlay.jsx
//
// Puts the whole document behind tape. Fixed, pointer-events-none, and driven
// entirely by CSS animations — no JS runs per frame, so it costs nothing next to
// the scope's render loop.
//
// Sits above every other layer (including the license modal at z-9999) because
// the grain has to fall on modals too, or they read as pasted on top.

import React from 'react';

export default function VhsOverlay() {
  return (
    <div className="vhs-overlay" aria-hidden="true">
      <div className="vhs-grain" />
      <div className="vhs-chroma" />
      <div className="vhs-scanlines" />
      <div className="vhs-tracking" />
      <div className="vhs-vignette" />
    </div>
  );
}
