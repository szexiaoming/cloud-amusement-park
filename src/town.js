import * as THREE from 'three';
import { WORLD_SCALE } from './config.js';
import { DISTRICTS } from './districts.js';
import { createDistrictBuilding } from './districtBuildings.js';
import { terrainHeight } from './terrain.js';

/**
 * Places each memory destination at its AUTHORED world center and yaw.
 * Models stay in their previous world size: they are authored in design units
 * and each instance is scaled once by WORLD_SCALE (never the coordinates).
 */
export function createTown(materials) {
  const root = new THREE.Group();
  const places = [];

  for (const d of DISTRICTS) {
    const built = createDistrictBuilding(d, materials);
    const yaw = (d.yawDeg * Math.PI) / 180;
    built.group.scale.setScalar(WORLD_SCALE);
    built.group.position.set(d.centerXZ[0], d.padY, d.centerXZ[1]);
    built.group.rotation.y = yaw;
    root.add(built.group);

    const wWorld = built.w * WORLD_SCALE;
    const dWorld = built.d * WORLD_SCALE;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const door = [
      d.centerXZ[0] + fx * (dWorld / 2 + 0.1),
      d.centerXZ[1] + fz * (dWorld / 2 + 0.1),
    ];

    places.push({
      kind: 'district',
      id: d.id,
      letter: d.letter,
      name: d.name,
      englishName: d.englishName,
      theme: d.theme,
      status: d.status,
      story: d.story,
      tags: d.tags || [],
      projects: d.projects || [],
      note: d.note,
      root: built.group,
      labelAnchor: built.anchor,
      setHighlight: (on) => {
        built.ring.visible = on;
      },
      footprint: {
        x: d.centerXZ[0],
        z: d.centerXZ[1],
        hx: dWorld / 2, // extent along the entrance/forward axis (depth)
        hz: wWorld / 2, // extent across (width)
        fx,
        fz,
        y0: d.padY,
        y1: d.padY + Math.min(built.height * WORLD_SCALE, d.maxHeight),
        radius: Math.max(wWorld, dWorld) / 2 + 0.4,
      },
      door,
      focus: new THREE.Vector3(door[0], d.padY + 1.6, door[1]),
    });
  }

  return { root, places, districts: DISTRICTS };
}
