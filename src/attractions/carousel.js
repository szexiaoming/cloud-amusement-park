import * as THREE from 'three';
import { ATTRACTIONS, LAYOUT, PALETTE, ATTRACTION_NAMES } from '../config.js';
import { roundedBox, makeHighlightRing } from '../helpers.js';
import { makeBulb } from '../decorativeLights.js';

const HORSE_COLORS = [PALETTE.cream, PALETTE.peach, PALETTE.butter, PALETTE.mint, PALETTE.creamDark];

/**
 * Carousel: round platform, central column, striped canopy (cream + peach),
 * and 5 simplified cute horses that bob gently while the platform rotates.
 */
export function createCarousel(materials, position = LAYOUT.carousel.position) {
  const cfg = ATTRACTIONS.carousel;
  const root = new THREE.Group();
  root.position.set(position[0], position[1] ?? 0, position[2] ?? 0);

  const spinner = new THREE.Group(); // rotates around Y
  root.add(spinner);

  const pr = cfg.platformRadius;

  // Platform
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(pr, pr + 0.25, cfg.platformHeight, 48),
    materials.creamDark,
  );
  base.position.y = cfg.platformHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  spinner.add(base);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(pr - 0.15, pr - 0.15, 0.12, 48),
    materials.cream,
  );
  top.position.y = cfg.platformHeight + 0.05;
  top.receiveShadow = true;
  spinner.add(top);

  // Central column + decorative gold bands
  const colH = 2.7;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, colH, 20), materials.wood);
  column.position.y = cfg.platformHeight + colH / 2;
  column.castShadow = true;
  spinner.add(column);
  for (const by of [0.7, 1.9, 3.0]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20), materials.gold);
    band.position.y = by;
    spinner.add(band);
  }

  // Striped canopy (alternating cream / peach wedges)
  const canopyBaseY = cfg.platformHeight + colH;
  const canopyR = pr + 0.15;
  const canopyH = 1.35;
  const wedges = 8;
  for (let i = 0; i < wedges; i++) {
    const mat = i % 2 === 0 ? materials.cream : materials.peach;
    const wedge = new THREE.Mesh(
      new THREE.ConeGeometry(canopyR, canopyH, 1, 6, false, (i / wedges) * Math.PI * 2, (Math.PI * 2) / wedges),
      mat,
    );
    wedge.position.y = canopyBaseY + canopyH / 2;
    wedge.castShadow = true;
    spinner.add(wedge);
  }
  // Scalloped edge
  for (let i = 0; i < wedges; i++) {
    const a = (i / wedges) * Math.PI * 2 + Math.PI / wedges;
    const scallop = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      i % 2 === 0 ? materials.peach : materials.cream,
    );
    scallop.position.set(Math.cos(a) * canopyR, canopyBaseY, Math.sin(a) * canopyR);
    scallop.castShadow = true;
    spinner.add(scallop);
  }
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), materials.gold);
  finial.position.y = canopyBaseY + canopyH + 0.25;
  spinner.add(finial);

  // Warm bulbs along the canopy rim (rotate with the canopy)
  for (let i = 0; i < wedges; i++) {
    const a = (i / wedges) * Math.PI * 2 + Math.PI / wedges;
    const bulb = makeBulb(materials, i % 2 === 0 ? 'amber' : 'cream', 0.11);
    bulb.position.set(Math.cos(a) * (canopyR - 0.18), canopyBaseY + 0.12, Math.sin(a) * (canopyR - 0.18));
    spinner.add(bulb);
  }

  // Poles + horses
  const horses = [];
  const n = cfg.horseCount;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = Math.cos(a) * (pr - 0.7);
    const pz = Math.sin(a) * (pr - 0.7);

    const poleGroup = new THREE.Group();
    poleGroup.position.set(px, 0, pz);

    const poleLen = canopyBaseY - cfg.platformHeight + 0.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, poleLen, 10), materials.gold);
    pole.position.y = cfg.platformHeight + poleLen / 2 - 0.25;
    pole.castShadow = true;
    poleGroup.add(pole);

    const horse = buildHorse(materials, HORSE_COLORS[i % HORSE_COLORS.length]);
    horse.position.y = cfg.platformHeight + 0.78;
    horse.rotation.y = Math.PI / 2 - a; // face outward
    poleGroup.add(horse);

    spinner.add(poleGroup);
    horses.push({
      horse,
      baseY: cfg.platformHeight + 0.78,
      phase: i * 1.9,
    });
  }

  const ring = makeHighlightRing(pr + 0.6, PALETTE.peach);
  root.add(ring);

  const labelAnchor = new THREE.Object3D();
  labelAnchor.position.set(0, canopyBaseY + canopyH + 1.0, 0);
  root.add(labelAnchor);

  let angle = 0;
  let paused = false;

  return {
    root,
    name: ATTRACTION_NAMES.carousel,
    labelAnchor,
    paused,
    setHighlight(on) {
      ring.visible = on;
    },
    toggle() {
      paused = !paused;
    },
    update(dt, elapsed) {
      if (paused) return;
      angle += cfg.rotationSpeed * dt;
      spinner.rotation.y = angle;
      for (const h of horses) {
        const bob = Math.sin(elapsed * cfg.bobSpeed + h.phase) * cfg.bobAmplitude;
        h.horse.position.y = h.baseY + bob;
        h.horse.rotation.z = Math.sin(elapsed * cfg.bobSpeed + h.phase + 1.2) * 0.04;
      }
    },
  };
}

// Simplified cute horse from basic shapes.
function buildHorse(materials, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 4, 10), bodyMat);
  body.rotation.x = Math.PI / 2; // lie along Z
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bodyMat);
  head.position.set(0, 0.42, 0.5);
  g.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), materials.cream);
  muzzle.position.set(0, 0.32, 0.72);
  g.add(muzzle);

  for (const ex of [-0.1, 0.1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), bodyMat);
    ear.position.set(ex, 0.66, 0.46);
    g.add(ear);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10), bodyMat);
  neck.position.set(0, 0.42, 0.32);
  neck.rotation.x = 0.4;
  g.add(neck);

  for (const lx of [-0.24, 0.24]) {
    for (const lz of [-0.2, 0.28]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 8), materials.woodDark);
      leg.position.set(lx, -0.38, lz);
      g.add(leg);
    }
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), bodyMat);
  tail.position.set(0, 0.15, -0.72);
  tail.rotation.x = -0.9;
  g.add(tail);

  const mane = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), materials.cream);
  mane.position.set(0, 0.5, 0.1);
  g.add(mane);

  const saddle = roundedBox(0.4, 0.12, 0.3, 0.04, materials.mint);
  saddle.position.set(0, 0.28, -0.05);
  g.add(saddle);

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
