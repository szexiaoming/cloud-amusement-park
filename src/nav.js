import * as THREE from 'three';
import { PLAN } from './townPlan.js';

/**
 * Grid navigation for the avatar: A* over a 1-unit grid of the island,
 * blocked by island edges and every solid footprint (buildings, trees,
 * platforms, rides, mountains). Paths are then string-pulled so the walk
 * looks like a natural route instead of a staircase.
 */
const CELL = 1.0;
const MIN_X = -40;
const MAX_X = 40;
const MIN_Z = -32;

export function createNav(obstacles, islet = null) {
  const MAX_Z = islet ? 62 : 30;
  const COLS = Math.round((MAX_X - MIN_X) / CELL);
  const ROWS = Math.round((MAX_Z - MIN_Z) / CELL);
  const poly = PLAN.island.boundaryXZ;
  const blocked = new Uint8Array(COLS * ROWS);

  const insideIsland = (x, z) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };

  const inFootprint = (x, z, o, pad) => {
    const dx = x - o.x;
    const dz = z - o.z;
    const fx = o.fx ?? 1;
    const fz = o.fz ?? 0;
    const lx = dx * fx + dz * fz;
    const lz = -dx * fz + dz * fx;
    return Math.abs(lx) <= (o.hx ?? 0.4) + pad && Math.abs(lz) <= (o.hz ?? 0.4) + pad;
  };

  const solid = (x, z, pad) => {
    for (const o of obstacles) if (inFootprint(x, z, o, pad)) return true;
    return false;
  };

  const walkableArea = (x, z) =>
    insideIsland(x, z) || (islet !== null && Math.hypot(x - islet.x, z - islet.z) < islet.r);

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = MIN_X + (i + 0.5) * CELL;
      const z = MIN_Z + (j + 0.5) * CELL;
      const ok = walkableArea(x, z) && !solid(x, z, 0.32);
      blocked[j * COLS + i] = ok ? 0 : 1;
    }
  }

  const toCell = (x, z) => [
    Math.max(0, Math.min(COLS - 1, Math.floor((x - MIN_X) / CELL))),
    Math.max(0, Math.min(ROWS - 1, Math.floor((z - MIN_Z) / CELL))),
  ];
  const cellCenter = (i, j) => [MIN_X + (i + 0.5) * CELL, MIN_Z + (j + 0.5) * CELL];

  function nearestOpen(i, j) {
    if (!blocked[j * COLS + i]) return [i, j];
    for (let r = 1; r <= 6; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
          if (!blocked[nj * COLS + ni]) return [ni, nj];
        }
      }
    }
    return null;
  }

  function lineClear(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(2, Math.ceil(d / (CELL * 0.5)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      if (!walkableArea(x, z) || solid(x, z, 0.26)) return false;
    }
    return true;
  }

  function findPath(sx, sz, tx, tz) {
    const [si0, sj0] = toCell(sx, sz);
    const [ti0, tj0] = toCell(tx, tz);
    const s = nearestOpen(si0, sj0);
    const t = nearestOpen(ti0, tj0);
    if (!s || !t) return null;
    if (s[0] === t[0] && s[1] === t[1]) return [{ x: tx, z: tz }];

    const N = COLS * ROWS;
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = s[1] * COLS + s[0];
    const goal = t[1] * COLS + t[0];
    const h = (i, j) => {
      const dx = Math.abs(i - t[0]);
      const dz = Math.abs(j - t[1]);
      return Math.max(dx, dz) + 0.41 * Math.min(dx, dz);
    };

    gScore[start] = 0;
    const open = [start];
    const fScore = new Map([[start, h(s[0], s[1])]]);

    while (open.length) {
      let bi = 0;
      let bf = Infinity;
      for (let k = 0; k < open.length; k++) {
        const f = fScore.get(open[k]) ?? Infinity;
        if (f < bf) {
          bf = f;
          bi = k;
        }
      }
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % COLS;
      const cj = (cur / COLS) | 0;

      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
          const ni2 = nj * COLS + ni;
          if (blocked[ni2] || closed[ni2]) continue;
          // no cutting corners diagonally
          if (di !== 0 && dj !== 0) {
            if (blocked[cj * COLS + ni] || blocked[nj * COLS + ci]) continue;
          }
          const step = di !== 0 && dj !== 0 ? 1.41 : 1;
          const tentative = gScore[cur] + step;
          if (tentative < gScore[ni2]) {
            gScore[ni2] = tentative;
            came[ni2] = cur;
            fScore.set(ni2, tentative + h(ni, nj));
            if (!open.includes(ni2)) open.push(ni2);
          }
        }
      }
    }

    if (came[goal] === -1) return null;

    const cells = [];
    let node = goal;
    while (node !== -1) {
      cells.push([node % COLS, (node / COLS) | 0]);
      if (node === start) break;
      node = came[node];
    }
    cells.reverse();

    const pts = cells.map(([i, j]) => {
      const [x, z] = cellCenter(i, j);
      return { x, z };
    });
    pts.push({ x: tx, z: tz });

    // string-pull: keep only the corners that are actually needed
    const out = [];
    let anchor = { x: sx, z: sz };
    let idx = 0;
    while (idx < pts.length) {
      let far = idx;
      for (let k = pts.length - 1; k >= idx; k--) {
        if (lineClear(anchor.x, anchor.z, pts[k].x, pts[k].z)) {
          far = k;
          break;
        }
      }
      out.push(pts[far]);
      anchor = pts[far];
      idx = far + 1;
    }
    return out;
  }

  return { findPath, insideIsland, solid, blocked };
}
