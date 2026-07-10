// src/hooks/useAudioAnalyser.js
//
// Exposes the analyser to the render loop as refs + stable callbacks.
// Nothing here calls setState — the rAF loop must never trigger a React render.

import { useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import {
  FFT_SIZE,
  getAudioGraph,
  installGlobalUnlock,
  resumeAudioGraph,
} from '@/lib/audioGraph';

// A tainted cross-origin source yields a flat 128 line forever. Detect it so the
// caller can fall back to a synthesized wave instead of showing a dead scope.
const SILENT_FRAMES_BEFORE_FALLBACK = 90; // ~1.5s at 60fps

export function useAudioAnalyser() {
  const { audioRef, isPlaying } = usePlayer();

  const analyserRef = useRef(null);
  const timeDataRef = useRef(new Uint8Array(FFT_SIZE));
  const freqDataRef = useRef(new Uint8Array(FFT_SIZE / 2));
  const ctxStateRef = useRef('suspended');

  const silentFramesRef = useRef(0);
  const isTaintedRef = useRef(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const graph = getAudioGraph(el); // singleton — safe under StrictMode
    if (!graph) return;

    analyserRef.current = graph.analyser;
    timeDataRef.current = new Uint8Array(graph.analyser.fftSize);
    freqDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);

    const syncState = () => {
      ctxStateRef.current = graph.ctx.state;
    };
    graph.ctx.addEventListener('statechange', syncState);
    syncState();

    const removeUnlock = installGlobalUnlock(el);

    return () => {
      graph.ctx.removeEventListener('statechange', syncState);
      removeUnlock();
    };
  }, [audioRef]);

  // Reset taint detection whenever the source changes.
  useEffect(() => {
    silentFramesRef.current = 0;
    isTaintedRef.current = false;
  }, [isPlaying]);

  const readTimeDomain = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = timeDataRef.current;
    if (!analyser) return buf;

    analyser.getByteTimeDomainData(buf);

    // Only judge silence while audio should be producing sound.
    if (audioRef.current && !audioRef.current.paused && ctxStateRef.current === 'running') {
      if (isFlatLine(buf)) {
        silentFramesRef.current += 1;
        if (silentFramesRef.current > SILENT_FRAMES_BEFORE_FALLBACK) {
          isTaintedRef.current = true;
          if (!warnedRef.current && process.env.NODE_ENV !== 'production') {
            warnedRef.current = true;
            console.warn(
              '[visualizer] The audio graph is emitting SILENCE — you will hear nothing.\n' +
                'This element is routed through a MediaElementAudioSourceNode, and the ' +
                'browser mutes cross-origin media it cannot CORS-verify. The current ' +
                'source is cross-origin.\n' +
                'Fix: play it through /api/audio-proxy (see lib/playbackUrl.js), or add ' +
                'an Access-Control-Allow-Origin rule to the bucket and set ' +
                'NEXT_PUBLIC_AUDIO_CORS=1.\n' +
                'The scope is now showing a synthesized waveform, not the real signal.'
            );
          }
        }
      } else {
        silentFramesRef.current = 0;
        isTaintedRef.current = false;
      }
    }

    return buf;
  }, [audioRef]);

  const readFrequency = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = freqDataRef.current;
    if (analyser) analyser.getByteFrequencyData(buf);
    return buf;
  }, []);

  const resume = useCallback(() => resumeAudioGraph(audioRef.current), [audioRef]);

  const isRunning = useCallback(() => ctxStateRef.current === 'running', []);
  const isTainted = useCallback(() => isTaintedRef.current, []);

  return { readTimeDomain, readFrequency, resume, isRunning, isTainted, analyserRef };
}

function isFlatLine(buf) {
  // Sparse scan: a real signal deviates from the 128 midpoint somewhere.
  for (let i = 0; i < buf.length; i += 16) {
    if (buf[i] !== 128) return false;
  }
  return true;
}
