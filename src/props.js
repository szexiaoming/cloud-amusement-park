import * as THREE from 'three';
import { PLAN } from './townPlan.js';
import { terrainHeight } from './terrain.js';
import { roundedBox, makeTextTexture } from './helpers.js';

/** Square furniture and street lamps: the visual anchor of the town centre. */
export function createProps(materials) {
  const root = new THREE.Group();
  const { well, notice, benches, lamps } = PLAN.squareProps;

  root.add(makeWell(materials, well[0], well[1]));
  root.add(makeNotice(materials, notice[0], notice[1]));
  for (const [x, z, yaw] of benches) root.add(makeBench(materials, x, z, yaw));
  for (const [x, z] of lamps) root.add(makeLamp(materials, x, z));

  return root;
}

function makeWell(materials, x, z) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z), z);

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.7, 20), materials.stone);
  ring.position.y = 0.35;
  g.add(ring);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20), materials.glass);
  water.position.y = 0.66;
  g.add(water);

  for (const s of [-1, 1]) {
    const post = roundedBox(0.13, 1.5, 0.13, 0.02, materials.timber);
    post.position.set(s * 0.65, 0.75, 0);
    g.add(post);
  }
  const beam = roundedBox(1.6, 0.12, 0.14, 0.03, materials.timber);
  beam.position.y = 1.5;
  g.add(beam);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.55, 4), materials.roofTile);
  roof.position.y = 1.85;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeNotice(materials, x, z) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z), z);
  g.rotation.y = -0.4;

  for (const s of [-1, 1]) {
    const post = roundedBox(0.11, 1.4, 0.11, 0.02, materials.timber);
    post.position.set(s * 0.65, 0.7, 0);
    g.add(post);
  }
  const tex = makeTextTexture('小镇公告', { width: 256, height: 96, bg: '#f4e6cc', fg: '#5c4331', border: '#c9b48f' });
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.62),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }),
  );
  board.position.set(0, 1.15, 0.06);
  g.add(board);
  const back = roundedBox(1.55, 0.68, 0.08, 0.03, materials.timber);
  back.position.set(0, 1.15, 0);
  g.add(back);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeBench(materials, x, z, yaw) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z), z);
  g.rotation.y = yaw;

  const seat = roundedBox(1.35, 0.1, 0.36, 0.03, materials.timber);
  seat.position.y = 0.42;
  g.add(seat);
  const back = roundedBox(1.35, 0.36, 0.08, 0.03, materials.timber);
  back.position.set(0, 0.68, -0.15);
  back.rotation.x = 0.12;
  g.add(back);
  for (const s of [-1, 1]) {
    const leg = roundedBox(0.1, 0.42, 0.32, 0.02, materials.timber);
    leg.position.set(s * 0.55, 0.21, 0);
    g.add(leg);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeLamp(materials, x, z) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z), z);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.85, 8), materials.timber);
  post.position.y = 0.92;
  g.add(post);
  const head = roundedBox(0.3, 0.34, 0.3, 0.06, materials.bulbAmber);
  head.position.y = 1.95;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 4), materials.roofSlate);
  cap.position.y = 2.2;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
