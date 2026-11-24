import * as THREE from 'three';
import { roundedBox, makeTextTexture } from './helpers.js';

/**
 * Reusable, human-scale town buildings. Every building is built with its
 * entrance facing local +Z, sits on the ground at y = 0 and returns a
 * footprint so the plan can wire paths to its door.
 */
const WALL_KEYS = ['plaster', 'plasterWarm', 'plasterSage', 'plasterBlue', 'plasterRose'];
const ROOF_KEYS = ['roofTile', 'roofSlate', 'roofMoss'];

export function createBuilding(def, materials) {
  const h = hash(def.id);
  const ctx = {
    W: 3.4,
    D: 2.8,
    wallH: 2.0,
    rise: 1.0,
    overhang: 0.28,
    wallMat: materials[WALL_KEYS[h % WALL_KEYS.length]],
    roofMat: materials[ROOF_KEYS[(h >> 2) % ROOF_KEYS.length]],
    trim: materials.cream,
    timber: materials.timber,
    stone: materials.stone,
    stoneDark: materials.stoneDark,
  };
  const g = new THREE.Group();

  // Warm roofs for the cottages, slate only for the station/library.
  if (def.type === 'cottage') ctx.roofMat = h % 2 ? materials.roofTile : materials.roofMoss;
  if (def.type === 'library') ctx.roofMat = materials.roofSlate;

  if (def.type === 'greenhouse') return greenhouse(g, ctx, materials);
  if (def.type === 'booth') return booth(g, ctx, materials);
  if (def.type === 'station') return station(g, ctx, materials);
  if (def.type === 'cafe' || def.type === 'bakery') return shop(g, ctx, materials, def);
  if (def.type === 'library') return library(g, ctx, materials);
  return cottage(g, ctx, materials, def);
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// --- shared pieces ---------------------------------------------------------

function plinthWalls(g, c, wallH, wallMat) {
  // tall plinth, mostly sunk into the terrain so sloped ground never floats
  const base = roundedBox(c.W + 0.34, 1.2, c.D + 0.34, 0.07, c.stone);
  base.position.y = -0.28;
  g.add(base);
  const walls = roundedBox(c.W, wallH, c.D, 0.13, wallMat);
  walls.position.y = 0.32 + wallH / 2;
  g.add(walls);
  return 0.32 + wallH;
}

function gableRoof(g, c, wallTop, rise) {
  const halfD = c.D / 2 + c.overhang;
  const slope = Math.hypot(halfD, rise);
  const angle = Math.atan2(rise, halfD);
  for (const s of [1, -1]) {
    const panel = roundedBox(c.W + c.overhang * 2, 0.16, slope, 0.05, c.roofMat);
    panel.position.set(0, wallTop + rise / 2, (s * halfD) / 2);
    panel.rotation.x = s * angle;
    g.add(panel);
  }
  const shape = new THREE.Shape();
  shape.moveTo(-c.D / 2, 0);
  shape.lineTo(c.D / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const gableMat = c.wallMat.clone();
  gableMat.side = THREE.DoubleSide;
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(geo, gableMat);
    tri.rotation.y = -Math.PI / 2;
    tri.position.set(s * (c.W / 2 - 0.01), wallTop, 0);
    g.add(tri);
  }
  const ridge = roundedBox(c.W + c.overhang * 2 + 0.05, 0.2, 0.26, 0.06, c.roofMat);
  ridge.position.y = wallTop + rise;
  g.add(ridge);
  return wallTop + rise;
}

function chimney(g, c, wallTop, x) {
  const ch = roundedBox(0.32, 0.9, 0.32, 0.05, c.stone);
  ch.position.set(x, wallTop + 0.42, -c.D * 0.18);
  g.add(ch);
  const cap = roundedBox(0.4, 0.08, 0.4, 0.03, c.stoneDark);
  cap.position.set(x, wallTop + 0.88, -c.D * 0.18);
  g.add(cap);
}

function door(g, c, x = 0, y0 = 0.32) {
  const w = 0.62;
  const hh = 1.05;
  const frame = roundedBox(w + 0.18, hh + 0.14, 0.12, 0.03, c.trim);
  frame.position.set(x, y0 + hh / 2 + 0.04, c.D / 2 + 0.02);
  g.add(frame);
  const panel = roundedBox(w, hh, 0.1, 0.03, c.timber);
  panel.position.set(x, y0 + hh / 2, c.D / 2 - 0.06);
  g.add(panel);
  for (let i = 0; i < 2; i++) {
    const step = roundedBox(w + 0.34 - i * 0.08, 0.11, 0.32, 0.03, c.stone);
    step.position.set(x, 0.055 + i * 0.06, c.D / 2 + 0.22 + i * 0.2);
    g.add(step);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), c.trim);
  lamp.position.set(x + w / 2 + 0.14, y0 + hh + 0.12, c.D / 2 + 0.1);
  g.add(lamp);
}

function windowBox(g, c, x, y, w = 0.42, h = 0.48, withBox = false) {
  const frame = roundedBox(w + 0.12, h + 0.12, 0.1, 0.02, c.trim);
  frame.position.set(x, y, c.D / 2 + 0.01);
  g.add(frame);
  const glass = roundedBox(w, h, 0.12, 0.02, c.windowMat || c.trim);
  glass.position.set(x, y, c.D / 2 - 0.03);
  g.add(glass);
  const bv = roundedBox(0.03, h, 0.03, 0.01, c.trim);
  bv.position.set(x, y, c.D / 2 + 0.05);
  g.add(bv);
  const bh = roundedBox(w, 0.03, 0.03, 0.01, c.trim);
  bh.position.set(x, y, c.D / 2 + 0.05);
  g.add(bh);
  // shutters
  for (const s of [-1, 1]) {
    const sh = roundedBox(0.12, h + 0.1, 0.05, 0.02, c.timber);
    sh.position.set(x + s * (w / 2 + 0.12), y, c.D / 2 + 0.02);
    g.add(sh);
  }
  if (withBox) {
    const box = roundedBox(w + 0.16, 0.14, 0.2, 0.03, c.stoneDark);
    box.position.set(x, y - h / 2 - 0.1, c.D / 2 + 0.08);
    g.add(box);
  }
}

function signBoard(g, c, text, x, y, z) {
  const tex = makeTextTexture(text, { width: 256, height: 96, bg: '#f4e6cc', fg: '#5c4331', border: '#c9b48f' });
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.43),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }),
  );
  board.position.set(x, y, z);
  g.add(board);
  const bar = roundedBox(1.2, 0.05, 0.05, 0.02, c.timber);
  bar.position.set(x, y + 0.26, z - 0.02);
  g.add(bar);
}

function fence(side, c, z, x0, x1) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 0.55));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const post = roundedBox(0.1, 0.7, 0.1, 0.02, c.timber);
    post.position.set(x, 0.35, z);
    side.add(post);
  }
  const rail = roundedBox(Math.abs(x1 - x0) + 0.12, 0.07, 0.07, 0.02, c.trim);
  rail.position.set((x0 + x1) / 2, 0.5, z);
  side.add(rail);
}

// --- building types --------------------------------------------------------

function cottage(g, c, materials, def) {
  const twoStory = def.id === 'home1' || def.id === 'home2';
  c.wallH = twoStory ? 3.1 : 2.1;
  c.W = 3.4;
  c.D = 2.9;
  const wallTop = plinthWalls(g, c, c.wallH, c.wallMat);
  const top = gableRoof(g, c, wallTop, 1.0);
  chimney(g, c, wallTop, -c.W * 0.28);
  door(g, c, 0);
  windowBox(g, c, -0.95, 1.4, 0.44, 0.5, true);
  windowBox(g, c, 0.95, 1.4, 0.44, 0.5, true);
  if (twoStory) {
    windowBox(g, c, -0.95, 2.55, 0.42, 0.46);
    windowBox(g, c, 0.95, 2.55, 0.42, 0.46);
    windowBox(g, c, 0.95, 2.55, 0.42, 0.46);
  }
  // side windows
  for (const s of [-1, 1]) {
    const w = roundedBox(0.1, 0.46, 0.4, 0.02, c.trim);
    w.position.set((s * c.W) / 2 + s * 0.02, 1.4, 0.2);
    g.add(w);
  }
  // porch
  const porch = roundedBox(1.2, 0.1, 0.9, 0.03, c.timber);
  porch.position.set(0, 0.3, c.D / 2 + 0.5);
  g.add(porch);
  return finish(g, c, top + 0.9, c.W + 0.6, c.D + 1.2);
}

function shop(g, c, materials, def) {
  const isCafe = def.type === 'cafe';
  c.W = 3.9;
  c.D = 3.0;
  c.wallH = 2.3;
  c.wallMat = isCafe ? materials.plasterSage : materials.plasterRose;
  c.roofMat = isCafe ? materials.roofMoss : materials.roofTile;
  const wallTop = plinthWalls(g, c, c.wallH, c.wallMat);
  const top = gableRoof(g, c, wallTop, 1.05);
  chimney(g, c, wallTop, c.W * 0.26);
  // door to the left, bay window to the right
  door(g, c, -1.15);
  const bay = roundedBox(1.5, 0.9, 0.16, 0.03, c.trim);
  bay.position.set(0.55, 1.25, c.D / 2 + 0.02);
  g.add(bay);
  const bayGlass = roundedBox(1.3, 0.72, 0.12, 0.02, materials.window);
  bayGlass.position.set(0.55, 1.25, c.D / 2 - 0.04);
  g.add(bayGlass);
  // awning
  const aw = roundedBox(2.9, 0.07, 0.85, 0.03, isCafe ? materials.mint : materials.butter);
  aw.position.set(0, 1.95, c.D / 2 + 0.42);
  aw.rotation.x = -0.24;
  g.add(aw);
  // sign
  signBoard(g, c, def.name, 0, 2.72, c.D / 2 + 0.12);
  // outdoor bench
  const seat = roundedBox(1.3, 0.09, 0.34, 0.03, c.timber);
  seat.position.set(-0.5, 0.42, c.D / 2 + 0.95);
  g.add(seat);
  for (const s of [-1, 1]) {
    const leg = roundedBox(0.09, 0.42, 0.3, 0.02, c.timber);
    leg.position.set(-0.5 + s * 0.55, 0.21, c.D / 2 + 0.95);
    g.add(leg);
  }
  return finish(g, c, top + 0.9, c.W + 0.6, c.D + 1.4);
}

function station(g, c, materials) {
  c.W = 4.6;
  c.D = 3.2;
  c.wallH = 2.7;
  c.wallMat = materials.plasterWarm;
  c.roofMat = materials.roofSlate;
  const wallTop = plinthWalls(g, c, c.wallH, c.wallMat);
  const top = gableRoof(g, c, wallTop, 1.2);
  chimney(g, c, wallTop, -c.W * 0.3);
  door(g, c, 0, 0.32);
  windowBox(g, c, -1.35, 1.55, 0.6, 0.62);
  windowBox(g, c, 1.35, 1.55, 0.6, 0.62);
  windowBox(g, c, 0, 2.4, 0.7, 0.42);

  // clock
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18), materials.cream);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, wallTop + 0.55, c.D / 2 + 0.04);
  g.add(clock);

  // platform + canopy
  const deck = roundedBox(5.6, 0.16, 1.5, 0.05, materials.stone);
  deck.position.set(0, 0.08, c.D / 2 + 1.3);
  g.add(deck);
  for (const s of [-1, 1]) {
    const post = roundedBox(0.12, 1.9, 0.12, 0.02, c.timber);
    post.position.set(s * 2.2, 1.05, c.D / 2 + 1.9);
    g.add(post);
  }
  const canopy = roundedBox(5.0, 0.1, 1.7, 0.03, c.roofMat);
  canopy.position.set(0, 2.02, c.D / 2 + 1.4);
  canopy.rotation.x = -0.12;
  g.add(canopy);
  signBoard(g, c, '小镇车站', 0, 2.9, c.D / 2 + 0.12);
  return finish(g, c, top + 1.0, c.W + 0.6, c.D + 2.4);
}

function greenhouse(g, c, materials) {
  c.W = 3.0;
  c.D = 2.6;
  const base = roundedBox(c.W + 0.2, 0.4, c.D + 0.2, 0.06, materials.stone);
  base.position.y = 0.2;
  g.add(base);
  const walls = roundedBox(c.W, 1.9, c.D, 0.04, materials.glass);
  walls.position.y = 0.4 + 0.95;
  g.add(walls);
  // frame ribs
  for (let i = 0; i <= 4; i++) {
    const rib = roundedBox(0.06, 1.9, 0.06, 0.02, materials.timber);
    rib.position.set(-c.W / 2 + (c.W * i) / 4, 0.4 + 0.95, c.D / 2);
    g.add(rib);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(c.W * 0.72, 0.9, 4), materials.glass);
  roof.position.y = 0.4 + 1.9 + 0.45;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  door(g, c, 0, 0.4);
  // plant beds
  for (const s of [-1, 1]) {
    const bed = roundedBox(1.1, 0.16, 0.5, 0.03, materials.soil);
    bed.position.set(s * 0.6, 0.48, -0.3);
    g.add(bed);
  }
  return finish(g, c, 3.4, c.W + 0.4, c.D + 0.8);
}

function booth(g, c, materials) {
  c.W = 1.9;
  c.D = 1.7;
  c.wallH = 1.7;
  c.wallMat = materials.plasterBlue;
  c.roofMat = materials.roofTile;
  const wallTop = plinthWalls(g, c, c.wallH, c.wallMat);
  const top = gableRoof(g, c, wallTop, 0.7);
  // counter window
  const counter = roundedBox(1.1, 0.55, 0.1, 0.02, materials.trim);
  counter.position.set(0, 1.25, c.D / 2 + 0.03);
  g.add(counter);
  signBoard(g, c, '售票', 0, 2.2, c.D / 2 + 0.12);
  return finish(g, c, top + 0.7, c.W + 0.4, c.D + 0.6);
}

function library(g, c, materials) {
  c.W = 3.6;
  c.D = 3.0;
  c.wallH = 2.5;
  c.wallMat = materials.plasterBlue;
  c.roofMat = materials.roofSlate;
  const wallTop = plinthWalls(g, c, c.wallH, c.wallMat);
  const top = gableRoof(g, c, wallTop, 1.1);
  chimney(g, c, wallTop, c.W * 0.28);
  door(g, c, 0);
  const big = roundedBox(1.4, 1.1, 0.12, 0.03, c.trim);
  big.position.set(-1.0, 1.5, c.D / 2 + 0.02);
  g.add(big);
  const bigGlass = roundedBox(1.22, 0.92, 0.12, 0.02, materials.window);
  bigGlass.position.set(-1.0, 1.5, c.D / 2 - 0.03);
  g.add(bigGlass);
  signBoard(g, c, '林间书室', 0.9, 2.1, c.D / 2 + 0.12);
  return finish(g, c, top + 0.9, c.W + 0.6, c.D + 1.0);
}

function finish(g, c, height, w, d) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.userData.height = height;
  return { group: g, height, w, d };
}
