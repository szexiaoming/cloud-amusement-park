import * as THREE from 'three';
import { FIREFLIES, STARS, WORLD_SCALE } from './config.js';
import { PLAN } from './townPlan.js';
import { mulberry32 } from './helpers.js';

/**
 * Twinkling stars on the upper sky shell + gentle wandering fireflies.
 * Both are single THREE.Points systems with soft additive shaders — no
 * per-particle lights, so cost stays constant regardless of count.
 */

export function createStars({ reducedMotion }) {
  const n = STARS.count;
  const positions = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const rng = mulberry32(20251119);

  for (let i = 0; i < n; i++) {
    const theta = rng() * Math.PI * 2;
    const y = STARS.minY + rng() * (STARS.maxY - STARS.minY);
    const rr = Math.sqrt(Math.max(0, STARS.radius * STARS.radius - y * y));
    positions[i * 3] = Math.cos(theta) * rr;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * rr;
    phases[i] = rng() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uSize: { value: STARS.size },
      uTwinkleSpeed: { value: reducedMotion ? 0.15 : STARS.twinkleSpeed },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uVisibility;
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uTwinkleSpeed;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * uTwinkleSpeed + aPhase * 4.0);
        gl_PointSize = uSize * uPixelRatio * (130.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = tw * uVisibility;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0), a * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = -9;
  points.frustumCulled = false;

  return {
    root: points,
    update(elapsed, env) {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uVisibility.value = env.stars;
    },
  };
}

export function createFireflies({ count, reducedMotion }) {
  const n = count;
  const positions = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const wanders = new Float32Array(n);
  const sizes = new Float32Array(n);
  const rng = mulberry32(20251120);

  const benches = PLAN.squareProps.benches;
  const benchCount = benches.length * 3;
  for (let i = 0; i < n; i++) {
    let x;
    let z;
    if (i < benchCount) {
      const b = benches[i % benches.length];
      x = b[0] * WORLD_SCALE + (rng() - 0.5) * 2.6;
      z = b[1] * WORLD_SCALE + (rng() - 0.5) * 2.6;
    } else {
      const a = rng() * Math.PI * 2;
      const r = (3.5 + rng() * 8) * WORLD_SCALE; // keep the central view uncluttered
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = FIREFLIES.minY + rng() * (FIREFLIES.maxY - FIREFLIES.minY);
    positions[i * 3 + 2] = z;
    phases[i] = rng() * Math.PI * 2;
    wanders[i] = rng() * Math.PI * 2;
    sizes[i] = 0.7 + rng() * 0.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aWander', new THREE.BufferAttribute(wanders, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uWanderAmt: { value: reducedMotion ? 0 : 1 },
      uSize: { value: FIREFLIES.size },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aWander;
      attribute float aSize;
      uniform float uTime;
      uniform float uVisibility;
      uniform float uPixelRatio;
      uniform float uWanderAmt;
      uniform float uSize;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.4 + aWander) * 0.6 * uWanderAmt;
        pos.z += cos(uTime * 0.33 + aWander * 1.7) * 0.6 * uWanderAmt;
        pos.y += sin(uTime * 0.5 + aPhase) * 0.22 * uWanderAmt;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float pulse = 0.55 + 0.45 * sin(uTime * ${FIREFLIES.pulseSpeed.toFixed(2)} + aPhase);
        gl_PointSize = aSize * uPixelRatio * (uSize / -mv.z) * (0.6 + 0.4 * pulse);
        gl_Position = projectionMatrix * mv;
        vAlpha = pulse * uVisibility;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.05, d);
        a = pow(a, 1.5);
        vec3 col = vec3(${FIREFLIES.color[0]}, ${FIREFLIES.color[1]}, ${FIREFLIES.color[2]});
        gl_FragColor = vec4(col * a, a * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 5;
  points.frustumCulled = false;

  return {
    root: points,
    update(elapsed, env) {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uVisibility.value = env.fireflies;
    },
  };
}
