import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLOUDS, PALETTE } from './config.js';
import { mulberry32 } from './helpers.js';

/**
 * Fluffy clouds built from overlapping spheres and merged into one geometry
 * per cloud. Mostly opaque; a few peripheral clouds are slightly transparent.
 * They drift and bob gently without obscuring the attractions.
 */
export function createClouds(materials) {
  const group = new THREE.Group();
  const rng = mulberry32(20241120);
  const data = [];

  const sphereGeo = new THREE.SphereGeometry(1, 14, 10);

  for (let i = 0; i < CLOUDS.count; i++) {
    const isSky = i < CLOUDS.skyClouds;
    const mat = isSky ? materials.cloudTransparent : materials.cloud;

    const puffs = CLOUDS.minPuffs + Math.floor(rng() * (CLOUDS.maxPuffs - CLOUDS.minPuffs + 1));
    const geos = [];
    for (let p = 0; p < puffs; p++) {
      const g = sphereGeo.clone();
      const sx = CLOUDS.radius[0] + rng() * (CLOUDS.radius[1] - CLOUDS.radius[0]);
      const sy = sx * (0.6 + rng() * 0.35);
      const sz = sx * (0.7 + rng() * 0.4);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(
          (rng() - 0.5) * CLOUDS.spread * 0.7,
          (rng() - 0.5) * 0.8,
          (rng() - 0.5) * CLOUDS.spread * 0.6,
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(sx, sy, sz),
      );
      g.applyMatrix4(m);
      geos.push(g);
    }
    const merged = mergeGeometries(geos);
    const mesh = new THREE.Mesh(merged, mat);

    // Clouds live around and above the island — never among the buildings.
    const y = isSky ? 9 + rng() * 11 : -14 + rng() * 5;
    const rad = isSky ? 34 + rng() * 14 : 30 + rng() * 14;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;

    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.8 + rng() * 1.6);
    group.add(mesh);

    data.push({
      mesh,
      base: new THREE.Vector3(x, y, z),
      phase: rng() * Math.PI * 2,
      amp: 0.3 + rng() * 0.5,
      speed: 0.2 + rng() * 0.25,
      axis: rng() < 0.5 ? 'x' : 'z',
    });
  }

  return {
    root: group,
    update(dt, elapsed) {
      const t = elapsed;
      for (const c of data) {
        c.mesh.position.y = c.base.y + Math.sin(t * c.speed + c.phase) * c.amp;
        const drift = Math.sin(t * CLOUDS.drift + c.phase) * 1.2;
        if (c.axis === 'x') c.mesh.position.x = c.base.x + drift;
        else c.mesh.position.z = c.base.z + drift;
      }
    },
  };
}
