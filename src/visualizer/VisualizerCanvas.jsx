// src/visualizer/VisualizerCanvas.jsx
//
// Owns the one rAF loop. Reads `configRef.current` each frame and never reads
// React state, so nothing the control panel does can cause this to re-render.

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { createBeatDetector, synthesizeSpectrum, synthesizeWave } from '@/lib/beatDetector';
import { drawScene } from './renderer/scene2d';
import { createGLPost } from './renderer/glPost';
import {
  maxDevicePixelRatio,
  prefersReducedMotion,
  watchReducedMotion,
} from './renderer/capabilities';

const SLOW_FRAME_MS = 22; // sustained frames over this budget trigger a downscale

function VisualizerCanvas({ configRef, onBeat, className }) {
  const glCanvasRef = useRef(null);
  const sceneCanvasRef = useRef(null);
  const wrapRef = useRef(null);

  const { readTimeDomain, readFrequency, isTainted } = useAudioAnalyser();
  const { audioRef, currentBeat } = usePlayer();

  // Per-frame mutable state. Deliberately refs — touching setState here would
  // re-render the tree 60 times a second.
  const glitchRef = useRef(0);
  const bassEnvRef = useRef(0);
  const beatCountRef = useRef(0);
  const dprRef = useRef(1);
  const slowFramesRef = useRef(0);
  const beatRef = useRef(currentBeat);
  beatRef.current = currentBeat;

  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const wrap = wrapRef.current;
    if (!glCanvas || !wrap) return;

    const sceneCanvas = document.createElement('canvas');
    sceneCanvasRef.current = sceneCanvas;
    const ctx2d = sceneCanvas.getContext('2d', { alpha: false });

    // createGLPost returns null when WebGL2 is unavailable or the shaders fail
    // to link, so probing first with supportsWebGL2() only bought us a second
    // throwaway GL context — real cost, no information.
    const post = createGLPost(glCanvas);
    const fallbackCtx = post ? null : glCanvas.getContext('2d', { alpha: false });

    configRef.current.perf.reducedMotion = prefersReducedMotion();
    const stopWatchingMotion = watchReducedMotion((reduced) => {
      configRef.current.perf.reducedMotion = reduced;
    });

    dprRef.current = maxDevicePixelRatio();

    const synthTime = new Uint8Array(2048);
    const synthFreq = new Uint8Array(1024);
    const detect = createBeatDetector();

    let rafId = null;
    let running = false;
    let lastFrameMs = 0;
    let lastGlitchMs = 0;

    const sizeCanvases = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(2, Math.round(rect.width * dprRef.current));
      const h = Math.max(2, Math.round(rect.height * dprRef.current));
      if (sceneCanvas.width !== w || sceneCanvas.height !== h) {
        sceneCanvas.width = w;
        sceneCanvas.height = h;
      }
      if (post) post.resize(w, h);
      else if (glCanvas.width !== w || glCanvas.height !== h) {
        glCanvas.width = w;
        glCanvas.height = h;
      }
    };
    sizeCanvases();

    const ro = new ResizeObserver(sizeCanvases);
    ro.observe(wrap);

    const frame = (nowMs) => {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) return;

      const config = configRef.current;
      const reduced = config.perf.reducedMotion;

      // Adaptive resolution: if we're consistently missing budget, drop DPR
      // before the page starts visibly stuttering.
      let frameDtSec = 1 / 60;
      if (lastFrameMs) {
        const delta = nowMs - lastFrameMs;
        frameDtSec = Math.min(1 / 15, Math.max(1 / 240, delta / 1000));

        if (delta > SLOW_FRAME_MS) slowFramesRef.current++;
        else slowFramesRef.current = Math.max(0, slowFramesRef.current - 1);

        if (slowFramesRef.current > 45 && dprRef.current > 0.75) {
          dprRef.current = Math.max(0.75, dprRef.current - 0.25);
          slowFramesRef.current = 0;
          sizeCanvases();
        }
      }
      lastFrameMs = nowMs;

      const audio = audioRef.current;
      const timeSec = nowMs / 1000;

      let timeData;
      let freqData;

      if (isTainted()) {
        // Cross-origin audio the browser won't let us sample. Keep it alive with
        // a wave driven by the track's own clock and tempo.
        const bpm = Number(beatRef.current?.bpm) || 120;
        const pos = audio?.currentTime ?? timeSec;
        timeData = synthesizeWave(synthTime, pos, bpm);
        freqData = synthesizeSpectrum(synthFreq, pos, bpm);
      } else {
        timeData = readTimeDomain();
        freqData = readFrequency();
      }

      const playing = audio && !audio.paused;
      const beat = playing
        ? detect(freqData, nowMs, config.beat)
        : { hit: false, energy: 0 };

      if (beat.hit && config.glitch.onBeat && !reduced) {
        glitchRef.current = config.glitch.intensity;
        lastGlitchMs = nowMs;
        beatCountRef.current++;
        onBeatRef.current?.(beatCountRef.current);
      }

      // Exponential decay to zero over `decayMs`.
      if (glitchRef.current > 0) {
        const elapsed = nowMs - lastGlitchMs;
        glitchRef.current = elapsed >= config.glitch.decayMs
          ? 0
          : config.glitch.intensity * (1 - elapsed / config.glitch.decayMs) ** 2;
      }

      // Raw low-band energy jitters frame to frame, which makes text twitch
      // rather than breathe. Snap up to a transient, ease back down — the same
      // shape a compressor's envelope follower has.
      const target = playing ? Math.min(1, beat.energy / 190) : 0;
      const env = bassEnvRef.current;
      bassEnvRef.current = target > env
        ? env + (target - env) * 0.55   // attack
        : env + (target - env) * 0.07;  // release

      drawScene(ctx2d, {
        config,
        timeData,
        freqData,
        beatEnergy: beat.energy,
        bassEnv: reduced ? 0 : bassEnvRef.current,
        glitchAmount: glitchRef.current,
        timeSec,
      });

      if (post) {
        // The shader multiplies the previous frame by this each pass, so a raw
        // config value would decay per *frame*: a 30fps machine would hold the
        // phosphor trail twice as long as a 60fps one, and a 144Hz display would
        // barely show it. Re-base the factor onto elapsed time at 60fps.
        const persistence = Math.pow(config.crt.persistence, frameDtSec * 60);

        post.render(sceneCanvas, {
          crt: config.crt,
          persistence,
          glitchAmount: glitchRef.current,
          timeSec,
          reducedMotion: reduced,
        });
      } else if (fallbackCtx) {
        fallbackCtx.drawImage(sceneCanvas, 0, 0);
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastFrameMs = 0;
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    // Don't burn GPU on a scope nobody can see.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!configRef.current.perf.pauseOffscreen) return start();
        entry.isIntersecting ? start() : stop();
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stopWatchingMotion();
      post?.dispose();
    };
  }, [configRef, audioRef, readTimeDomain, readFrequency, isTainted]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={glCanvasRef} className="h-full w-full block" aria-hidden="true" />
    </div>
  );
}

// Receives only refs and stable callbacks, so panel keystrokes never reach it.
export default React.memo(VisualizerCanvas);
