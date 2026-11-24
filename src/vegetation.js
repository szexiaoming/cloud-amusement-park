import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAN } from './townPlan.js';
import { terrainHeight, railDistZ } from './terrain.js';
import { mulberry32 } from './helpers.js';

/**
 * Trees only inside the authored grove envelopes; every canopy fits its
 * envelope radius and max height. World-space (no extra scale).
 */
export function createVegetation(materials) {
  const root = new THREE.Group();
  const trees = [];
  const rng = mulberry32(2026);

  for (const g of PLAN.groves) {
    const sCap = Math.min(g.radius / 1.65, g.maxHeight / 3.4);
    for (let i = 0; i < g.count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (g.radius * 0.55);
      const x = g.centerXZ[0] + Math.cos(a) * r;
      const z = g.centerXZ[1] + Math.sin(a) * r;
      const s = sCap * (0.8 + rng() * 0.25);
      if (s < 0.2) continue;
      // reject anything inside the rail reservation (corridor + swept car + margin)
      if (distToRail(x, z) < 4.4) continue;
      trees.push({ x, z, s, rot: rng() * Math.PI * 2, pine: rng() > 0.6 });
    }
  }

  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.22, 1.7, 7);
  trunkGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.85, 0));
  const broadGeo = canopyBroad();
  const pineGeo = canopyPine();
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#6f9a58', roughness: 0.95, metalness: 0 });

  const broad = trees.filter((t) => !t.pine);
  const pine = trees.filter((t) => t.pine);

  const trunkMesh = new THREE.InstancedMesh(trunkGeo, materials.timber, trees.length);
  const broadMesh = new THREE.InstancedMesh(broadGeo, foliageMat, broad.length);
  const pineMesh = new THREE.InstancedMesh(pineGeo, foliageMat, pine.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  const setSlot = (mesh, t, i) => {
    q.setFromEuler(new THREE.Euler(0, t.rot, 0));
    v.set(t.x, terrainHeight(t.x, t.z), t.z);
    sc.setScalar(t.s);
    m.compose(v, q, sc);
    mesh.setMatrixAt(i, m);
  };

  trees.forEach((t, i) => setSlot(trunkMesh, t, i));
  trunkMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.frustumCulled = false;
  trunkMesh.castShadow = true;
  root.add(trunkMesh);

  broad.forEach((t, i) => setSlot(broadMesh, t, i));
  pine.forEach((t, i) => setSlot(pineMesh, t, i));
  for (const mesh of [broadMesh, pineMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    root.add(mesh);
  }

  return {
    root,
    trees,
    setSeason(season) {
      foliageMat.color.set(season.leaf);
    },
  };
}

function distToRail(x, z) {
  const pts = PLAN.railway.centerlineXZ;
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - x0) * dx + (z - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}

function canopyBroad() {
  const parts = [];
  const add = (r, x, y, z) => {
    const g = new THREE.SphereGeometry(r, 10, 8);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
    parts.push(g);
  };
  add(0.98, 0, 2.05, 0);
  add(0.72, 0.62, 2.5, 0.2);
  add(0.64, -0.58, 2.38, -0.24);
  add(0.56, 0.12, 2.82, -0.12);
  return mergeGeometries(parts);
}

function canopyPine() {
  const parts = [];
  const add = (r, h, y) => {
    const g = new THREE.ConeGeometry(r, h, 8);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, y, 0));
    parts.push(g);
  };
  add(1.0, 1.4, 1.95);
  add(0.78, 1.2, 2.6);
  add(0.55, 1.0, 3.2);
  return mergeGeometries(parts);
}
