// src/visualizer/renderer/glPost.js
//
// The GL half of the renderer. Takes the 2D canvas as a texture, runs the CRT
// fragment shader into a framebuffer, then blits that to the screen. The
// framebuffer it just wrote becomes next frame's `uPrev`, which is what makes
// phosphor persistence a real feedback loop rather than an alpha-fade trick.

import { FRAG, VERT } from './shaders';

const COPY_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
void main() { outColor = texture(uTex, vUv); }`;

export function createGLPost(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const crtProgram = buildProgram(gl, VERT, FRAG);
  const copyProgram = buildProgram(gl, VERT, COPY_FRAG);
  if (!crtProgram || !copyProgram) return null;

  // WebGL2 requires a bound VAO even when the vertex shader reads no attributes.
  const vao = gl.createVertexArray();

  const sceneTex = createTexture(gl);
  let width = 0;
  let height = 0;

  let targets = [createRenderTarget(gl), createRenderTarget(gl)];
  let readIndex = 0;

  const uniforms = cacheUniforms(gl, crtProgram, [
    'uScene', 'uPrev', 'uResolution', 'uTime', 'uGlow', 'uPersistence',
    'uScanline', 'uAberration', 'uNoise', 'uBarrel', 'uVignette',
    'uGlitch', 'uReducedMotion',
  ]);
  const copyTexLoc = gl.getUniformLocation(copyProgram, 'uTex');

  function resize(w, h) {
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    for (const t of targets) resizeRenderTarget(gl, t, w, h);
  }

  function render(sceneCanvas, params) {
    // `persistence` arrives already normalized to elapsed time by the caller —
    // a raw per-frame factor would make the phosphor trail last longer on a slow
    // GPU than a fast one.
    const { crt, persistence, glitchAmount, timeSec, reducedMotion } = params;

    gl.bindVertexArray(vao);

    // Upload this frame's 2D canvas.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);

    const prev = targets[readIndex];
    const write = targets[1 - readIndex];

    // Pass 1: CRT stack into the write target.
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo);
    gl.viewport(0, 0, width, height);
    gl.useProgram(crtProgram);

    gl.uniform1i(uniforms.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, prev.tex);
    gl.uniform1i(uniforms.uPrev, 1);

    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uTime, timeSec);
    gl.uniform1f(uniforms.uGlow, crt.glow);
    gl.uniform1f(uniforms.uPersistence, reducedMotion ? 0 : persistence);
    gl.uniform1f(uniforms.uScanline, crt.scanline);
    gl.uniform1f(uniforms.uAberration, crt.aberration);
    gl.uniform1f(uniforms.uNoise, crt.noise);
    gl.uniform1f(uniforms.uBarrel, crt.barrel);
    gl.uniform1f(uniforms.uVignette, crt.vignette);
    gl.uniform1f(uniforms.uGlitch, reducedMotion ? 0 : glitchAmount);
    gl.uniform1f(uniforms.uReducedMotion, reducedMotion ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 2: blit to the screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(copyProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, write.tex);
    gl.uniform1i(copyTexLoc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    readIndex = 1 - readIndex;
  }

  function dispose() {
    for (const t of targets) {
      gl.deleteFramebuffer(t.fbo);
      gl.deleteTexture(t.tex);
    }
    targets = [];
    gl.deleteTexture(sceneTex);
    gl.deleteProgram(crtProgram);
    gl.deleteProgram(copyProgram);
    gl.deleteVertexArray(vao);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  return { resize, render, dispose, gl };
}

function buildProgram(gl, vertSrc, fragSrc) {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  // Flagged for deletion; freed once detached with the program.
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[glPost] link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[glPost] compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function createRenderTarget(gl) {
  const tex = createTexture(gl);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo };
}

function resizeRenderTarget(gl, target, w, h) {
  gl.bindTexture(gl.TEXTURE_2D, target.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
}

function cacheUniforms(gl, program, names) {
  const out = {};
  for (const n of names) out[n] = gl.getUniformLocation(program, n);
  return out;
}
