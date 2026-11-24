import * as THREE from 'three';
import { roundedBox, makeTextTexture, mulberry32 } from './helpers.js';

/**
 * Entrance islet: a small domed floating island with a jittered outline,
 * layered underside, welcome sign, stone path, lantern, bench, dock and a few
 * plants. The avatar spawns under the sign.
 */
export const ENTRANCE = { x: 0, z: 48, r: 9.4, y: 0.35, dome: 0.85 };

/** Solid props on the islet, shared with the navigation grid. */
export const ENTRANCE_SOLIDS = [
  // bench: oriented box (hx = depth along the facing, hz = length across it)
  { x: ENTRANCE.x - 3.4, z: ENTRANCE.z + 0.6, hx: 0.34, hz: 1.2, yaw: 0.5 },
  { x: ENTRANCE.x, z: ENTRANCE.z - 2.2, hx: 0.72, hz: 0.72 },
  { x: ENTRANCE.x + 3.1, z: ENTRANCE.z + 1.4, hx: 0.45, hz: 0.45 },
  { x: ENTRANCE.x - 4.6, z: ENTRANCE.z - 2.6, hx: 0.5, hz: 0.5 },
  { x: ENTRANCE.x + 4.9, z: ENTRANCE.z - 2.2, hx: 0.5, hz: 0.5 },
  { x: ENTRANCE.x - 3.9, z: ENTRANCE.z + 3.6, hx: 0.4, hz: 0.4 },
  { x: ENTRANCE.x + 5.6, z: ENTRANCE.z + 2.8, hx: 0.5, hz: 0.5 },
  { x: ENTRANCE.x + 1.9, z: ENTRANCE.z - 4.9, hx: 0.4, hz: 0.4 },
];

export function entranceHeight(x, z) {
  const d = Math.hypot(x - ENTRANCE.x, z - ENTRANCE.z);
  if (d > ENTRANCE.r * 1.08) return null;
  const u = Math.min(1, d / ENTRANCE.r);
  return ENTRANCE.y + ENTRANCE.dome * (1 - u * u);
}

export function createEntrance(materials) {
  const root = new THREE.Group();
  const { x: CX, z: CZ, r: R, y: H0, dome } = ENTRANCE;
  const rng = mulberry32(2027);

  // ---------- grass top (domed, jittered outline) ----------
  const N = 72;
  const M = 8;
  const pos = [];
  const idx = [];
  const wobble = (a) => 1 + 0.035 * Math.sin(a * 3 + 0.7) + 0.02 * Math.sin(a * 5 + 2.1);

  pos.push(CX, H0 + dome, CZ);
  for (let j = 1; j <= M; j++) {
    const u = j / M;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = R * u * wobble(a);
      pos.push(CX + Math.cos(a) * r, H0 + dome * (1 - u * u), CZ + Math.sin(a) * r);
    }
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  for (let j = 1; j < M; j++) {
    const a0 = 1 + (j - 1) * N;
    const b0 = 1 + j * N;
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      idx.push(a0 + i, b0 + i2, b0 + i);
      idx.push(a0 + i, a0 + i2, b0 + i2);
    }
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  topGeo.setIndex(idx);
  topGeo.computeVertexNormals();
  const top = new THREE.Mesh(topGeo, materials.grass);
  top.receiveShadow = true;
  root.add(top);

  // ---------- layered skirt + underside ----------
  const rim = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = R * wobble(a);
    rim.push([CX + Math.cos(a) * r, CZ + Math.sin(a) * r]);
  }
  const layers = [
    { s: 0.995, y: H0 - 0.55, mat: materials.grassDark },
    { s: 0.94, y: H0 - 1.7, mat: materials.soil },
    { s: 0.78, y: H0 - 3.2, mat: materials.rock },
    { s: 0.55, y: H0 - 4.6, mat: materials.rockDark },
    { s: 0.28, y: H0 - 5.7, mat: materials.rock },
  ];
  for (let j = 0; j < layers.length; j++) {
    const lo = layers[j];
    const upS = j === 0 ? 1 : layers[j - 1].s;
    const upY = j === 0 ? H0 + dome * 0.0 : layers[j - 1].y;
    const p = [];
    for (let i = 0; i < N; i++) {
      p.push(CX + (rim[i][0] - CX) * upS, upY, CZ + (rim[i][1] - CZ) * upS);
    }
    for (let i = 0; i < N; i++) {
      p.push(CX + (rim[i][0] - CX) * lo.s, lo.y, CZ + (rim[i][1] - CZ) * lo.s);
    }
    const ii = [];
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      ii.push(i, i2, N + i, i2, N + i2, N + i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ii);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, lo.mat);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  // bottom cap
  {
    const last = layers[layers.length - 1];
    const p = [CX, last.y - 1.1, CZ];
    for (let i = 0; i < N; i++) p.push(CX + (rim[i][0] - CX) * last.s, last.y, CZ + (rim[i][1] - CZ) * last.s);
    const ii = [];
    for (let i = 0; i < N; i++) ii.push(0, 1 + i, 1 + ((i + 1) % N));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ii);
    g.computeVertexNormals();
    root.add(new THREE.Mesh(g, materials.rockDeep));
  }

  // ---------- stone path: spawn -> sign -> dock ----------
  const pathPts = [
    [CX, CZ - 3.4],
    [CX, CZ - 1.0],
    [CX, CZ + 1.6],
    [CX, CZ + 4.2],
    [CX, CZ + 6.4],
  ];
  const discs = [];
  const disc = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 14);
  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i];
    const b = pathPts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6));
    for (let s = 0; s <= n; s++) {
      const px = a[0] + (b[0] - a[0]) * (s / n);
      const pz = a[1] + (b[1] - a[1]) * (s / n);
      const d = disc.clone();
      d.applyMatrix4(new THREE.Matrix4().makeTranslation(px, entranceHeight(px, pz) + 0.05, pz));
      discs.push(d);
    }
  }
  root.add(new THREE.Mesh(mergeAll(discs), materials.path));

  // ---------- welcome sign (taller, reads clearly from the start view) ----------
  const sy = entranceHeight(CX, CZ - 2.2) ?? H0;
  const signTex = makeTextTexture('Sze的小世界', {
    width: 512,
    height: 140,
    bg: '#f6e7cd',
    fg: '#5c4331',
    border: '#c9b48f',
  });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 1.3),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9, metalness: 0 }),
  );
  sign.position.set(CX, sy + 2.15, CZ - 2.2);
  root.add(sign);
  for (const s of [-1.95, 1.95]) {
    const post = roundedBox(0.14, 2.4, 0.14, 0.03, materials.timber);
    post.position.set(CX + s, sy + 1.2, CZ - 2.2);
    root.add(post);
  }

  // ---------- lantern + bench ----------
  const lanternY = entranceHeight(CX + 3.1, CZ + 1.4);
  const lpost = roundedBox(0.12, 1.9, 0.12, 0.03, materials.timber);
  lpost.position.set(CX + 3.1, lanternY + 0.95, CZ + 1.4);
  root.add(lpost);
  const lampHead = roundedBox(0.42, 0.5, 0.42, 0.06, materials.bulbAmber);
  lampHead.position.set(CX + 3.1, lanternY + 2.05, CZ + 1.4);
  root.add(lampHead);

  const benchY = entranceHeight(CX - 3.4, CZ + 0.6);
  const bench = new THREE.Group();
  const benchSeat = roundedBox(1.8, 0.12, 0.5, 0.05, materials.timber);
  benchSeat.position.y = 0.3;
  bench.add(benchSeat);
  for (const s of [-0.68, 0.68]) {
    const leg = roundedBox(0.13, 0.3, 0.4, 0.03, materials.stoneDark);
    leg.position.set(s, 0.15, 0);
    bench.add(leg);
  }
  const backRest = roundedBox(1.8, 0.1, 0.12, 0.03, materials.timber);
  backRest.position.set(0, 0.62, -0.22);
  bench.add(backRest);
  for (const s of [-0.68, 0.68]) {
    const post = roundedBox(0.1, 0.32, 0.1, 0.02, materials.stoneDark);
    post.position.set(s, 0.46, -0.22);
    bench.add(post);
  }
  bench.position.set(CX - 3.4, benchY, CZ + 0.6);
  bench.rotation.y = 0.5;
  root.add(bench);

  // ---------- plants ----------
  for (const [px, pz, s, pine] of [
    [-4.6, -2.6, 1.0, true],
    [4.9, -2.2, 0.85, false],
    [-3.9, 3.6, 0.7, false],
    [5.6, 2.8, 0.9, true],
    [1.9, -4.9, 0.6, false],
  ]) {
    const gx = CX + px;
    const gz = CZ + pz;
    const gy = entranceHeight(gx, gz) ?? H0;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9 * s, 7), materials.timber);
    trunk.position.set(gx, gy + 0.45 * s, gz);
    root.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: pine ? '#5f8a4c' : '#74a05a', roughness: 0.95 });
    const canopy = pine
      ? new THREE.Mesh(new THREE.ConeGeometry(0.85 * s, 1.7 * s, 8), leafMat)
      : new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 10, 8), leafMat);
    canopy.position.set(gx, gy + (pine ? 1.6 : 1.45) * s, gz);
    canopy.castShadow = true;
    root.add(canopy);
  }

  // flowers
  const flowerMat = new THREE.MeshStandardMaterial({ color: '#f0a9a0', roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = 2.2 + rng() * 4.4;
    const fx = CX + Math.cos(a) * r;
    const fz = CZ + Math.sin(a) * r;
    const fy = entranceHeight(fx, fz);
    if (fy === null) continue;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), flowerMat);
    f.position.set(fx, fy + 0.12, fz);
    root.add(f);
  }

  // ---------- dock ----------
  const dockZ = CZ + R - 0.6;
  for (let i = 0; i < 7; i++) {
    const plank = roundedBox(2.6, 0.12, 0.44, 0.03, materials.timber);
    plank.position.set(CX, H0 + 0.18, dockZ + i * 0.46);
    plank.receiveShadow = true;
    root.add(plank);
  }
  for (const s of [-1.1, 1.1]) {
    for (const dz of [0, 2.6]) {
      const pile = roundedBox(0.15, 1.2, 0.15, 0.03, materials.timber);
      pile.position.set(CX + s, H0 - 0.35, dockZ + dz);
      root.add(pile);
    }
  }
  // railing
  for (const s of [-1.15, 1.15]) {
    const rail = roundedBox(0.08, 0.08, 2.7, 0.02, materials.timber);
    rail.position.set(CX + s, H0 + 0.75, dockZ + 1.5);
    root.add(rail);
  }

  return {
    root,
    top,
    bench,
    benchSeat: { x: CX - 3.4, y: benchY + 0.36, z: CZ + 0.6, yaw: 0.5 },
    spawn: [CX, CZ - 4.2],
    dock: [CX, dockZ + 0.4],
    boatPos: [CX, dockZ + 3.4],
    focus: new THREE.Vector3(CX, H0 + 1.4, CZ + 1.0),
    solids: ENTRANCE_SOLIDS,
  };
}

function mergeAll(geos) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0);
      uvs.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    const ix = g.getIndex();
    if (ix) for (let i = 0; i < ix.count; i++) indices.push(ix.getX(i) + offset);
    else for (let i = 0; i < p.count; i++) indices.push(i + offset);
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}
