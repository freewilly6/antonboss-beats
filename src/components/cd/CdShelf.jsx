// src/components/cd/CdShelf.jsx
//
// The three.js scene behind the beat selector: a row of jewel cases, the
// selected one pulled forward and facing you, the rest angled away on either
// side like a coverflow shelf. Client-only — import it with next/dynamic.

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import JewelCase from './JewelCase';
import { sceneFadeStyle } from '@/hooks/useLazyScene';

// Only cases this close to the selection are mounted at all.
const WINDOW = 5;

const CAMERA_Z = 3.6;
const FOV = 35;
const TAN_HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);
// An open case is the lid laid flat beside the tray: two case widths wide.
const OPEN_W = 2 * 1.42;
const CASE_H = 1.25;

/**
 * How far from the camera the open case should sit so it's as big as it can
 * be while still fitting: ~80% of the canvas height, or ~94% of its width on
 * narrow screens where the width runs out first. A fixed depth left it under
 * half the height on a wide desktop shelf.
 */
function openDistance(aspect, scale) {
  const byHeight = (CASE_H * scale) / (0.8 * 2 * TAN_HALF_FOV);
  const byWidth = (OPEN_W * scale) / (0.94 * 2 * TAN_HALF_FOV * aspect);
  return Math.max(byHeight, byWidth);
}

function poseFor(offset, spread, open, narrow, openZ) {
  // Open, the lid folds out flat to the left. Slide the case right by half a
  // case so the open pair is centred, and bring it as close as fits.
  if (offset === 0) {
    return open
      ? { x: 0.71, y: -0.02, z: openZ, ry: 0, rx: 0 }
      : { x: 0, y: 0, z: 0.55, ry: 0, rx: 0 };
  }
  const side = Math.sign(offset);
  const n = Math.abs(offset);
  return {
    // Neighbours step well aside while a case is open, since it now comes
    // right up to the front — clean off screen when there isn't room.
    x: side * (1.0 + (n - 1) * 0.36 + (open ? (narrow ? 2.6 : 1.75) : 0)) * spread,
    y: 0,
    z: -0.35 - n * 0.06,
    ry: -side * 1.12,
    rx: 0,
  };
}

function Shelf({ beats, selected, open, playingId, onSelect, onToggleOpen }) {
  const { viewport, size } = useThree();
  // Squeeze the shelf on narrow screens so the neighbours still peek in.
  const spread = Math.min(1, Math.max(0.55, viewport.width / 5));
  const scale = Math.min(1, viewport.width / 1.9);
  const narrow = viewport.width < 3.2;
  // Positions live inside the scaled group, so convert the world depth back.
  const openZ = (CAMERA_Z - openDistance(size.width / size.height, scale)) / scale;

  return (
    <group scale={scale}>
      {beats.map((beat, i) => {
        const offset = i - selected;
        if (Math.abs(offset) > WINDOW) return null;
        return (
          <JewelCase
            key={beat.id}
            beat={beat}
            index={i}
            selected={offset === 0}
            target={poseFor(offset, spread, open, narrow, openZ)}
            open={offset === 0 && open}
            spinning={playingId === beat.id}
            onClick={() => (offset === 0 ? onToggleOpen() : onSelect(i))}
          />
        );
      })}
    </group>
  );
}

export default function CdShelf(props) {
  const wrap = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // Stop rendering entirely while the shelf is scrolled out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="h-full w-full" style={sceneFadeStyle(ready)}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        // 1.5× is indistinguishable from 2× on these soft, moving objects and
        // shades ~45% fewer pixels on a 3× phone screen.
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.12, CAMERA_Z], fov: FOV }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // Fade in after the first real frame, not on an empty canvas.
        onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))}
        onPointerMissed={() => props.onToggleOpen?.(false)}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
        <pointLight position={[-3, -1, 2]} intensity={6} color="#ff2d95" distance={8} />

        {/* Studio reflections for the plastic and the disc foil. Built from
            light panels in-scene, so no HDR file is downloaded. */}
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 3, 2]} scale={[6, 1, 1]} />
          {/* Side panels are thin strips: broad ones mirror whole in the angled
              cases' plastic and flare them white; strips leave a glint. */}
          <Lightformer intensity={1} position={[-4, 0, 1]} rotation-y={Math.PI / 2} scale={[0.35, 3, 1]} />
          <Lightformer intensity={1} position={[4, 0, 1]} rotation-y={-Math.PI / 2} scale={[0.35, 3, 1]} />
          <Lightformer intensity={1.5} color="#ff2d95" position={[0, -3, 1]} scale={[5, 1, 1]} />
        </Environment>

        <Shelf {...props} />
      </Canvas>
    </div>
  );
}
