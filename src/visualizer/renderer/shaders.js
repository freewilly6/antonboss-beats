// src/visualizer/renderer/shaders.js
//
// One fullscreen triangle, one fragment shader, the whole CRT stack.

// A single oversized triangle beats a quad: no diagonal seam, one less vertex,
// and the GPU clips the overhang for free.
export const VERT = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = pos;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uScene;     // this frame's 2D canvas
uniform sampler2D uPrev;      // last frame's output, for phosphor persistence
uniform vec2  uResolution;
uniform float uTime;

uniform float uGlow;
uniform float uPersistence;
uniform float uScanline;
uniform float uAberration;
uniform float uNoise;
uniform float uBarrel;
uniform float uVignette;
uniform float uGlitch;
uniform float uReducedMotion;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Bow the UVs outward from centre so the image bulges like real glass.
//
// The push sends the edges past the texture, which samples black — two bars down
// the left and right, wobbling as aberration and glitch shift them. Overscan
// pulls the result back by exactly the amount the edge midpoints expanded:
// at (1.0, 0.5) the offset from centre grows to 0.5 + 0.125*amount, so scaling
// by 1/(1 + 0.25*amount) lands it back on 0.5. Corners still overshoot, which is
// what gives the tube its rounded corners.
vec2 barrel(vec2 uv, float amount) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  vec2 bowed = uv + cc * dist * amount;
  return 0.5 + (bowed - 0.5) / (1.0 + 0.25 * amount);
}

// Cheap 9-tap bloom. Sampling the already-blurred persistence buffer would be
// cheaper still, but it smears; this stays crisp on the trace.
vec3 bloom(sampler2D tex, vec2 uv, vec2 texel, float radius) {
  vec3 sum = vec3(0.0);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      sum += texture(tex, uv + vec2(float(x), float(y)) * texel * radius).rgb;
    }
  }
  return sum / 9.0;
}

void main() {
  vec2 texel = 1.0 / uResolution;
  vec2 uv = barrel(vUv, uBarrel);

  // Outside the tube: black bezel, nothing else to compute.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Horizontal tear bands on transients.
  if (uGlitch > 0.01 && uReducedMotion < 0.5) {
    float band = floor(uv.y * 24.0);
    float roll = hash(vec2(band, floor(uTime * 20.0)));
    if (roll > 0.86) {
      uv.x += (roll - 0.93) * uGlitch * 0.35;
    }
  }

  // Chromatic aberration scales with distance from centre, as in a real lens.
  vec2 dir = uv - 0.5;
  float amt = uAberration * 0.006 * (1.0 + uGlitch * 3.0);
  vec3 col;
  col.r = texture(uScene, uv + dir * amt).r;
  col.g = texture(uScene, uv).g;
  col.b = texture(uScene, uv - dir * amt).b;

  // Bloom only the bright parts, so the background stays black.
  vec3 blurred = bloom(uScene, uv, texel, 2.5);
  float luma = dot(blurred, vec3(0.299, 0.587, 0.114));
  col += blurred * smoothstep(0.35, 1.0, luma) * uGlow;

  // Phosphor decay: mix in the previous frame wherever it was brighter.
  vec3 prev = texture(uPrev, vUv).rgb * uPersistence;
  col = max(col, prev);

  // Scanlines + aperture grille.
  float scan = sin(uv.y * uResolution.y * 1.55) * 0.5 + 0.5;
  col *= 1.0 - uScanline * scan * 0.35;
  float grille = sin(uv.x * uResolution.x * 3.14159) * 0.5 + 0.5;
  col *= 1.0 - uScanline * grille * 0.08;

  // Grain. Frozen when reduced-motion is on, so it reads as film rather than flicker.
  float t = mix(uTime, 0.0, uReducedMotion);
  col += (hash(uv * uResolution + t * 60.0) - 0.5) * uNoise * 0.28;

  float vig = 1.0 - uVignette * dot(dir, dir) * 1.5;
  col *= clamp(vig, 0.0, 1.0);

  outColor = vec4(col, 1.0);
}`;
