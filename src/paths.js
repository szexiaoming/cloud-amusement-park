import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAN } from './townPlan.js';
import { terrainHeight } from './terrain.js';

/** Authored pedestrian network (world units), merged into one surface. */
export function createPaths(materials) {
  const root = new THREE.Group();
  const geos = [];

  for (const p of PLAN.paths) {
    const disc = new THREE.CylinderGeometry(p.width / 2, p.width / 2, 0.14, 16, 1);
    for (let i = 0; i < p.pointsXZ.length - 1; i++) {
      const a = new THREE.Vector2(p.pointsXZ[i][0], p.pointsXZ[i][1]);
      const b = new THREE.Vector2(p.pointsXZ[i + 1][0], p.pointsXZ[i + 1][1]);
      const d = a.distanceTo(b);
      const steps = Math.max(1, Math.round(d / 0.28));
      for (let s = 0; s <= steps; s++) {
        const q = a.clone().lerp(b, s / steps);
        const g = disc.clone();
        g.applyMatrix4(new THREE.Matrix4().makeTranslation(q.x, terrainHeight(q.x, q.y) + 0.05, q.y));
        geos.push(g);
      }
    }
  }

  const sq = PLAN.square;
  const plaza = new THREE.CylinderGeometry(sq.radius, sq.radius, 0.14, 40, 1);
  plaza.applyMatrix4(new THREE.Matrix4().makeTranslation(sq.centerXZ[0], terrainHeight(sq.centerXZ[0], sq.centerXZ[1]) + 0.04, sq.centerXZ[1]));
  geos.push(plaza);

  const mesh = new THREE.Mesh(mergeGeometries(geos), materials.path);
  mesh.receiveShadow = true;
  root.add(mesh);
  return root;
}
