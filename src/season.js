import * as THREE from 'three';
import { mulberry32 } from './helpers.js';

/**
 * Seasonal appearance driven by the real computer date (Northern Hemisphere):
 * spring (Mar–May), summer (Jun–Aug), autumn (Sep–Nov), winter (Dec–Feb).
 *
 * The palette only tints existing shared materials, so the whole island changes
 * season without rebuilding anything except the tree foliage colour.
 */
export const SEASONS = {
  spring: {
    key: 'spring',
    label: '春',
    grass: '#a9cf87',
    grassDark: '#8fbf6f',
    grassLight: '#c3e0a2',
    leaf: '#7fb35f',
    leafLight: '#9cc97f',
    particle: 'petal',
    particleColor: '#f6c9c4',
    particleSize: 4.0,
    particleSpeed: 0.8,
  },
  summer: {
    key: 'summer',
    label: '夏',
    grass: '#a8cf85',
    grassDark: '#8cbb6a',
    grassLight: '#c2e0a1',
    leaf: '#5c8a4a',
    leafLight: '#7aa862',
    particle: null,
    particleColor: '#ffffff',
    particleSize: 3.5,
    particleSpeed: 1.0,
  },
  autumn: {
    key: 'autumn',
    label: '秋',
    grass: '#b9c48a',
    grassDark: '#a2ae74',
    grassLight: '#cfd8a6',
    leaf: '#c98b4a',
    leafLight: '#bd8a55',
    particle: 'leaf',
    particleColor: '#c98b4a',
    particleSize: 3.6,
    particleSpeed: 1.1,
  },
  winter: {
    key: 'winter',
    label: '冬',
    grass: '#cdd8c9',
    grassDark: '#b3c2b3',
    grassLight: '#e2e9df',
    leaf: '#e8eee9',
    leafLight: '#dce6e0',
    particle: 'snow',
    particleColor: '#ffffff',
    particleSize: 3.2,
    particleSpeed: 0.55,
  },
};

export function getSeasonKey(date = new Date()) {
  const m = date.getMonth(); // 0 = January
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Tint the shared materials + the tree foliage for a season. */
export function applySeason(materials, environmentDetails, key) {
  const p = SEASONS[key] || SEASONS.summer;
  materials.grass.color.set(p.grass);
  materials.grassDark.color.set(p.grassDark);
  materials.grassLight.color.set(p.grassLight);
  materials.leaf.color.set(p.leaf);
  materials.leafLight.color.set(p.leafLight);
  if (environmentDetails && environmentDetails.setSeason) environmentDetails.setSeason(p);
  return p;
}

/**
 * Gentle falling seasonal particles: petals (spring), leaves (autumn) and light
 * snow (winter). One Points system, recoloured / re-sped per season.
 */
export function createSeasonParticles() {
  const N = 220;
  const rng = mulberry32(4242);
  const positions = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  const drift = new Float32Array(N);
  const phases = new Float32Array(N);
  const TOP = 24;
  const RADIUS = 20;

  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * RADIUS;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = rng() * TOP;
    positions[i * 3 + 2] = Math.sin(a) * r;
    speeds[i] = 0.7 + rng() * 0.7;
    drift[i] = 0.4 + rng() * 0.9;
    phases[i] = rng() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uVisibility: { value: 0 },
      uColor: { value: new THREE.Color('#f6c9c4') },
      uSize: { value: 4 },
    },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uVisibility;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(uSize * uPixelRatio * (50.0 / -mv.z), 10.0);
        gl_Position = projectionMatrix * mv;
        vA = uVisibility;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(uColor, a * vA * 0.85);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 4;
  points.frustumCulled = false;

  let speedMul = 1;
  let active = false;

  function setSeason(key) {
    const p = SEASONS[key] || SEASONS.summer;
    active = !!p.particle;
    speedMul = p.particleSpeed;
    mat.uniforms.uVisibility.value = active ? 1 : 0;
    mat.uniforms.uSize.value = p.particleSize;
    mat.uniforms.uColor.value.set(p.particleColor);
    points.visible = active;
  }

  function update(dt, elapsed) {
    if (!active) return;
    const p = positions;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] -= speeds[i] * speedMul * dt * 2.4;
      p[i * 3] += Math.sin(elapsed * 0.7 + phases[i]) * drift[i] * dt * 0.35;
      p[i * 3 + 2] += Math.cos(elapsed * 0.6 + phases[i] * 1.3) * drift[i] * dt * 0.35;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] += TOP;
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { root: points, setSeason, update, isActive: () => active };
}
