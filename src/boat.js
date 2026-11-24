import * as THREE from 'three';
import { roundedBox } from './helpers.js';

/**
 * Little ferry that carries the avatar from the entrance island to the main
 * island's east dock. The crossing is a timed curve; the caller drives it.
 */
export function createBoat(materials, from, to) {
  const root = new THREE.Group();

  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.5, 4, 10), materials.timber);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 0.6, 1);
  hull.position.y = 0.28;
  root.add(hull);

  const deck = roundedBox(1.9, 0.12, 1.0, 0.04, materials.plank);
  deck.position.y = 0.6;
  root.add(deck);

  const rim = roundedBox(2.0, 0.16, 1.1, 0.05, materials.cream);
  rim.position.y = 0.5;
  root.add(rim);

  const mast = roundedBox(0.08, 1.9, 0.08, 0.02, materials.timber);
  mast.position.set(-0.1, 1.5, 0);
  root.add(mast);

  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.5),
    new THREE.MeshStandardMaterial({ color: '#f7efe0', roughness: 0.9, side: THREE.DoubleSide }),
  );
  sail.position.set(0.42, 1.55, 0);
  sail.rotation.y = Math.PI / 2;
  root.add(sail);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), materials.bulbAmber);
  lamp.position.set(-0.85, 0.85, 0);
  root.add(lamp);

  root.position.set(from[0], from[1], from[2]);
  root.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);

  const path = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(from[0], from[1], from[2]),
      new THREE.Vector3((from[0] + to[0]) / 2 + 3.5, from[1] + 0.1, (from[2] + to[2]) / 2),
      new THREE.Vector3(to[0], to[1], to[2]),
    ],
    false,
    'catmullrom',
    0.5,
  );
  const length = path.getLength();

  let t = 0;
  let sailing = false;

  function start() {
    sailing = true;
    t = 0;
  }

  function update(dt) {
    if (sailing) {
      t = Math.min(1, t + (dt * 9.5) / length);
      const p = path.getPointAt(t);
      const tan = path.getTangentAt(t);
      root.position.copy(p);
      root.rotation.y = Math.atan2(tan.x, tan.z);
      root.position.y = p.y + Math.sin(t * Math.PI) * 0.12;
      if (t >= 1) sailing = false;
    } else {
      root.position.y += Math.sin(performance.now() * 0.0016) * 0.0015;
    }
  }

  return {
    root,
    start,
    update,
    get progress() {
      return t;
    },
    get sailing() {
      return sailing;
    },
    path,
    length,
  };
}
