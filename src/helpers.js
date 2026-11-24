import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Rounded box with the radius safely clamped to half the smallest side. */
export function roundedBox(width, height, depth, radius, material) {
  const safeR = Math.max(0.01, Math.min(radius, Math.min(width, height, depth) / 2 - 0.001));
  const geo = new RoundedBoxGeometry(width, height, depth, 3, safeR);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Cylinder oriented between two world-space points. */
export function cylinderBetween(a, b, radius, material, radialSegments = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radialSegments, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Soft flat ring used as a hover highlight under an attraction. */
export function makeHighlightRing(radius, colorHex) {
  const geo = new THREE.RingGeometry(Math.max(0.2, radius - 0.45), radius, 56);
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.08;
  mesh.visible = false;
  mesh.raycast = () => {}; // never picked by the raycaster
  return mesh;
}

/** Canvas texture with rounded card + Chinese text (used for the entrance sign). */
export function makeTextTexture(text, opts = {}) {
  const {
    width = 512,
    height = 256,
    bg = '#fff4df',
    fg = '#7a5f4b',
    border = '#a8dcc5',
  } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const r = Math.min(width, height) * 0.16;
  ctx.fillStyle = bg;
  roundRect(ctx, 6, 6, width - 12, height - 12, r);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = border;
  roundRect(ctx, 16, 16, width - 32, height - 32, r - 10);
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.floor(height * 0.34);
  ctx.font = `700 ${fontSize}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Segoe UI",sans-serif`;
  ctx.fillText(text, width / 2, height / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Write a transform into an InstancedMesh slot. `scale` is a number or Vector3. */
export function setInstance(instanced, i, position, scale, rotationY = 0) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  const s = scale instanceof THREE.Vector3 ? scale : new THREE.Vector3().setScalar(scale);
  m.compose(position, q, s);
  instanced.setMatrixAt(i, m);
}

/** Yaw so that an object's local +Z faces `target` from `point`. */
export function yawToward(point, target) {
  const p = Array.isArray(point) ? new THREE.Vector3(...point) : point;
  const t = Array.isArray(target) ? new THREE.Vector3(...target) : target;
  return Math.atan2(t.x - p.x, t.z - p.z);
}

/** Five-pointed star shape (recurring motif on lanterns and the sign). */
let _starGeo = null;
export function makeStar(material, outer = 0.16) {
  if (!_starGeo) {
    const shape = new THREE.Shape();
    const points = 5;
    const inner = 0.16 * 0.45;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? 0.16 : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    _starGeo = new THREE.ShapeGeometry(shape);
  }
  const mesh = new THREE.Mesh(_starGeo, material);
  mesh.scale.setScalar(outer / 0.16);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Deterministic PRNG so the scenery is stable between reloads. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
