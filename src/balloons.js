import * as THREE from 'three';
import { BALLOONS } from './config.js';
import { roundedBox, cylinderBetween, mulberry32 } from './helpers.js';

/**
 * Pastel hot-air balloons with rounded, tapered envelopes (LatheGeometry),
 * a wicker basket, four ropes anchored to the basket's corners and a small
 * burner that glows warm at night.
 */
export function createBalloons(materials) {
  const group = new THREE.Group();
  const rng = mulberry32(20241121);
  const data = [];

  for (let i = 0; i < BALLOONS.count; i++) {
    const balloon = buildBalloon(materials, BALLOONS.colors[i]);
    const pos = BALLOONS.positions[i];
    balloon.group.position.set(pos[0], pos[1], pos[2]);
    balloon.group.scale.setScalar(0.85 + rng() * 0.4);
    group.add(balloon.group);
    data.push({ ...balloon, baseY: pos[1], phase: i * 2.1 });
  }

  return {
    root: group,
    update(dt, elapsed) {
      const t = elapsed;
      for (const d of data) {
        d.group.position.y = d.baseY + Math.sin(t * BALLOONS.bob + d.phase) * 1.1;
        d.group.rotation.z = Math.sin(t * BALLOONS.sway * 1.4 + d.phase) * 0.06;
        d.group.rotation.x = Math.cos(t * BALLOONS.sway + d.phase) * 0.04;
        // Gentle flame flicker (height + brightness pulse).
        const f = 0.9 + Math.sin(t * 7.3 + d.phase * 3.1) * 0.1 + Math.sin(t * 3.1 + d.phase) * 0.06;
        d.flame.scale.y = f;
        d.flameCore.scale.setScalar(0.8 + f * 0.25);
      }
    },
  };
}

function buildBalloon(materials, envelopeColor) {
  const group = new THREE.Group();
  const envelopeMat = new THREE.MeshStandardMaterial({
    color: envelopeColor,
    roughness: 0.85,
    metalness: 0,
  });

  // Teardrop profile (x = radius, y = height), revolved around Y.
  const profile = [
    new THREE.Vector2(0.001, 2.3),
    new THREE.Vector2(0.5, 2.18),
    new THREE.Vector2(1.05, 1.7),
    new THREE.Vector2(1.3, 1.0),
    new THREE.Vector2(1.32, 0.3),
    new THREE.Vector2(1.12, -0.6),
    new THREE.Vector2(0.78, -1.3),
    new THREE.Vector2(0.42, -1.85),
    new THREE.Vector2(0.16, -2.1),
    new THREE.Vector2(0.001, -2.16),
  ];
  const envelope = new THREE.Mesh(new THREE.LatheGeometry(profile, 22), envelopeMat);
  envelope.castShadow = true;
  group.add(envelope);

  // Bottom opening band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.08, 8, 16), materials.cream);
  band.position.y = -2.1;
  band.rotation.x = Math.PI / 2;
  group.add(band);

  // --- Basket (top edge at basketTop) ---
  const basketW = 0.76;
  const basketH = 0.62;
  const basketY = -3.12;
  const basketTop = basketY + basketH / 2;
  const rounding = 0.07;

  const basket = roundedBox(basketW, basketH, basketW, rounding, materials.wood);
  basket.position.y = basketY;
  basket.castShadow = true;
  group.add(basket);

  const rim = roundedBox(basketW + 0.05, 0.09, basketW + 0.05, 0.035, materials.woodDark);
  rim.position.y = basketTop;
  group.add(rim);

  // --- Ropes: envelope opening -> the basket's four top corners ---
  // The rounded corner's outer point (at 45°) sits at (h - r + r/√2) from centre.
  const h = basketW / 2;
  const corner = h - rounding + rounding / Math.SQRT2;
  const topR = 0.17;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const sx = Math.cos(a);
    const sz = Math.sin(a);
    const topPt = new THREE.Vector3(sx * topR, -2.06, sz * topR);
    const bottomPt = new THREE.Vector3(sx * corner, basketTop, sz * corner);
    const rope = cylinderBetween(topPt, bottomPt, 0.022, materials.woodDark, 5);
    rope.castShadow = false;
    group.add(rope);
  }

  // --- Burner frame + flame (glows warm at night via the shared bulb material) ---
  const burnerFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.24, 10), materials.stoneDark);
  burnerFrame.position.y = basketTop + 0.17;
  group.add(burnerFrame);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.46, 10), materials.bulbAmber);
  flame.position.y = basketTop + 0.5;
  group.add(flame);

  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 8), materials.star);
  flameCore.position.y = basketTop + 0.44;
  group.add(flameCore);

  return { group, flame, flameCore };
}
