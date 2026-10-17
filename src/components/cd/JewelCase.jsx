// src/components/cd/JewelCase.jsx
//
// One CD jewel case, built from primitives: a clear back shell holding a black
// tray, a disc printed with the cover art, a hinged clear lid with the cover
// insert behind it, and a spine. Dimensions follow a real case (142 × 125 ×
// 10 mm) at 1 unit = 100 mm.
//
// The case doesn't place itself. CdShelf hands it a target pose every frame and
// it eases toward it, so selecting, opening and playing are all just new
// targets rather than hand-sequenced animations.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCoverTexture, makeCanvasTexture, MONO } from './textures';

export const CASE_W = 1.42;
export const CASE_H = 1.25;
const CASE_D = 0.104;
const LID_D = 0.02;
const DISC_R = 0.6;
const HOLE_R = 0.075;

const LID_OPEN = -2.55; // radians around the hinge; negative swings toward the camera
const SPIN_SPEED = 4.2; // rad/s while the beat is playing

// Shared across every case — one program per material, not one per case.
const plastic = new THREE.MeshPhysicalMaterial({
  color: '#ffffff',
  metalness: 0,
  roughness: 0.04,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const tray = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.55 });
const hinge = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.35, metalness: 0.2 });
const discFoil = new THREE.MeshPhysicalMaterial({
  color: '#d8d8d8',
  metalness: 1,
  roughness: 0.12,
  iridescence: 1,
  iridescenceIOR: 1.7,
  iridescenceThicknessRange: [120, 900],
  side: THREE.DoubleSide,
});

const ringGeo = new THREE.RingGeometry(HOLE_R, DISC_R, 96, 1);
const labelGeo = new THREE.RingGeometry(0.2, DISC_R - 0.025, 96, 1);
const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.018, 32);

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function useSpineTexture(beat, index) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const { texture } = makeCanvasTexture(64, 560, (ctx, w, h) => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(0, h - 52, w, 52);
      ctx.fillStyle = '#000';
      ctx.font = `bold 22px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, h - 18);

      // Spine text reads top-to-bottom, like a shelf of real CDs.
      ctx.save();
      ctx.translate(w / 2, 18);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `24px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(beat.name.toUpperCase().slice(0, 22), 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `16px ${MONO}`;
      ctx.fillText('ANTON BOSS', 400, 0);
      ctx.restore();
    });
    return texture;
  }, [beat.name, index]);
}

// The inside of the lid — what you see once the case is open. Liner notes.
function useLinerTexture(beat) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const { texture } = makeCanvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#efece6';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#111';
      ctx.font = `bold 34px ${MONO}`;
      ctx.fillText(beat.name.toUpperCase().slice(0, 18), 36, 80);
      ctx.font = `20px ${MONO}`;
      ctx.fillStyle = '#555';
      ctx.fillText(beat.artist || 'Anton Boss', 36, 116);

      const rows = [
        ['GENRE', beat.genre],
        ['KEY', beat.key],
        ['BPM', beat.bpm],
      ].filter(([, v]) => v);
      ctx.font = `22px ${MONO}`;
      rows.forEach(([k, v], i) => {
        const y = 210 + i * 46;
        ctx.fillStyle = '#999';
        ctx.fillText(k, 36, y);
        ctx.fillStyle = '#111';
        ctx.fillText(String(v).toUpperCase(), 180, y);
      });

      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(36, h - 70, 60, 6);
      ctx.fillStyle = '#999';
      ctx.font = `16px ${MONO}`;
      ctx.fillText('ANTONBOSS.BEATS', 36, h - 36);
    });
    return texture;
  }, [beat.name, beat.artist, beat.genre, beat.key, beat.bpm]);
}

export default function JewelCase({
  beat,
  index,
  target, // { x, y, z, ry, rx }
  open,
  spinning,
  selected,
  onClick,
}) {
  const root = useRef();
  const lid = useRef();
  const disc = useRef();
  const [, force] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Re-render once the cover finishes loading so the material picks it up.
  const cover = useMemo(() => getCoverTexture(beat.cover, () => force((n) => n + 1)), [beat.cover]);
  const spine = useSpineTexture(beat, index);
  const liner = useLinerTexture(beat);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    dt = Math.min(dt, 0.05);

    // Selected case leans toward the pointer; the rest hold their shelf angle.
    const tiltY = selected ? state.pointer.x * 0.35 : 0;
    const tiltX = selected ? -state.pointer.y * 0.2 : 0;
    const lift = hovered && !selected ? 0.08 : 0;

    g.position.x = damp(g.position.x, target.x, 6, dt);
    g.position.y = damp(g.position.y, target.y + lift, 6, dt);
    g.position.z = damp(g.position.z, target.z, 6, dt);
    g.rotation.y = damp(g.rotation.y, target.ry + tiltY, 6, dt);
    g.rotation.x = damp(g.rotation.x, (target.rx || 0) + tiltX, 6, dt);

    // Idle float on the selected case only, so the shelf reads as still.
    if (selected) g.position.y += Math.sin(state.clock.elapsedTime * 1.4) * 0.0015;

    lid.current.rotation.y = damp(lid.current.rotation.y, open ? LID_OPEN : 0, 5, dt);

    // The disc lifts out of the tray once the lid is mostly clear of it.
    const lidProgress = lid.current.rotation.y / LID_OPEN;
    const out = open && lidProgress > 0.45;
    const d = disc.current;
    d.position.z = damp(d.position.z, out ? 0.34 : CASE_D * 0.08, 5, dt);
    d.position.x = damp(d.position.x, out ? 0.22 : 0, 5, dt);
    d.rotation.y = damp(d.rotation.y, out ? -0.18 : 0, 5, dt);
    if (spinning) d.children[0].rotation.z -= SPIN_SPEED * dt;
  });

  const half = CASE_W / 2;

  return (
    <group
      ref={root}
      position={[target.x, target.y, target.z]}
      rotation={[0, target.ry, 0]}
      onClick={(e) => {
        // Ignore the click that ends a swipe.
        if (e.delta > 6) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Back shell + black tray */}
      <mesh position={[0, 0, -CASE_D / 2 + 0.03]} material={plastic}>
        <boxGeometry args={[CASE_W, CASE_H, 0.06]} />
      </mesh>
      <mesh position={[0.04, 0, -0.004]} material={tray}>
        <boxGeometry args={[CASE_W - 0.12, CASE_H - 0.04, 0.012]} />
      </mesh>
      <mesh position={[0.04, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={hinge} geometry={hubGeo} />

      {/* Spine on the hinge edge */}
      <mesh position={[-half - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[CASE_D, CASE_H]} />
        <meshStandardMaterial map={spine} roughness={0.4} />
      </mesh>
      <mesh position={[-half + 0.04, 0, 0]} material={hinge}>
        <boxGeometry args={[0.08, CASE_H, CASE_D * 0.9]} />
      </mesh>

      {/* Disc — the outer group slides out, the inner one spins. */}
      <group ref={disc} position={[0.04, 0, CASE_D * 0.08]}>
        <group>
          <mesh geometry={ringGeo} material={discFoil} />
          <mesh geometry={labelGeo} position={[0, 0, 0.002]}>
            <meshStandardMaterial map={cover} roughness={0.45} metalness={0.1} />
          </mesh>
        </group>
      </group>

      {/* Lid, pivoting on the hinge. Children are offset so x=0 is the hinge line. */}
      <group ref={lid} position={[-half, 0, CASE_D / 2 - LID_D / 2]}>
        <mesh position={[0.82, 0, -0.002]}>
          <planeGeometry args={[1.18, 1.18]} />
          <meshStandardMaterial map={cover} roughness={0.5} />
        </mesh>
        <mesh position={[0.82, 0, -0.004]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.18, 1.18]} />
          <meshStandardMaterial map={liner} roughness={0.8} />
        </mesh>
        <mesh position={[half, 0, 0]} material={plastic}>
          <boxGeometry args={[CASE_W, CASE_H, LID_D]} />
        </mesh>
        {/* Ribbed hinge strip on the lid */}
        <mesh position={[0.09, 0, 0]} material={hinge}>
          <boxGeometry args={[0.1, CASE_H, LID_D + 0.004]} />
        </mesh>
      </group>
    </group>
  );
}
