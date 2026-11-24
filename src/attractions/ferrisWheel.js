import * as THREE from 'three';
import { ATTRACTIONS, LAYOUT, PALETTE, CAMERA, ATTRACTION_NAMES } from '../config.js';
import { roundedBox, cylinderBetween, makeHighlightRing, yawToward } from '../helpers.js';
import { makeBulb } from '../decorativeLights.js';

const CABIN_COLORS = [
  PALETTE.peach,
  PALETTE.butter,
  PALETTE.mint,
  PALETTE.cream,
  PALETTE.peachDark,
  PALETTE.butterDark,
  PALETTE.mintDark,
  PALETTE.creamDark,
];

/**
 * Ferris wheel: thick torus rims, cylindrical spokes, A-frame supports and
 * 8 rounded cabins that stay upright in world space while the wheel turns.
 */
export function createFerrisWheel(materials, position = LAYOUT.ferrisWheel.position) {
  const cfg = ATTRACTIONS.ferrisWheel;
  const root = new THREE.Group();
  const pos = position;
  root.position.set(pos[0], pos[1] ?? 0, pos[2] ?? 0);
  root.rotation.y = yawToward(pos, CAMERA.defaultPosition);

  const R = cfg.radius;
  const H = cfg.hubHeight;

  // A-frame supports (front + back)
  for (const zz of [0.55, -0.55]) {
    const top = new THREE.Vector3(0, H, zz);
    root.add(cylinderBetween(top, new THREE.Vector3(2.35, 0, zz), 0.17, materials.cream));
    root.add(cylinderBetween(top, new THREE.Vector3(-2.35, 0, zz), 0.17, materials.cream));
    root.add(
      cylinderBetween(new THREE.Vector3(1.6, 1.2, zz), new THREE.Vector3(-1.6, 1.2, zz), 0.12, materials.wood),
    );
  }
  // Base pads
  for (const bx of [-2.35, 2.35]) {
    for (const bz of [-0.55, 0.55]) {
      const pad = roundedBox(0.7, 0.18, 0.7, 0.05, materials.woodDark);
      pad.position.set(bx, 0.09, bz);
      root.add(pad);
    }
  }

  // Rotating wheel
  const wheel = new THREE.Group();
  wheel.position.y = H;
  root.add(wheel);

  const rimGeo = new THREE.TorusGeometry(R, 0.18, 14, 60);
  for (const zz of [0.22, -0.22]) {
    const rim = new THREE.Mesh(rimGeo, materials.wheelRim);
    rim.position.z = zz;
    rim.castShadow = true;
    wheel.add(rim);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 18), materials.wood);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  wheel.add(hub);

  for (let i = 0; i < cfg.spokes; i++) {
    const a = (i / cfg.spokes) * Math.PI * 2;
    const outer = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    wheel.add(cylinderBetween(new THREE.Vector3(0, 0, 0), outer, 0.06, materials.cream));
  }

  // Warm bulbs along the rim (rotate with the wheel)
  const bulbCount = 12;
  for (let i = 0; i < bulbCount; i++) {
    const a = (i / bulbCount) * Math.PI * 2;
    const bulb = makeBulb(materials, i % 2 === 0 ? 'cream' : 'amber', 0.12);
    bulb.position.set(Math.cos(a) * R, Math.sin(a) * R, 0.42);
    wheel.add(bulb);
  }

  // Upright cabins (siblings of the wheel, repositioned each frame)
  const cabins = [];
  const cabinGroup = new THREE.Group();
  root.add(cabinGroup);
  for (let i = 0; i < cfg.cabinCount; i++) {
    const cabin = buildCabin(materials, CABIN_COLORS[i % CABIN_COLORS.length]);
    cabinGroup.add(cabin);
    cabins.push(cabin);
  }

  const ring = makeHighlightRing(R + 0.7, PALETTE.mint);
  root.add(ring);

  const labelAnchor = new THREE.Object3D();
  labelAnchor.position.set(0, H + R + 1.2, 0);
  root.add(labelAnchor);

  let angle = 0;
  let paused = false;

  return {
    root,
    name: ATTRACTION_NAMES.ferrisWheel,
    labelAnchor,
    paused,
    setHighlight(on) {
      ring.visible = on;
    },
    toggle() {
      paused = !paused;
    },
    update(dt) {
      if (paused) return;
      angle += cfg.rotationSpeed * dt;
      wheel.rotation.z = angle;
      for (let i = 0; i < cabins.length; i++) {
        const a = angle + (i / cabins.length) * Math.PI * 2;
        cabins[i].position.set(Math.cos(a) * R, H + Math.sin(a) * R, 0);
        cabins[i].rotation.z = 0;
      }
    },
  };
}

function buildCabin(materials, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8), materials.wood);
  arm.position.y = -0.1;
  g.add(arm);

  const body = roundedBox(0.72, 0.62, 0.4, 0.1, bodyMat);
  body.position.y = -0.55;
  g.add(body);

  const win = roundedBox(0.5, 0.34, 0.1, 0.04, materials.cream);
  win.position.set(0, -0.5, 0.22);
  g.add(win);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 4, 1), materials.creamDark);
  roof.position.y = -0.16;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
