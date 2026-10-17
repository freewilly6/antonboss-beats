// src/components/cd/JewelCase.jsx
//
// One clear CD case, built from primitives: a clear plastic tray framed in
// chrome rails, a disc printed edge to edge with the cover art, a hinged clear
// lid with liner notes on its inside face, and a black spine carrying the
// title. The art lives only on the disc — the case itself is plastic and
// chrome, so you see the disc through it.
// Dimensions follow a real case at 1 unit = 100 mm.
//
// The case doesn't place itself. CdShelf hands it a target pose every frame and
// it eases toward it, so selecting, opening and playing are all just new
// targets rather than hand-sequenced animations.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getCoverTexture, makeCanvasTexture, MONO } from './textures';

export const CASE_W = 1.42;
export const CASE_H = 1.25;
const CASE_D = 0.104;
const TRAY_D = 0.07;
const LID_D = 0.024;
const DISC_R = 0.58;
const DISC_X = 0.05; // the disc sits a little right of centre, clear of the hinge

// Nearly flat open, like a case laid open on a table.
const LID_OPEN = -Math.PI * 0.94;
const SPIN_SPEED = 4.2; // rad/s while the beat is playing

// Shared across every case — one program per material, not one per case.
const plastic = new THREE.MeshPhysicalMaterial({
  // Black body: with additive blending only the specular glints show, which
  // is all clear plastic really is to the eye.
  color: '#000000',
  metalness: 0,
  roughness: 0.03,
  clearcoatRoughness: 0.02,
  transparent: true,
  // Additive on colour only: the plastic adds its reflections and glints to
  // whatever is behind it and never dims it — alpha blending fogged the case
  // into a grey slab on the black page. Alpha is left untouched so the canvas
  // stays see-through there and the light lands on the page itself.
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
  // Tamed so cases seen side-on glint rather than flare white.
  specularIntensity: 0.45,
  clearcoat: 0.5,
  envMapIntensity: 0.7,
  depthWrite: false,
  side: THREE.DoubleSide,
});
// Brushed silver rather than a pure mirror: a mirror is only as bright as
// what it reflects, and on a black stage that's mostly nothing.
const chrome = new THREE.MeshPhysicalMaterial({
  color: '#dfe2e8',
  metalness: 0.55,
  roughness: 0.28,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});
const discFoil = new THREE.MeshPhysicalMaterial({
  color: '#d8d8d8',
  metalness: 1,
  roughness: 0.12,
  iridescence: 1,
  iridescenceIOR: 1.7,
  iridescenceThicknessRange: [120, 900],
  side: THREE.DoubleSide,
});
const spineMat = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.4 });

const discGeo = new THREE.CircleGeometry(DISC_R, 128);
const foilGeo = new THREE.RingGeometry(0.06, DISC_R, 128, 1);
const rimGeo = new THREE.RingGeometry(DISC_R - 0.006, DISC_R + 0.004, 128, 1);

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

// ── Chrome rails ────────────────────────────────────────────────────────────
// Every case has the same ~25 rail pieces. As separate meshes that's ~25 draw
// calls a case, ~275 for a full shelf. They never move relative to their
// slab, so they're baked into two shared geometries — tray and lid — and each
// case draws its rails in two calls.

/** An axis-aligned bar from (x1,y1) to (x2,y2) at depth z. */
function bar(x1, y1, x2, y2, z, t = 0.022, d = 0.022) {
  const g = new THREE.BoxGeometry(Math.abs(x2 - x1) || t, Math.abs(y2 - y1) || t, d);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, z);
  return g;
}

/** The outer rim of a slab, optionally with L-brackets in each corner. */
function frameBars(cx, z, brackets) {
  const x0 = cx - CASE_W / 2;
  const x1 = cx + CASE_W / 2;
  const y0 = -CASE_H / 2;
  const y1 = CASE_H / 2;
  const bars = [
    bar(x0, y0, x1, y0, z, 0.016),
    bar(x0, y1, x1, y1, z, 0.016),
    bar(x0, y0, x0, y1, z, 0.016),
    bar(x1, y0, x1, y1, z, 0.016),
  ];
  if (brackets) {
    const i = 0.09; // inset
    const L = 0.3; // arm length
    [
      [x0 + i, y1 - i, 1, -1],
      [x1 - i, y1 - i, -1, -1],
      [x0 + i, y0 + i, 1, 1],
      [x1 - i, y0 + i, -1, 1],
    ].forEach(([bx, by, sx, sy]) => {
      bars.push(bar(bx, by, bx + sx * L, by, z), bar(bx, by, bx, by + sy * L, z));
    });
  }
  return bars;
}

const TRAY_Z = -CASE_D / 2 + TRAY_D / 2;

function buildTrayRails() {
  const z = TRAY_Z + TRAY_D / 2 - 0.012;
  const lx = -CASE_W / 2 + 0.13;
  const parts = [
    ...frameBars(0, z, true),
    // Latch on the hinge side.
    bar(lx - 0.06, -0.15, lx + 0.06, -0.15, z, 0.014),
    bar(lx - 0.06, 0.15, lx + 0.06, 0.15, z, 0.014),
    bar(lx + 0.06, -0.15, lx + 0.06, 0.15, z, 0.014),
  ];
  // The four clips that hold the disc rim.
  [0.6, 2.55, 3.75, 5.7].forEach((a) => {
    const clip = new THREE.BoxGeometry(0.03, 0.012, 0.03);
    clip.rotateZ(a);
    clip.translate(DISC_X + Math.cos(a) * (DISC_R + 0.012), Math.sin(a) * (DISC_R + 0.012), 0.004);
    parts.push(clip);
  });
  return mergeGeometries(parts);
}

const trayRailGeo = buildTrayRails();
const lidRailGeo = mergeGeometries(frameBars(CASE_W / 2, 0, false));

// Slabs and spine, shared by every case.
const trayGeo = new THREE.BoxGeometry(CASE_W, CASE_H, TRAY_D);
const lidGeo = new THREE.BoxGeometry(CASE_W, CASE_H, LID_D);
const spinePlaneGeo = new THREE.PlaneGeometry(CASE_D, CASE_H);
const spineBoxGeo = new THREE.BoxGeometry(0.009, CASE_H, CASE_D);
const linerGeo = new THREE.PlaneGeometry(1.2, 1.16);

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

      // Spine text reads top-to-bottom, like a shelf of real CDs. Left-aligned
      // from the top edge, and shrunk until the whole title fits above the
      // artist credit — a long name must never run off the end.
      ctx.save();
      ctx.translate(w / 2, 16);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const title = beat.name.toUpperCase();
      const room = 330;
      let size = 24;
      do {
        ctx.font = `${size}px ${MONO}`;
      } while (ctx.measureText(title).width > room && --size > 11);
      ctx.fillStyle = '#fff';
      ctx.fillText(title, 0, 0, room);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `15px ${MONO}`;
      ctx.fillText('ANTON BOSS', 360, 0);
      ctx.restore();
    });
    return texture;
  }, [beat.name, index]);
}

// The inside of the lid — liner notes, seen once the case is open. One-sided
// and facing inward, so a closed case still shows the disc through the lid.
function useLinerTexture(beat, enabled) {
  return useMemo(() => {
    // Only the selected case can open, so only it needs its notes drawn.
    if (!enabled || typeof document === 'undefined') return null;
    const { texture } = makeCanvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#efece6';
      ctx.fillRect(0, 0, w, h);

      // Title shrinks to fit rather than being cut, same as the spine.
      const title = beat.name.toUpperCase();
      const room = w - 72;
      let size = 34;
      do {
        ctx.font = `bold ${size}px ${MONO}`;
      } while (ctx.measureText(title).width > room && --size > 14);
      ctx.fillStyle = '#111';
      ctx.fillText(title, 36, 80, room);
      ctx.font = `20px ${MONO}`;
      ctx.fillStyle = '#555';
      ctx.fillText(beat.artist || 'Anton Boss', 36, 116);

      const rows = [
        ['GENRE', beat.genre],
        ['MOOD', beat.mood],
        ['KEY', beat.key],
        ['BPM', beat.bpm],
      ].filter(([, v]) => v);
      ctx.font = `22px ${MONO}`;
      rows.forEach(([k, v], i) => {
        const y = 210 + i * 46;
        ctx.fillStyle = '#999';
        ctx.fillText(k, 36, y);
        ctx.fillStyle = '#111';
        ctx.fillText(String(v).toUpperCase(), 180, y, w - 216);
      });

      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(36, h - 70, 60, 6);
      ctx.fillStyle = '#999';
      ctx.font = `16px ${MONO}`;
      ctx.fillText('ANTONBOSS.BEATS', 36, h - 36);
    });
    return texture;
  }, [enabled, beat.name, beat.artist, beat.genre, beat.mood, beat.key, beat.bpm]);
}

// The disc face: cover art to the edge, then the hub drawn over it — a clear
// stacking ring, a dark clamping area with chrome rings and four holes, and a
// real hole through the middle (transparent, cut with alphaTest).
function drawDisc(ctx, w, h, image) {
  const c = w / 2;
  const R = w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    // Cover-fit the art into the disc.
    const s = Math.max(w / image.width, h / image.height);
    const iw = image.width * s;
    const ih = image.height * s;
    ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, w, h);
  }

  // A soft sweep of light across the print, so it reads as a glossy disc.
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const r = (f) => R * f;
  // Clear stacking ring around the hub.
  ctx.fillStyle = 'rgba(210,212,218,0.55)';
  ctx.beginPath();
  ctx.arc(c, c, r(0.34), 0, Math.PI * 2);
  ctx.fill();
  // Dark clamping area.
  ctx.fillStyle = '#1b1b1e';
  ctx.beginPath();
  ctx.arc(c, c, r(0.3), 0, Math.PI * 2);
  ctx.fill();
  // Chrome rings.
  ctx.strokeStyle = '#d9dbe0';
  ctx.lineWidth = r(0.012);
  [0.27, 0.2, 0.13].forEach((f) => {
    ctx.beginPath();
    ctx.arc(c, c, r(f), 0, Math.PI * 2);
    ctx.stroke();
  });
  // Four holes on the clamp.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * r(0.235), c + Math.sin(a) * r(0.235), r(0.026), 0, Math.PI * 2);
    ctx.stroke();
  }
  // The spindle hole.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(c, c, r(0.1), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function useDiscTexture(coverUrl) {
  // Created during the first render, never later: a material first drawn
  // without a map compiles a shader with no texture slot, and assigning one
  // afterwards doesn't recompile it, so the disc stays blank. The cover is
  // drawn into this same texture once it loads.
  const [canvas] = useState(() =>
    typeof document === 'undefined' ? null : makeCanvasTexture(512, 512, (ctx, w, h) => drawDisc(ctx, w, h, null))
  );

  useEffect(() => {
    if (!canvas) return;
    getCoverTexture(coverUrl, (cover) => {
      canvas.redraw((ctx, w, h) => drawDisc(ctx, w, h, cover.image));
    });
  }, [canvas, coverUrl]);

  useEffect(() => () => canvas?.texture.dispose(), [canvas]);

  return canvas?.texture ?? null;
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
  const [hovered, setHovered] = useState(false);

  const discMap = useDiscTexture(beat.cover);
  const spine = useSpineTexture(beat, index);
  const liner = useLinerTexture(beat, selected);

  // Starting pose, set once on mount: low and far back, so the case rises
  // into place the first time it's seen. Deliberately not a position prop —
  // R3F re-applies props on every re-render, which snapped every case back
  // to its start pose on each selection and replaced the sideways slide
  // between cases with a drop-and-rise. After mount, useFrame alone moves it.
  useLayoutEffect(() => {
    root.current.position.set(target.x, target.y - 0.7, target.z - 1.6);
    root.current.rotation.set(0.35, target.ry, 0);
    // Mount-only by design; later targets are eased to in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // The disc stays seated in the tray; it rises a hair off the spindle
    // while it plays, and spins.
    const d = disc.current;
    d.position.z = damp(d.position.z, spinning ? 0.03 : 0.012, 6, dt);
    if (spinning) d.rotation.z -= SPIN_SPEED * dt;
  });

  const half = CASE_W / 2;

  return (
    <group
      ref={root}
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
      {/* Tray: clear slab, then its rim, brackets, latch and disc clips */}
      <mesh position={[0, 0, TRAY_Z]} geometry={trayGeo} material={plastic} />
      <mesh geometry={trayRailGeo} material={chrome} />

      {/* Spine on the hinge edge, just proud of the chrome rails so they can't
          cover the title. */}
      <mesh position={[-half - 0.014, 0, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={spinePlaneGeo}>
        <meshStandardMaterial map={spine} roughness={0.4} />
      </mesh>
      <mesh position={[-half - 0.009, 0, 0]} geometry={spineBoxGeo} material={spineMat} />

      {/* Disc. The art is opaque, so it's drawn before the plastic and shows
          through the lid. The foil backs it, for the view from behind. */}
      <group ref={disc} position={[DISC_X, 0, 0.012]}>
        <mesh geometry={foilGeo} position={[0, 0, -0.003]} material={discFoil} />
        <mesh geometry={discGeo}>
          <meshPhysicalMaterial
            map={discMap}
            alphaTest={0.5}
            roughness={0.28}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh geometry={rimGeo} position={[0, 0, 0.001]} material={chrome} />
      </group>

      {/* Lid, pivoting on the hinge. Children are offset so x=0 is the hinge line. */}
      <group ref={lid} position={[-half, 0, CASE_D / 2 - LID_D / 2]}>
        <mesh position={[half, 0, 0]} geometry={lidGeo} material={plastic} />
        <mesh geometry={lidRailGeo} material={chrome} />
        {/* Liner notes on the inside face, turned to face the tray. */}
        {liner && (
          <mesh position={[half + 0.02, 0, -LID_D / 2 - 0.002]} rotation={[0, Math.PI, 0]} geometry={linerGeo}>
            <meshStandardMaterial map={liner} roughness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
}
