import * as THREE from 'three';
import { terrainHeight } from './terrain.js';
import { roundedBox, makeTextTexture, mulberry32 } from './helpers.js';

/**
 * Two mountains flanking the railway, each pierced by a tunnel opening so the
 * train passes through them (left mountain -> gap -> right mountain).
 * Low-poly, vertex-jittered, flat shaded.
 */
const TRACK_Z = -22.8;
const RAIL_Y = 1.2;
const HILLS = [
  { x: -8.0, z: -22.8, r: 6.2, h: 9.4, seed: 5 },
  { x: 8.0, z: -22.8, r: 5.4, h: 8.2, seed: 9 },
];
const MOUTH = { w: 3.4, h: 3.6 };

export function createMountain(materials) {
  const root = new THREE.Group();
  const rng = mulberry32(77);
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#8d938a',
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
  });
  const rockLightMat = new THREE.MeshStandardMaterial({
    color: '#a3a89e',
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  const darkMat = new THREE.MeshBasicMaterial({ color: '#1b1f1a' });

  for (const hill of HILLS) {
    const body = new THREE.Mesh(jitterCone(hill.r, hill.h, 13, 5, 0.55, hill.seed), rockMat);
    // ConeGeometry is centred: lift by h/2 so the base sits on the ground
    body.position.set(hill.x, hill.h / 2, hill.z);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // a smaller shoulder so the mound does not look like a single cone
    const sh = hill.h * 0.6;
    const shoulder = new THREE.Mesh(
      jitterCone(hill.r * 0.6, sh, 10, 4, 0.5, hill.seed + 40),
      rockLightMat,
    );
    shoulder.position.set(hill.x - hill.r * 0.8, sh / 2 - 0.3, hill.z + 1.4);
    shoulder.castShadow = true;
    root.add(shoulder);

    // tunnel opening on each side of this hill, aligned with the track
    for (const dir of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(hill.x + dir * hill.r * 0.86, RAIL_Y, TRACK_Z);
      g.rotation.y = Math.PI / 2;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(MOUTH.w / 2, 0.3, 7, 16, Math.PI), rockMat);
      arch.position.set(0, 0.95, 0);
      g.add(arch);
      for (const side of [-1, 1]) {
        const post = roundedBox(0.55, MOUTH.h, 0.55, 0.08, rockMat);
        post.position.set(side * (MOUTH.w / 2 + 0.05), MOUTH.h / 2 - 0.5, 0);
        g.add(post);
      }
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(MOUTH.w / 2, 16, 0, Math.PI), darkMat);
      mouth.position.set(0, 0.98, -0.04 * dir);
      g.add(mouth);
      root.add(g);
    }

    // the opening itself is the dark mouth on each portal; no solid bore block
  }

  // rocky saddles at each hill's foot (kept off the rails)
  for (let i = 0; i < 8; i++) {
    const s = 0.4 + rng() * 0.7;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), i % 2 ? rockMat : rockLightMat);
    const hill = HILLS[i % 2];
    const bx = hill.x + (rng() - 0.5) * hill.r * 1.6;
    const bz = TRACK_Z - 1.6 - rng() * 2.2;
    b.position.set(bx, terrainHeight(bx, bz) + s * 0.45, bz);
    b.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    b.castShadow = true;
    root.add(b);
  }

  // --- hiking trail (interest: 徒步), on the west hill's town side ---
  const trail = [[-19.5, -9.0], [-18.2, -13.0], [-15.6, -16.0], [-12.6, -17.2], [-9.6, -17.4]];
  const discs = [];
  const disc = new THREE.CylinderGeometry(0.6, 0.6, 0.16, 12);
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i];
    const b = trail[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.55));
    for (let s = 0; s <= n; s++) {
      const x = a[0] + (b[0] - a[0]) * (s / n);
      const z = a[1] + (b[1] - a[1]) * (s / n);
      const d = disc.clone();
      d.applyMatrix4(new THREE.Matrix4().makeTranslation(x, terrainHeight(x, z) + 0.07, z));
      discs.push(d);
    }
  }
  const trailMesh = new THREE.Mesh(mergeAll(discs), materials.path);
  trailMesh.receiveShadow = true;
  root.add(trailMesh);

  const gy = terrainHeight(-19.5, -9.0);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.54),
    new THREE.MeshStandardMaterial({
      map: makeTextTexture('徒步小径', { width: 256, height: 80, bg: '#f4e6cc', fg: '#5c4331', border: '#c9b48f' }),
      roughness: 0.9,
      metalness: 0,
    }),
  );
  sign.position.set(-19.5, gy + 1.2, -9.0);
  sign.rotation.y = 0.55;
  root.add(sign);
  const post = roundedBox(0.1, 1.25, 0.1, 0.02, materials.timber);
  post.position.set(-19.5, gy + 0.62, -9.0);
  root.add(post);

  // lookout bench at the trail end
  const lx = -9.6;
  const lz = -17.4;
  const look = new THREE.Group();
  look.position.set(lx, terrainHeight(lx, lz), lz);
  const bench = roundedBox(1.9, 0.16, 0.5, 0.06, materials.timber);
  bench.position.y = 0.5;
  look.add(bench);
  for (const s of [-0.72, 0.72]) {
    const leg = roundedBox(0.14, 0.5, 0.42, 0.03, materials.stoneDark);
    leg.position.set(s, 0.25, 0);
    look.add(leg);
  }
  root.add(look);

  // the two hills are masses the bore passes through; keep them out of the
  // swept-volume check only above the bore (below it, the bore is the clear pass)
  const obstacles = HILLS.map((hill, i) => ({
    id: 'mountain-' + i,
    x: hill.x,
    z: hill.z,
    hx: hill.r * 0.62,
    hz: hill.r * 0.62,
    fx: 1,
    fz: 0,
    y0: RAIL_Y + MOUTH.h + 0.2,
    y1: hill.h,
    radius: hill.r,
  }));

  return { root, obstacles };
}

/** Low-poly cone with jittered vertices (tip kept sharp). */
function jitterCone(r, h, segments, rings, amount, seed) {
  const geo = new THREE.ConeGeometry(r, h, segments, rings);
  const pos = geo.getAttribute('position');
  const rng = mulberry32(seed);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ny = (y + h / 2) / h;
    if (ny > 0.98) continue;
    const scale = 1 + (rng() - 0.5) * amount * (1 - ny * 0.5);
    pos.setX(i, pos.getX(i) * scale);
    pos.setZ(i, pos.getZ(i) * scale);
    if (ny > 0.02) pos.setY(i, y + (rng() - 0.5) * amount * 0.8);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function mergeAll(geos) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let offset = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor ? nor.getX(i) : 0, nor ? nor.getY(i) : 1, nor ? nor.getZ(i) : 0);
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    const idx = g.getIndex();
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    else for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    offset += pos.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}
