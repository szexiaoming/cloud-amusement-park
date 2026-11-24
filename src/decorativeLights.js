import * as THREE from 'three';
import { DECOR } from './config.js';
import { roundedBox, makeStar, yawToward } from './helpers.js';

let _bulbGeo = null;

/**
 * Small rounded bulb using one of the shared emissive materials. Emissive
 * intensity is driven globally by `createDecorativeLights().update()` so a
 * single update lights every bulb on the wheel, canopy and lanterns.
 */
export function makeBulb(materials, kind = 'cream', radius = 0.13) {
  if (!_bulbGeo) _bulbGeo = new THREE.SphereGeometry(1, 12, 8);
  const mat = kind === 'amber' ? materials.bulbAmber : materials.bulbCream;
  const mesh = new THREE.Mesh(_bulbGeo, mat);
  mesh.scale.setScalar(radius);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Path lanterns (with a recurring star motif), plus a handful of shared
 * PointLights for the entrance sign and bench area. Owns the emissive-bulb
 * brightness and PointLight intensity for the whole park.
 */
export function createDecorativeLights(materials) {
  const group = new THREE.Group();
  const pointLights = [];

  for (const [x, z] of DECOR.lanterns) {
    group.add(buildLantern(materials, x, z));
  }

  for (const cfg of DECOR.pointLights) {
    const pl = new THREE.PointLight(cfg.color, 0, cfg.distance, 2);
    pl.position.set(...cfg.position);
    pl.castShadow = false;
    group.add(pl);
    pointLights.push({ light: pl, intensity: cfg.intensity });
  }

  function update(env) {
    const e = env.emissive; // 0 = day, 1 = night
    materials.bulbCream.emissiveIntensity = e * DECOR.emissiveBoost;
    materials.bulbAmber.emissiveIntensity = e * DECOR.emissiveBoost;
    materials.star.emissiveIntensity = DECOR.starDay + (DECOR.starNight - DECOR.starDay) * e;
    materials.window.emissiveIntensity = 0.12 + e * 0.95;
    for (const p of pointLights) {
      p.light.intensity = p.intensity * e;
    }
  }

  return { root: group, update };
}

function buildLantern(materials, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yawToward([x, 0, z], [0, 0, 0]); // face the island centre

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8), materials.woodDark);
  pole.position.y = 0.55;
  pole.castShadow = true;
  g.add(pole);

  // Glowing lantern head
  const head = roundedBox(0.34, 0.42, 0.34, 0.07, materials.bulbAmber);
  head.position.y = 1.25;
  g.add(head);

  // Little roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 4, 1), materials.wood);
  roof.position.y = 1.52;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);

  // Star motif on the front face
  const star = makeStar(materials.star, 0.1);
  star.position.set(0, 1.25, 0.185);
  g.add(star);

  return g;
}
