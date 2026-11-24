import * as THREE from 'three';

/**
 * Chibi (Q版) avatar of Sze. Big head, big eyes, short limbs.
 * Same design language: long wavy dark hair, round glasses, deep-red knit
 * sweater over a light-blue shirt, black pleated skirt, white socks, black
 * lace-up boots. Procedural only, no external model.
 */
const C = {
  skin: '#f9dcc7',
  hair: '#2a211d',
  hairHi: '#3d302a',
  sweater: '#b31f30',
  sweaterDark: '#8d1524',
  shirt: '#a9cce8',
  skirt: '#1c1c24',
  sock: '#f7f7f4',
  boot: '#16161c',
  glass: '#3a2b26',
  eye: '#231a16',
  lip: '#c9766b',
  blush: '#f2a89a',
};

const H = 1.26;

export function createAvatar() {
  const root = new THREE.Group();

  const m = {
    skin: std(C.skin, 0.85),
    hair: std(C.hair, 0.5),
    hairHi: std(C.hairHi, 0.45),
    sweater: std(C.sweater, 0.95),
    sweaterDark: std(C.sweaterDark, 0.95),
    shirt: std(C.shirt, 0.9),
    skirt: std(C.skirt, 0.88),
    sock: std(C.sock, 0.95),
    boot: std(C.boot, 0.5),
    glass: std(C.glass, 0.35),
    eye: std(C.eye, 0.3),
    lip: std(C.lip, 0.7),
    white: std('#ffffff', 0.3),
    blush: new THREE.MeshStandardMaterial({
      color: C.blush,
      roughness: 0.95,
      transparent: true,
      opacity: 0.5,
    }),
  };

  // ---------------- body ----------------
  const body = new THREE.Group();
  body.position.y = 0.44;
  root.add(body);

  // pleated skirt
  const skirt = pleatedSkirt(0.15, 0.23, 0.14, 20, m.skirt);
  skirt.position.y = -0.02;
  body.add(skirt);

  // short legs + boots
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.075, -0.08, 0);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.16, 10), m.sock);
    sock.position.y = -0.11;
    leg.add(sock);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.054, 0.09, 10), m.boot);
    shaft.position.y = -0.185;
    leg.add(shaft);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), m.boot);
    foot.scale.set(1, 0.6, 1.5);
    foot.position.set(0, -0.225, 0.03);
    leg.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.16), m.boot);
    sole.position.set(0, -0.245, 0.03);
    leg.add(sole);
    // laces
    for (let i = 0; i < 3; i++) {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.007, 0.007), m.sock);
      lace.position.set(0, -0.15 - i * 0.028, 0.05);
      leg.add(lace);
    }
    body.add(leg);
    legs.push(leg);
  }

  // blue shirt hem under the sweater
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.16, 0.07, 18), m.shirt);
  hem.position.y = 0.03;
  body.add(hem);

  // sweater torso: short and rounded
  const torso = new THREE.Mesh(torsoProfile(), m.sweater);
  torso.position.y = 0.02;
  body.add(torso);
  for (let i = 0; i < 2; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.148 - i * 0.006, 0.005, 5, 20), m.sweaterDark);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.1 + i * 0.075;
    body.add(band);
  }

  // shirt collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 18), m.shirt);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.36;
  body.add(collar);

  // neck: fills the gap between head and body so it never reads as a black band
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.092, 0.16, 12), m.skin);
  neck.position.y = 0.4;
  body.add(neck);
  const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.024, 6, 18), m.shirt);
  collar2.rotation.x = Math.PI / 2;
  collar2.position.y = 0.36;
  body.add(collar2);

  // short arms
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.16, 0.25, 0.01);
    shoulder.rotation.z = side * 0.16;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.17, 10), m.sweater);
    sleeve.position.y = -0.085;
    shoulder.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.03, 10), m.shirt);
    cuff.position.y = -0.175;
    shoulder.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m.skin);
    hand.scale.set(0.95, 0.85, 0.85);
    hand.position.y = -0.215;
    shoulder.add(hand);
    body.add(shoulder);
    arms.push(shoulder);
  }

  // ---------------- head ----------------
  const head = new THREE.Group();
  head.position.y = 0.62; // relative to body => ~1.06 world
  body.add(head);
  const HEAD_R = 0.25;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 26, 20), m.skin);
  skull.scale.set(1, 0.98, 0.94);
  head.add(skull);

  // big chibi eyes
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), m.white);
    white.scale.set(0.85, 1, 0.45);
    white.position.set(side * 0.1, -0.015, 0.2);
    head.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), m.eye);
    iris.scale.set(0.9, 1, 0.5);
    iris.position.set(side * 0.1, -0.02, 0.225);
    head.add(iris);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), m.white);
    glint.position.set(side * 0.1 + 0.02, 0.012, 0.245);
    head.add(glint);
    const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), m.white);
    glint2.position.set(side * 0.1 - 0.018, -0.045, 0.245);
    head.add(glint2);

    // round glasses
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 6, 22), m.glass);
    rim.position.set(side * 0.1, -0.018, 0.228);
    head.add(rim);
    const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6), m.glass);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(side * 0.175, 0.0, 0.14);
    head.add(temple);

    // blush
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), m.blush);
    blush.position.set(side * 0.155, -0.1, 0.19);
    blush.rotation.y = side * 0.4;
    head.add(blush);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), m.glass);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, -0.012, 0.235);
  head.add(bridge);

  // tiny mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 5, 12, Math.PI), m.lip);
  mouth.position.set(0, -0.12, 0.215);
  mouth.rotation.z = Math.PI;
  mouth.scale.set(1, 0.7, 1);
  head.add(mouth);

  // ---------------- hair ----------------
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R + 0.018, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), m.hair);
  cap.position.set(0, 0.02, -0.055);
  hairGroup.add(cap);

  // fringe locks (short, kept clearly above the eyes)
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.075;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.2, 0.115),
      new THREE.Vector3(x * 1.06, 0.165, 0.18),
      new THREE.Vector3(x * 1.12, 0.125, 0.194),
    ]);
    const lock = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.026 - Math.abs(i) * 0.004, 6, false), m.hair);
    hairGroup.add(lock);
  }

  // long hair: the length now comes from strands (the lathe mass only covers
  // the skull back, so the neck stays clear)
  const backMass = new THREE.Mesh(backHairProfile(), m.hair);
  backMass.position.set(0, -0.04, -0.05);
  hairGroup.add(backMass);

  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const sx = side * (0.185 + k * 0.02);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, 0.1, -0.02),
        new THREE.Vector3(sx * 1.2, -0.12, 0.05),
        new THREE.Vector3(sx * 1.08, -0.34, 0.06),
        new THREE.Vector3(sx * 0.9, -0.54, 0.02),
      ]);
      const strand = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.036 - k * 0.006, 7, false),
        k === 0 ? m.hairHi : m.hair,
      );
      hairGroup.add(strand);
    }
  }

  // back of the head: volume + explicit strands (no bald dome)
  for (let i = -2; i <= 2; i++) {
    const sx = i * 0.08;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.17, -0.12),
      new THREE.Vector3(sx * 1.06, 0.02, -0.2),
      new THREE.Vector3(sx * 1.08, -0.18, -0.18),
      new THREE.Vector3(sx * 0.95, -0.38, -0.12),
    ]);
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 14, 0.036 - Math.abs(i) * 0.004, 7, false),
      i === 0 ? m.hairHi : m.hair,
    );
    hairGroup.add(strand);
  }

  // ---------------- animation ----------------
  let t = 0;
  let walk = 0;
  let waveT = 0;
  let sitTarget = 0;
  let sit = 0;

  function setSitting(on) {
    sitTarget = on ? 1 : 0;
  }

  function update(dt, isWalking) {
    t += dt;
    walk += ((isWalking ? 1 : 0) - walk) * Math.min(1, dt * 10);
    sit += (sitTarget - sit) * Math.min(1, dt * 7);
    const s = Math.sin(t * 8.4);
    const amp = 0.62 * walk * (1 - sit);

    legs[0].rotation.x = s * amp;
    legs[1].rotation.x = -s * amp;
    arms[0].rotation.x = -s * amp * 0.8;
    arms[1].rotation.x = s * amp * 0.8;

    const bob = Math.abs(Math.sin(t * 8.4)) * 0.03 * walk;
    body.position.y = 0.44 + bob + Math.sin(t * 1.8) * 0.006 * (1 - walk);
    body.rotation.z = s * 0.03 * walk;

    // sitting: hips on the seat, legs angled down in front of the bench
    if (sit > 0.02) {
      legs[0].rotation.x = -0.72 * sit;
      legs[1].rotation.x = -0.72 * sit;
      arms[0].rotation.x = -0.22 * sit;
      arms[1].rotation.x = -0.22 * sit;
      body.rotation.z *= 1 - sit;
    }
    head.rotation.z = -s * 0.04 * walk;
    head.rotation.y = Math.sin(t * 0.8) * 0.09 * (1 - walk);
    head.position.y = 0.62 + Math.sin(t * 1.8) * 0.008 * (1 - walk);
    hairGroup.rotation.z = -s * 0.05 * walk;

    if (waveT > 0) {
      waveT -= dt;
      arms[1].rotation.x = -2.5;
      arms[1].rotation.z = -0.4;
    } else {
      arms[1].rotation.z = -0.16;
    }
  }

  function wave(sec = 1.8) {
    waveT = sec;
  }

  root.scale.setScalar(H / 1.26);

  return {
    root,
    update,
    wave,
    setSitting,
    labelAnchor: head,
    setHighlight() {},
  };
}

// ---------------------------------------------------------------- helpers

function std(color, roughness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function torsoProfile() {
  const pts = [];
  const add = (r, y) => pts.push(new THREE.Vector2(r, y));
  add(0.13, -0.08);
  add(0.15, -0.03);
  add(0.165, 0.04);
  add(0.175, 0.12);
  add(0.185, 0.19);
  add(0.175, 0.25);
  add(0.13, 0.31);
  add(0.085, 0.35);
  return new THREE.LatheGeometry(pts, 20);
}

function backHairProfile() {
  const pts = [];
  const add = (r, y) => pts.push(new THREE.Vector2(r, y));
  // stops at jaw level: it is a full lathe, so letting it reach the neck would
  // wrap around the neck and read as a black band from the front
  add(0.0, -0.3);
  add(0.06, -0.296);
  add(0.11, -0.28);
  add(0.15, -0.25);
  add(0.185, -0.21);
  add(0.215, -0.14);
  add(0.235, -0.05);
  add(0.24, 0.02);
  add(0.22, 0.12);
  add(0.15, 0.17);
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.scale(1, 1, 0.78);
  return geo;
}

function pleatedSkirt(topR, bottomR, h, segments, mat) {
  const pos = [];
  const idx = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const pleat = i % 2 === 0 ? 1 : 0.92;
    pos.push(Math.cos(a) * topR, h / 2, Math.sin(a) * topR);
    pos.push(Math.cos(a) * bottomR * pleat, -h / 2, Math.sin(a) * bottomR * pleat);
  }
  for (let i = 0; i < segments; i++) {
    const i2 = (i + 1) % segments;
    idx.push(i * 2, i2 * 2, i * 2 + 1);
    idx.push(i * 2 + 1, i2 * 2, i2 * 2 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}
