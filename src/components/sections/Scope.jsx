// src/components/sections/Scope.jsx

import React, { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import VisualizerCanvas from '@/visualizer/VisualizerCanvas';
import SourcePicker from '@/visualizer/SourcePicker';
import { makeDefaultConfig } from '@/visualizer/config';

// Pulls react-dropzone and the whole control surface. Nothing needs it until
// someone presses Customize.
const ControlPanel = dynamic(() => import('@/visualizer/ControlPanel'), { ssr: false });

export default function Scope() {
  // The one mutable object the render loop reads. Never state.
  const configRef = useRef(makeDefaultConfig());
  const [panelOpen, setPanelOpen] = useState(false);
  const [scopeOn, setScopeOn] = useState(true);

  // Remember what the trace was showing so switching it back on doesn't discard
  // a mode the visitor picked in the panel.
  const lastModeRef = useRef(configRef.current.scope.mode);

  const toggleScope = () => {
    const cfg = configRef.current.scope;
    if (cfg.mode === 'off') {
      cfg.mode = lastModeRef.current === 'off' ? 'both' : lastModeRef.current;
      setScopeOn(true);
    } else {
      lastModeRef.current = cfg.mode;
      cfg.mode = 'off';
      setScopeOn(false);
    }
  };

  // Called from inside the rAF loop on every detected kick. Advances the active
  // line by mutating the ref, so no render happens on the beat.
  const handleBeat = useCallback((beatCount) => {
    const text = configRef.current.text;
    if (!text.autoCycle || text.lines.length < 2) return;
    if (beatCount % text.cycleEveryBeats !== 0) return;
    text.activeIndex = (text.activeIndex + 1) % text.lines.length;
  }, []);

  // The tube is a screen, so it stays dark in light mode too (.theme-dark).
  return (
    <section id="scope" className="theme-dark relative min-h-screen w-full overflow-hidden">
      <VisualizerCanvas
        configRef={configRef}
        onBeat={handleBeat}
        className="absolute inset-0 h-full w-full"
      />

      {/* Everything below floats over the tube. */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between p-6 sm:p-10">
        {/* Controls sit top-left: the floating Menu button owns the top-right. */}
        <header className="pointer-events-auto flex items-start gap-6">
          <h1 className="sr-only">Anton Boss</h1>

          <div className="flex gap-2">
            <button
              onClick={toggleScope}
              aria-pressed={scopeOn}
              className={`ab-btn ${scopeOn ? 'ab-btn-active' : ''}`}
            >
              Scope {scopeOn ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className={`ab-btn ${panelOpen ? 'ab-btn-active' : ''}`}
            >
              {panelOpen ? 'Hide' : 'Customize'}
            </button>
          </div>
        </header>

        <div className="pointer-events-auto">
          <SourcePicker />
          <p className="ab-label-dim mt-6">Scroll ↓</p>
        </div>
      </div>

      {/* Rendered only when open: a mounted <ControlPanel open={false}> would
          still fetch its chunk. */}
      {panelOpen && (
        <ControlPanel
          configRef={configRef}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          // Keep the hero's Scope On/Off label honest when the panel changes mode.
          onScopeModeChange={(mode) => {
            if (mode !== 'off') lastModeRef.current = mode;
            setScopeOn(mode !== 'off');
          }}
        />
      )}
    </section>
  );
}
