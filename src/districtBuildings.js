import * as THREE from 'three';
import { roundedBox, makeStar, makeHighlightRing, makeTextTexture } from './helpers.js';

/**
 * Architecture for the memory houses: cottage, academy, research tower and the
 * reserved memory plot. Built with the entrance at local +Z and placed on the
 * ground by town.js.
 */
export function createDistrictBuilding(district, materials) {
  const g = new THREE.Group();
  let height;
  let w = 3.6;
  let d = 3.0;
  if (district.building === 'academy') height = academy(g, materials);
  else if (district.building === 'tower') {
    height = tower(g, materials);
    w = 3.2;
    d = 3.2;
  } else if (district.building === 'reserved') {
    height = reserved(g, district, materials);
    w = 2.4;
    d = 2.4;
  } else height = cottage(g, materials);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const anchor = new THREE.Object3D();
  anchor.position.set(0, height * 0.85, 0);
  g.add(anchor);
  const ring = makeHighlightRing(Math.max(w, d) * 0.75, '#e8c57a');
  g.add(ring);

  return { group: g, height, w, d, anchor, ring };
}

function gableRoof(g, { w, d, wallTop, rise, overhang, roofMat, gableMat, thick = 0.16 }) {
  const halfD = d / 2 + overhang;
  const slope = Math.hypot(halfD, rise);
  const angle = Math.atan2(rise, halfD);
  for (const s of [1, -1]) {
    const panel = roundedBox(w + overhang * 2, thick, slope, thick * 0.3, roofMat);
    panel.position.set(0, wallTop + rise / 2, (s * halfD) / 2);
    panel.rotation.x = s * angle;
    g.add(panel);
  }
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(geo, gableMat);
    tri.rotation.y = -Math.PI / 2;
    tri.position.set(s * (w / 2 - 0.01), wallTop, 0);
    g.add(tri);
  }
  const ridge = roundedBox(w + overhang * 2 + 0.05, thick * 1.3, thick * 1.7, thick * 0.5, roofMat);
  ridge.position.y = wallTop + rise;
  g.add(ridge);
}

function cottage(g, materials) {
  const W = 3.6;
  const D = 3.0;
  const wallH = 2.1;
  const base = roundedBox(W + 0.3, 0.7, D + 0.3, 0.06, materials.stone);
  base.position.y = 0.05;
  g.add(base);
  const walls = roundedBox(W, wallH, D, 0.13, materials.plaster);
  walls.position.y = 0.3 + wallH / 2;
  g.add(walls);
  const wallTop = 0.3 + wallH;
  gableRoof(g, { w: W, d: D, wallTop, rise: 1.0, overhang: 0.3, roofMat: materials.roofTile, gableMat: materials.plasterGable });

  const ch = roundedBox(0.34, 0.9, 0.34, 0.05, materials.stone);
  ch.position.set(-0.95, wallTop + 0.45, -0.4);
  g.add(ch);

  addDoor(g, materials, 0, 0.3, D);
  addWindow(g, materials, -1.0, 1.5, D);
  addWindow(g, materials, 1.0, 1.5, D);

  const star = makeStar(materials.star, 0.16);
  star.position.set(0, 1.98, D / 2 + 0.12);
  g.add(star);
  return wallTop + 1.2;
}

function academy(g, materials) {
  const W = 4.4;
  const D = 3.2;
  const wallH = 2.8;
  const base = roundedBox(W + 0.3, 0.7, D + 0.3, 0.06, materials.stone);
  base.position.y = 0.05;
  g.add(base);
  const walls = roundedBox(W, wallH, D, 0.14, materials.plasterWarm);
  walls.position.y = 0.3 + wallH / 2;
  g.add(walls);
  const wallTop = 0.3 + wallH;
  gableRoof(g, { w: W, d: D, wallTop, rise: 1.15, overhang: 0.32, roofMat: materials.roofSlate, gableMat: materials.plasterGable });

  addDoor(g, materials, 0, 0.3, D);
  for (const x of [-1.5, -0.55, 0.55, 1.5]) {
    addWindow(g, materials, x, 1.35, D);
    addWindow(g, materials, x, 2.45, D);
  }
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 18), materials.cream);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, wallTop + 0.55, D / 2 + 0.06);
  g.add(clock);
  return wallTop + 1.35;
}

function tower(g, materials) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.6, 20), materials.stone);
  base.position.y = 0.15;
  g.add(base);
  const H = 4.2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, H, 20), materials.plasterWarm);
  body.position.y = 0.3 + H / 2;
  g.add(body);
  for (const y of [1.6, 3.2]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.16, 20), materials.stoneDark);
    band.position.y = y;
    g.add(band);
  }
  const winGeo = new THREE.BoxGeometry(0.26, 0.42, 0.12);
  for (const y of [1.95, 2.75, 3.7]) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const win = new THREE.Mesh(winGeo, materials.window);
      win.position.set(Math.cos(a) * 1.48, y, Math.sin(a) * 1.48);
      win.rotation.y = -a + Math.PI / 2;
      g.add(win);
    }
  }
  const wallTop = 0.3 + H;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.5, 0.32, 20), materials.stone);
  crown.position.y = wallTop + 0.14;
  g.add(crown);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.4, 20), materials.roofSlate);
  roof.position.y = wallTop + 1.0;
  g.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), materials.gold);
  finial.position.y = wallTop + 1.8;
  g.add(finial);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 8), materials.stoneDark);
  antenna.position.y = wallTop + 2.4;
  g.add(antenna);

  const door = roundedBox(0.7, 1.5, 0.12, 0.03, materials.timber);
  door.position.set(0, 0.3 + 0.75, 1.62);
  g.add(door);
  return wallTop + 2.6;
}

function reserved(g, district, materials) {
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.16, 24), materials.soil);
  patch.position.y = 0.04;
  g.add(patch);
  const border = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 6, 36), materials.stoneDark);
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.12;
  g.add(border);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 8), materials.timber);
  post.position.set(0, 0.55, 0);
  g.add(post);
  const tex = makeTextTexture(`${district.letter} · ${district.name}`, {
    width: 256,
    height: 96,
    bg: '#f1e0c0',
    fg: '#5c4331',
    border: '#a89e8f',
  });
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.5),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }),
  );
  board.position.set(0, 1.25, 0.06);
  g.add(board);
  const star = makeStar(materials.star, 0.14);
  star.position.set(0, 0.88, 0.1);
  g.add(star);
  return 1.7;
}

function addDoor(g, materials, x, y0, D) {
  const frame = roundedBox(0.82, 1.6, 0.12, 0.03, materials.cream);
  frame.position.set(x, y0 + 0.8, D / 2 + 0.02);
  g.add(frame);
  const panel = roundedBox(0.64, 1.5, 0.1, 0.03, materials.timber);
  panel.position.set(x, y0 + 0.75, D / 2 - 0.05);
  g.add(panel);
  for (let i = 0; i < 2; i++) {
    const step = roundedBox(0.92 - i * 0.08, 0.1, 0.3, 0.02, materials.stoneDark);
    step.position.set(x, 0.05 + i * 0.05, D / 2 + 0.24 + i * 0.16);
    g.add(step);
  }
}

function addWindow(g, materials, x, y, D) {
  const frame = roundedBox(0.52, 0.52, 0.1, 0.02, materials.cream);
  frame.position.set(x, y, D / 2 + 0.01);
  g.add(frame);
  const glass = roundedBox(0.38, 0.38, 0.12, 0.02, materials.window);
  glass.position.set(x, y, D / 2 - 0.03);
  g.add(glass);
}
