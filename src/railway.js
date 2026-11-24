import * as THREE from 'three';
import { WORLD_SCALE } from './config.js';
import { PLAN } from './townPlan.js';
import { terrainHeight } from './terrain.js';
import { roundedBox, makeTextTexture, makeHighlightRing } from './helpers.js';

/**
 * Authored rear railway: a reversible shuttle between rail-west and rail-east.
 * The route is at railTopY on a supported bed; each carriage occupies its own
 * distance; stops reference the MIDPOINT of the complete consist.
 */
const RAIL_Y = PLAN.railway.railTopY;
const CRUISE = 4.5;
const STOP_TIME = 2.8;

export function createRailway(materials) {
  const root = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    PLAN.railway.centerlineXZ.map(([x, z]) => new THREE.Vector3(x, RAIL_Y, z)),
    PLAN.railway.closed === true,
    'catmullrom',
    0.5,
  );
  const length = curve.getLength();

  const gauge = 1.1;
  for (const s of [1, -1]) {
    const rc = new THREE.CatmullRomCurve3(offsetCurve(curve, (s * gauge) / 2, 320), false, 'catmullrom', 0.5);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(rc, 340, 0.07, 6, false), materials.stoneDark);
    rail.receiveShadow = true;
    root.add(rail);
  }

  const N = 210;
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.1, 0.3), materials.timber, N);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    dummy.position.set(p.x, RAIL_Y - 0.06, p.z);
    dummy.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.receiveShadow = true;
  root.add(sleepers);

  const platforms = [];
  for (const p of PLAN.railway.platforms) {
    const g = new THREE.Group();
    const gy = terrainHeight(p.centerXZ[0], p.centerXZ[1]);
    g.position.set(p.centerXZ[0], gy, p.centerXZ[1]);
    g.rotation.y = 0;
    const deck = roundedBox(p.dimsXZ[0], 0.24, p.dimsXZ[1], 0.06, materials.stone);
    deck.position.y = 0.12;
    g.add(deck);
    const post = roundedBox(0.12, 1.7, 0.12, 0.02, materials.timber);
    post.position.set(-p.dimsXZ[0] / 2 + 0.6, 0.85, 0.6);
    g.add(post);
    const tex = makeTextTexture(p.name, { width: 256, height: 90, bg: '#f4e6cc', fg: '#5c4331', border: '#c9b48f' });
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.6),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }),
    );
    board.position.set(-p.dimsXZ[0] / 2 + 0.6, 1.7, 0.64);
    g.add(board);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 2.2, 0);
    g.add(anchor);
    const ring = makeHighlightRing(3.0, '#e8c57a');
    g.add(ring);
    root.add(g);
    platforms.push({ ...p, group: g, anchor, ring, y: gy, dist: nearestDist(curve, length, p.stopXZ) });
  }

  const cars = PLAN.railway.cars.map((c) => {
    const obj = c.id === 'loco' ? locomotive(materials) : carriage(materials);
    obj.scale.setScalar(WORLD_SCALE);
    root.add(obj);
    return { def: c, obj };
  });

  // Consist extents (world): front overhang of the loco, rear overhang of the last car.
  const frontHalf = PLAN.railway.cars[0].length / 2;
  const rearHalf = Math.max(...PLAN.railway.cars.map((c) => c.offset + c.length / 2));
  const midOffset = (frontHalf - rearHalf) / 2; // midpoint = locoDist + midOffset (negative)
  const stopLoco = platforms.map((p) => (((p.dist - midOffset) % length) + length) % length);
  let dist = stopLoco[0];
  let wait = 0;
  let timeScale = 1;
  let holdCount = 0;
  let curSpeed = 0;
  const listeners = [];
  const journeyLog = [];

  function placeAll() {
    for (const { def, obj } of cars) placeAtDistance(obj, curve, length, dist - def.offset);
  }
  placeAll();

  function nextStop() {
    let best = Infinity;
    let idx = 0;
    for (let i = 0; i < stopLoco.length; i++) {
      const d = (((stopLoco[i] - dist) % length) + length) % length;
      if (d > 0.02 && d < best) {
        best = d;
        idx = i;
      }
    }
    return { idx, d: best };
  }

  function update(dt) {
    dt *= timeScale;
    if (wait > 0) {
      wait -= dt;
      placeAll();
      return;
    }
    const ns = nextStop();

    // a pedestrian is crossing: brake to a full stop and wait
    if (holdCount > 0) {
      curSpeed = Math.max(0, curSpeed - 6 * dt);
      if (curSpeed > 0.005) dist = (dist + curSpeed * dt) % length;
      placeAll();
      return;
    }

    const want = CRUISE * Math.max(0.16, Math.min(1, ns.d / 4));
    curSpeed += (want - curSpeed) * Math.min(1, dt * 3);
    dist = (dist + curSpeed * dt) % length;
    if (ns.d < 0.08) {
      dist = stopLoco[ns.idx];
      journeyLog.push({ station: platforms[ns.idx].id, dist: +dist.toFixed(1), cars: cars.length });
      wait = STOP_TIME;
      for (const fn of listeners) fn(platforms[ns.idx]);
    }
    placeAll();
  }

  function validate(obstacles) {
    const confirmed = [];
    const safety = [];
    const broad = [];
    const seen = new Set();
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * length;
      for (const { def } of cars) {
        const cd = d - def.offset;
        if (cd < -0.01 || cd > length + 0.01) continue;
        const u = THREE.MathUtils.clamp(cd / length, 0, 1);
        const p = curve.getPointAt(u);
        const tan = curve.getTangentAt(u);
        const fl = Math.hypot(tan.x, tan.z) || 1;
        const fx = tan.x / fl;
        const fz = tan.z / fl;
        const y0 = p.y;
        const y1 = p.y + def.height;
        for (const o of obstacles) {
          const dd = Math.hypot(p.x - o.x, p.z - o.z);
          if (dd > def.length / 2 + o.radius + PLAN.railway.safetyMargin + 12) continue;
          const vertical = y1 > (o.y0 ?? -100) && y0 < (o.y1 ?? 100);
          const gap = obbGap(p.x, p.z, def.length / 2, def.width / 2, fx, fz, o.x, o.z, o.hx ?? o.radius, o.hz ?? o.radius, o.fx ?? 1, o.fz ?? 0);
          const key = def.id + '|' + o.id + '|' + (gap < 0 ? 'c' : 's');
          if (seen.has(key)) continue;
          if (gap < 0 && vertical) {
            seen.add(key);
            confirmed.push({ car: def.id, obstacle: o.id, gap: +gap.toFixed(2) });
          } else if (gap < PLAN.railway.safetyMargin && vertical) {
            seen.add(key);
            safety.push({ car: def.id, obstacle: o.id, gap: +gap.toFixed(2) });
          } else if (gap < 0 && !vertical) {
            seen.add(key);
            broad.push({ car: def.id, obstacle: o.id, gap: +gap.toFixed(2) });
          }
        }
      }
    }
    return { confirmed, safety, broad };
  }

  return {
    root,
    update,
    stations: platforms,
    stationGroups: platforms.map((p) => ({ station: p, group: p.group, anchor: p.anchor, ring: p.ring })),
    curve,
    length,
    cars,
    validate,
    onStation: (fn) => listeners.push(fn),
    requestHold: () => {
      holdCount += 1;
    },
    releaseHold: () => {
      holdCount = Math.max(0, holdCount - 1);
    },
    get held() {
      return holdCount > 0;
    },
    setTimeScale: (s) => {
      timeScale = s;
    },
    getLog: () => journeyLog,
    getMidpoint: () => {
      const p = curve.getPointAt(THREE.MathUtils.clamp((dist + midOffset) / length, 0, 1));
      return p.clone();
    },
    getTrainPos: () => {
      const p = curve.getPointAt(THREE.MathUtils.clamp(dist / length, 0, 1));
      return p.clone();
    },
  };
}

function obbGap(ax, az, ahx, ahz, afx, afz, bx, bz, bhx, bhz, bfx, bfz) {
  const asx = -afz;
  const asz = afx;
  const bsx = -bfz;
  const bsz = bfx;
  const axes = [[afx, afz], [asx, asz], [bfx, bfz], [bsx, bsz]];
  let maxGap = -Infinity;
  for (const [ux, uz] of axes) {
    const ra = Math.abs(ahx * (afx * ux + afz * uz)) + Math.abs(ahz * (asx * ux + asz * uz));
    const rb = Math.abs(bhx * (bfx * ux + bfz * uz)) + Math.abs(bhz * (bsx * ux + bsz * uz));
    const d = Math.abs((ax - bx) * ux + (az - bz) * uz);
    maxGap = Math.max(maxGap, d - ra - rb);
  }
  return maxGap;
}

function offsetCurve(curve, offset, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const len = Math.hypot(-tan.z, tan.x) || 1;
    out.push(new THREE.Vector3(p.x + (-tan.z / len) * offset, p.y, p.z + (tan.x / len) * offset));
  }
  return out;
}

function nearestDist(curve, length, pos) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i <= 600; i++) {
    const u = i / 600;
    const p = curve.getPointAt(u);
    const d = (p.x - pos[0]) ** 2 + (p.z - pos[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = u;
    }
  }
  return best * length;
}

export function placeAtDistance(obj, curve, length, d) {
  const u = (((d % length) + length) % length) / length;
  const p = curve.getPointAt(u);
  const tan = curve.getTangentAt(u);
  obj.position.copy(p);
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(tan, up).normalize();
  const up2 = new THREE.Vector3().crossVectors(side, tan).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tan, up2, side));
}

function wheels(g, materials, xs, y = 0.24) {
  const geo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12);
  for (const x of xs) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(geo, materials.stoneDark);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, side * 0.42);
      g.add(w);
    }
  }
}

function locomotive(materials) {
  const g = new THREE.Group();
  const body = roundedBox(2.1, 0.85, 0.95, 0.14, materials.roofTile);
  body.position.y = 0.72;
  g.add(body);
  const cab = roundedBox(0.95, 1.0, 0.95, 0.1, materials.plasterWarm);
  cab.position.set(-0.55, 1.18, 0);
  g.add(cab);
  const cabRoof = roundedBox(1.05, 0.12, 1.05, 0.04, materials.roofSlate);
  cabRoof.position.set(-0.55, 1.72, 0);
  g.add(cabRoof);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.52, 10), materials.stoneDark);
  chimney.position.set(0.62, 1.34, 0);
  g.add(chimney);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), materials.bulbAmber);
  lamp.position.set(1.08, 0.82, 0);
  g.add(lamp);
  wheels(g, materials, [-0.6, 0.1, 0.75]);
  return g;
}

function carriage(materials) {
  const g = new THREE.Group();
  const body = roundedBox(1.95, 0.8, 0.95, 0.12, materials.cream);
  body.position.y = 0.7;
  g.add(body);
  const stripe = roundedBox(1.97, 0.15, 0.97, 0.04, materials.roofTile);
  stripe.position.y = 0.92;
  g.add(stripe);
  const roof = roundedBox(2.05, 0.1, 1.02, 0.04, materials.timber);
  roof.position.y = 1.16;
  g.add(roof);
  for (const x of [-0.6, 0, 0.6]) {
    for (const side of [-1, 1]) {
      const win = roundedBox(0.32, 0.32, 0.06, 0.02, materials.window);
      win.position.set(x, 0.8, side * 0.49);
      g.add(win);
    }
  }
  wheels(g, materials, [-0.55, 0.55], 0.22);
  return g;
}
