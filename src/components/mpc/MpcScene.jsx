// src/components/mpc/MpcScene.jsx
//
// A three.js MPC: grey chassis, backlit LCD, sixteen rubber pads that sink and
// glow when hit, a data wheel, transport keys. Client-only — import it with
// next/dynamic.
//
// The About section owns the sound and writes hits into `live` (a plain
// mutable object). The scene only reads it inside useFrame, so a drum roll
// never re-renders React.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PADS, PATTERN } from './drumKit';
import { makeCanvasTexture, MONO } from '../cd/textures';
import { sceneFadeStyle } from '@/hooks/useLazyScene';

const BODY_W = 3.4;
const BODY_D = 3.0;
const BODY_H = 0.32;
const TOP = BODY_H / 2;

const PAD = 0.38;
const GAP = 0.07;
const PADS_X = 0.38; // centre of the 4×4 block
const PADS_Z = 0.42;

const ACCENT = new THREE.Color('#ff2d95');
const PAD_IDLE = new THREE.Color('#2b2b2e');
const GLOW_MS = 260;

function padPosition(i) {
  const row = Math.floor(i / 4);
  const col = i % 4;
  const step = PAD + GAP;
  return [PADS_X + (col - 1.5) * step, TOP + 0.03, PADS_Z + (row - 1.5) * step];
}

function drawLcd(ctx, w, h, live) {
  ctx.fillStyle = '#a7b98a';
  ctx.fillRect(0, 0, w, h);
  // Faint pixel grid, the way an old LCD looks up close.
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  ctx.fillStyle = '#1d2614';
  ctx.font = `bold 30px ${MONO}`;
  ctx.fillText('AB-60', 20, 44);
  ctx.font = `22px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${live.bpm.toFixed(1)} BPM`, w - 20, 42);
  ctx.textAlign = 'left';

  ctx.fillRect(20, 60, w - 40, 2);

  ctx.font = `bold 52px ${MONO}`;
  ctx.fillText(live.lastLabel || 'READY', 20, 132);
  ctx.font = `22px ${MONO}`;
  ctx.fillText(live.lastPad ? `PAD ${live.lastPad}` : 'HIT A PAD', 20, 168);
  ctx.textAlign = 'right';
  ctx.fillText(live.playing ? '▶ SEQ 01' : '■ STOP', w - 20, 168);
  ctx.textAlign = 'left';

  // Step strip: sixteen cells, filled where the pattern has a hit, inverted
  // on the playhead.
  const cell = (w - 40) / 16;
  PATTERN.forEach((hits, s) => {
    const x = 20 + s * cell;
    const on = s === live.step && live.playing;
    ctx.strokeStyle = '#1d2614';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, 196, cell - 4, 34);
    if (on) {
      ctx.fillRect(x + 2, 196, cell - 4, 34);
    } else if (hits.length) {
      ctx.fillRect(x + cell / 2 - 4, 209, 8, 8);
    }
  });
}

function Lcd({ live }) {
  const { texture, redraw } = useMemo(
    () => makeCanvasTexture(512, 256, (ctx, w, h) => drawLcd(ctx, w, h, live)),
    [live]
  );
  const seen = useRef(-1);

  useFrame(() => {
    if (seen.current === live.version) return;
    seen.current = live.version;
    redraw();
  });

  return (
    <group position={[-0.86, TOP, -0.82]}>
      <RoundedBox args={[1.42, 0.06, 0.78]} radius={0.02} position={[0, 0.0, 0]}>
        <meshStandardMaterial color="#111" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.28, 0.64]} />
        <meshStandardMaterial map={texture} emissive="#c8e0a0" emissiveIntensity={0.22} emissiveMap={texture} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Pad({ index, live, onHit }) {
  const mesh = useRef();
  const mat = useRef();
  const [x, y, z] = padPosition(index);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const age = performance.now() - live.hits[index];
    const k = age < GLOW_MS ? 1 - age / GLOW_MS : 0;
    mesh.current.position.y = y - k * 0.035;
    color.copy(PAD_IDLE).lerp(ACCENT, k * 0.85);
    mat.current.color.copy(color);
    mat.current.emissiveIntensity = k * 1.6;
  });

  return (
    <RoundedBox
      ref={mesh}
      args={[PAD, 0.08, PAD]}
      radius={0.035}
      smoothness={3}
      position={[x, y, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onHit(index);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <meshStandardMaterial ref={mat} color={PAD_IDLE} emissive={ACCENT} emissiveIntensity={0} roughness={0.85} />
    </RoundedBox>
  );
}

function Knob({ position, r = 0.11, live, spin = false }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (spin && live.playing) ref.current.rotation.y -= dt * 0.8;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[r, r * 1.08, 0.1, 40]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[r * 0.6, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.12, 16]} />
        <meshBasicMaterial color="#ff2d95" />
      </mesh>
    </group>
  );
}

function SmallButton({ position, led, live, ledOn, onClick, color = '#3a3a3d', w = 0.24 }) {
  const ledMat = useRef();
  useFrame(() => {
    if (ledMat.current) ledMat.current.emissiveIntensity = ledOn?.(live) ? 2.5 : 0.05;
  });
  return (
    <group position={position}>
      <RoundedBox
        args={[w, 0.06, 0.14]}
        radius={0.02}
        position={[0, TOP + 0.03, 0]}
        onPointerDown={onClick && ((e) => { e.stopPropagation(); onClick(); })}
        onPointerOver={onClick && (() => (document.body.style.cursor = 'pointer'))}
        onPointerOut={onClick && (() => (document.body.style.cursor = ''))}
      >
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {led && (
        <mesh position={[0, TOP + 0.01, -0.12]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial ref={ledMat} color="#400" emissive={led} emissiveIntensity={0.05} />
        </mesh>
      )}
    </group>
  );
}

function PanelPrint() {
  const texture = useMemo(
    () =>
      makeCanvasTexture(1024, 900, (ctx, w, h) => {
        ctx.fillStyle = '#26262a';
        ctx.font = `bold 44px ${MONO}`;
        ctx.fillText('AB-60', 560, 70);
        ctx.font = `20px ${MONO}`;
        ctx.fillStyle = '#4a4a4f';
        ctx.fillText('MIDI PRODUCTION CENTER', 560, 104);
        ctx.fillStyle = '#ff2d95';
        ctx.fillRect(560, 120, 90, 6);

        // Labels under the transport keys and the data wheel. Canvas x/y map
        // straight onto world x/z across the top of the chassis.
        const at = (x, z) => [(x / BODY_W + 0.5) * w, (z / BODY_D + 0.5) * h];
        ctx.fillStyle = '#4a4a4f';
        ctx.font = `bold 16px ${MONO}`;
        ctx.textAlign = 'center';
        [['REC', -1.42], ['STOP', -1.12], ['PLAY', -0.82]].forEach(([label, x]) => {
          ctx.fillText(label, ...at(x, 1.36));
        });
        ctx.fillText('DATA', ...at(-0.55, 0.62));
      }).texture,
    []
  );
  return (
    <mesh position={[0, TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[BODY_W, BODY_D]} />
      <meshStandardMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Machine({ live, onHit, onTogglePlay, onStop }) {
  const group = useRef();
  const intro = useRef(0);
  const { viewport } = useThree();
  const scale = Math.min(1, viewport.width / 3.9);

  useFrame((state, dt) => {
    const g = group.current;
    const t = state.clock.elapsedTime;
    dt = Math.min(dt, 0.05);

    // Rise and settle into place the first time it's drawn.
    intro.current = THREE.MathUtils.damp(intro.current, 1, 2.6, dt);
    const away = 1 - intro.current;

    // Lean toward the pointer and float gently. The body stays still on the
    // beat; the pads and LCD carry the pattern.
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.25, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.12, 4, dt) + away * 0.6;
    g.position.y = Math.sin(t * 1.2) * 0.03 - away * 0.9;
  });

  const bodyMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#bdbab3', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.6 }),
    []
  );

  return (
    <group scale={scale}>
      <group ref={group}>
        <RoundedBox args={[BODY_W, BODY_H, BODY_D]} radius={0.1} smoothness={4} material={bodyMat} />
        {/* Darker sunken deck under the pads */}
        <RoundedBox args={[4 * (PAD + GAP) + 0.12, 0.02, 4 * (PAD + GAP) + 0.12]} radius={0.03} position={[PADS_X, TOP, PADS_Z]}>
          <meshStandardMaterial color="#18181a" roughness={0.7} />
        </RoundedBox>
        <PanelPrint />
        <Lcd live={live} />

        {PADS.map((p) => (
          <Pad key={p.index} index={p.index} live={live} onHit={onHit} />
        ))}

        {/* Data wheel and pots */}
        <Knob position={[-0.55, TOP, 0.25]} r={0.24} live={live} spin />
        <Knob position={[0.38, TOP, -1.0]} live={live} />
        <Knob position={[0.72, TOP, -1.0]} live={live} />
        <Knob position={[1.06, TOP, -1.0]} live={live} />
        <Knob position={[1.40, TOP, -1.0]} live={live} />

        {/* Function grid */}
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => (
            <SmallButton key={`${r}-${c}`} position={[-1.42 + c * 0.32, 0, -0.08 + r * 0.3]} live={live} />
          ))
        )}

        {/* Transport */}
        <SmallButton position={[-1.42, 0, 1.18]} led="#ff0000" live={live} ledOn={() => false} color="#5a1f2b" />
        <SmallButton position={[-1.12, 0, 1.18]} live={live} onClick={onStop} />
        <SmallButton
          position={[-0.82, 0, 1.18]}
          led="#ff2d95"
          live={live}
          ledOn={(l) => l.playing && l.step % 4 < 2}
          onClick={onTogglePlay}
          color="#ff2d95"
        />
      </group>
    </group>
  );
}

export default function MpcScene(props) {
  const wrap = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      props.onVisibleChange?.(entry.isIntersecting);
    }, { rootMargin: '100px 0px' });
    io.observe(el);
    return () => io.disconnect();
    // onVisibleChange is a stable setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} className="h-full w-full" style={sceneFadeStyle(ready)}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 4.1, 3.3], fov: 36 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, -0.2, 0.1);
          requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
        }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 2]} intensity={1.8} />
        <pointLight position={[0, 1.2, 2.4]} intensity={4} color="#ff2d95" distance={6} />
        <Environment resolution={128}>
          <Lightformer intensity={1.6} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
          <Lightformer intensity={1} color="#ff2d95" position={[0, 0, 4]} scale={[6, 1, 1]} />
        </Environment>
        <Machine {...props} />
      </Canvas>
    </div>
  );
}
