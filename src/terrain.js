import * as THREE from 'three';
import { PLAN } from './townPlan.js';
import { DISTRICTS } from './districts.js';

/**
 * World-space terrain from the authored outline. Flat local pads at each
 * destination / ride / square elevation are blended into low rolling grassland.
 * The thickness lives below the surface (no raised rim, no bowl wall).
 */
const B = PLAN.island.boundaryXZ;
const CX = B.reduce((s, p) => s + p[0], 0) / B.length;
const CZ = B.reduce((s, p) => s + p[1], 0) / B.length;

const POLY = B.map(([x, z]) => {
  const dx = x - CX;
  const dz = z - CZ;
  return { a: Math.atan2(dz, dx), r: Math.hypot(dx, dz) };
}).sort((p, q) => p.a - q.a);

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function radiusAt(a) {
  let aa = a;
  while (aa < POLY[0].a) aa += Math.PI * 2;
  while (aa > POLY[0].a + Math.PI * 2) aa -= Math.PI * 2;
  for (let i = 0; i < POLY.length; i++) {
    const p0 = POLY[i];
    const p1 = POLY[(i + 1) % POLY.length];
    const a1 = i === POLY.length - 1 ? p1.a + Math.PI * 2 : p1.a;
    if (aa >= p0.a && aa <= a1) {
      const t = (a1 - p0.a) > 1e-6 ? (aa - p0.a) / (a1 - p0.a) : 0;
      return p0.r + (p1.r - p0.r) * t;
    }
  }
  return POLY[0].r;
}

/** z of the railway centerline at a given x (used to flatten the rail bed). */
export function railZAt(x) {
  const pts = PLAN.railway.centerlineXZ;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) {
      const t = x1 - x0 === 0 ? 0 : (x - x0) / (x1 - x0);
      return z0 + (z1 - z0) * t;
    }
  }
  return pts[0][1];
}

export function railDistZ(x, z) {
  return Math.abs(z - railZAt(x));
}

function blend(h, target, w) {
  return h * (1 - w) + target * w;
}

export function terrainHeight(x, z) {
  let h = 0.55 + 0.26 * Math.sin(x * 0.075 + 0.6) * Math.cos(z * 0.08 - 0.5);

  // rail bed
  const dz = railDistZ(x, z);
  const cw = 1 - smoothstep(PLAN.railway.reservedHalfWidth, PLAN.railway.reservedHalfWidth + 1.4, dz);
  h = blend(h, PLAN.railway.terrainUnderTrackY, cw);

  // destination pads
  for (const d of DISTRICTS) {
    const r = Math.hypot(x - d.centerXZ[0], z - d.centerXZ[1]);
    const padR = Math.max(d.envelopeXZ[0], d.envelopeXZ[1]) * 0.5 + 0.9;
    h = blend(h, d.padY, 1 - smoothstep(padR, padR + 2, r));
  }
  // ride pads
  for (const a of PLAN.attractions) {
    const r = Math.hypot(x - a.centerXZ[0], z - a.centerXZ[1]);
    const padR = Math.max(a.envelopeXZ[0], a.envelopeXZ[1]) * 0.5 + 0.9;
    h = blend(h, a.padY, 1 - smoothstep(padR, padR + 2, r));
  }
  // square
  {
    const r = Math.hypot(x - PLAN.square.centerXZ[0], z - PLAN.square.centerXZ[1]);
    h = blend(h, PLAN.square.padY, 1 - smoothstep(PLAN.square.radius, PLAN.square.radius + 2, r));
  }
  return Math.max(0, Math.min(1.2, h));
}

export function createTerrain(materials) {
  const root = new THREE.Group();
  const surface = makeSurface(materials);
  root.userData.surfaceMat = surface.material;
  root.add(surface);
  root.add(makeSkirt(materials));
  return root;
}

function makeSurface(materials) {
  const N = 144;
  const M = 30;
  const positions = [];
  const colors = [];
  const indices = [];

  const h0 = terrainHeight(CX, CZ);
  positions.push(CX, h0, CZ);
  colors.push(1, 1, 1);

  for (let j = 1; j <= M; j++) {
    const u = j / M;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = radiusAt(a) * u;
      const x = CX + Math.cos(a) * r;
      const z = CZ + Math.sin(a) * r;
      const y = terrainHeight(x, z);
      positions.push(x, y, z);
      const tint = 0.88 + 0.12 * Math.max(0, Math.min(1, y));
      colors.push(tint, tint, tint);
    }
  }

  for (let i = 0; i < N; i++) indices.push(0, 1 + ((i + 1) % N), 1 + i);
  for (let j = 1; j < M; j++) {
    const a0 = 1 + (j - 1) * N;
    const b0 = 1 + j * N;
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      indices.push(a0 + i, b0 + i2, b0 + i);
      indices.push(a0 + i, a0 + i2, b0 + i2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = materials.grass.clone();
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function makeSkirt(materials) {
  const N = 144;
  const ring = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = radiusAt(a);
    const x = CX + Math.cos(a) * r;
    const z = CZ + Math.sin(a) * r;
    ring.push({ x, z, y: terrainHeight(x, z) });
  }

  const layers = [
    { s: 1.0, dy: 0, mat: materials.grassDark },
    { s: 0.995, dy: -PLAN.island.edgeThickness, mat: materials.grassDark },
    { s: 0.9, y: -3.4, mat: materials.soil },
    { s: 0.72, y: -4.6, mat: materials.rock },
    { s: 0.5, y: -5.7, mat: materials.rockDark },
    { s: 0.26, y: -6.5, mat: materials.rock },
  ];

  const root = new THREE.Group();
  const ringY = (i, layer) => (layer.y !== undefined ? layer.y : ring[i].y + layer.dy);

  for (let j = 0; j < layers.length - 1; j++) {
    const up = layers[j];
    const lo = layers[j + 1];
    const pos = [];
    for (let i = 0; i < N; i++) pos.push(ring[i].x * up.s + CX * (1 - up.s), ringY(i, up), ring[i].z * up.s + CZ * (1 - up.s));
    for (let i = 0; i < N; i++) pos.push(ring[i].x * lo.s + CX * (1 - lo.s), ringY(i, lo), ring[i].z * lo.s + CZ * (1 - lo.s));
    const idx = [];
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      idx.push(i, i2, N + i, i2, N + i2, N + i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, up.mat);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // bottom cap
  const last = layers[layers.length - 1];
  const capPos = [CX, PLAN.island.undersideMinY, CZ];
  for (let i = 0; i < N; i++) {
    capPos.push(ring[i].x * last.s + CX * (1 - last.s), last.y, ring[i].z * last.s + CZ * (1 - last.s));
  }
  const capIdx = [];
  for (let i = 0; i < N; i++) capIdx.push(0, 1 + i, 1 + ((i + 1) % N));
  const capGeo = new THREE.BufferGeometry();
  capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
  capGeo.setIndex(capIdx);
  capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, materials.rockDeep);
  cap.receiveShadow = true;
  root.add(cap);

  return root;
}
