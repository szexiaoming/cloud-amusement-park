import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CAMERA, LIGHTS, BLOOM, CAPTIONS, UI, MODE_KEY, FIREFLIES, WEATHER, WORLD_SCALE } from './config.js';
import { createMaterials } from './materials.js';
import { createTerrain, terrainHeight, railDistZ } from './terrain.js';
import { createPaths } from './paths.js';
import { createBuilding } from './buildings.js';
import { createTown } from './town.js';
import { createMountain } from './mountain.js';
import { createAvatar } from './avatar.js';
import { createNav } from './nav.js';
import { createEntrance, ENTRANCE, entranceHeight, ENTRANCE_SOLIDS } from './entrance.js';
import { createBoat } from './boat.js';
import { createVegetation } from './vegetation.js';
import { createProps } from './props.js';
import { createRailway } from './railway.js';
import { PLAN } from './townPlan.js';
import { makeHighlightRing } from './helpers.js';
import { createFerrisWheel } from './attractions/ferrisWheel.js';
import { createCarousel } from './attractions/carousel.js';
import { createClouds } from './clouds.js';
import { createBalloons } from './balloons.js';
import { createInteraction } from './interaction.js';
import { createEnvironment } from './environment.js';
import { createSky } from './sky.js';
import { createStars, createFireflies } from './particles.js';
import { createDecorativeLights } from './decorativeLights.js';
import { getSeasonKey, SEASONS, applySeason, createSeasonParticles } from './season.js';
import { createWeather } from './weather.js';
import { createMemoryCard } from './memoryCard.js';

const container = document.getElementById('app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = window.matchMedia('(pointer: coarse)').matches;
const isMobile = isCoarse || Math.min(window.innerWidth, window.innerHeight) < 480;
const useBloom = !isMobile && !reducedMotion;

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cdeaf4', 60, 200);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, CAMERA.near, CAMERA.far);
camera.position.set(...CAMERA.defaultPosition);
camera.lookAt(...CAMERA.defaultTarget);

// Projected fit: island bounds -> camera right/up, authored padding, expanded
// to the viewport aspect. View direction stays fixed.
{
  const box = new THREE.Box3(new THREE.Vector3(-35, -7, -27), new THREE.Vector3(35, 1.2, 25));
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  let minR = Infinity;
  let maxR = -Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const v = new THREE.Vector3(x, y, z).sub(camera.position);
        const r = v.dot(right);
        const u = v.dot(up);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
      }
    }
  }
  const pad = 1 + PLAN.camera.pad * 2;
  let W = (maxR - minR) * pad;
  let H = (maxU - minU) * pad;
  const aspect = window.innerWidth / window.innerHeight;
  if (W / aspect > H) H = W / aspect;
  else W = H * aspect;
  CAMERA.frustumHalfHeight = H / 2;
  camera.left = -W / 2;
  camera.right = W / 2;
  camera.top = H / 2;
  camera.bottom = -H / 2;
  camera.updateProjectionMatrix();
}

function resizeCamera() {
  const aspect = container.clientWidth / container.clientHeight;
  const half = CAMERA.frustumHalfHeight;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
}
resizeCamera();

// --- Lights ---
const hemi = new THREE.HemisphereLight('#e6f6fd', '#c8c2ae', 0.9);
scene.add(hemi);
const ambient = new THREE.AmbientLight('#ffffff', 0.22);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight('#fff3df', 1.85);
keyLight.position.set(16, 26, 12);
keyLight.castShadow = true;
const sb = LIGHTS.shadowBounds;
keyLight.shadow.camera.left = -sb;
keyLight.shadow.camera.right = sb;
keyLight.shadow.camera.top = sb;
keyLight.shadow.camera.bottom = -sb;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 140;
keyLight.shadow.mapSize.set(LIGHTS.shadowMapSize, LIGHTS.shadowMapSize);
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.03;
keyLight.shadow.radius = LIGHTS.shadowRadius;
scene.add(keyLight);
scene.add(keyLight.target);

// --- Environment ---
const environment = createEnvironment(reducedMotion);
const sky = createSky();
scene.add(sky.mesh);
const stars = createStars({ reducedMotion });
scene.add(stars.root);
const fireflies = createFireflies({
  count: isMobile ? Math.floor(FIREFLIES.count / 2) : FIREFLIES.count,
  reducedMotion,
});
scene.add(fireflies.root);

const materials = createMaterials();

// --- Town (design space, scaled once) ---
const townRoot = new THREE.Group();
scene.add(townRoot);

const terrainRoot = createTerrain(materials);
townRoot.add(terrainRoot);

const mountain = createMountain(materials);
townRoot.add(mountain.root);
const urlParams = new URLSearchParams(window.location.search);
townRoot.add(createPaths(materials));
townRoot.add(createProps(materials));

// Railway corridor is reserved before any scenery is placed.
const railway = createRailway(materials);
townRoot.add(railway.root);

const vegetation = createVegetation(materials, railway.curve);
townRoot.add(vegetation.root);

const town = createTown(materials);
townRoot.add(town.root);
const places = town.places;
const obstacles = places.map((p) => ({
  id: p.id,
  x: p.footprint.x,
  z: p.footprint.z,
  hx: p.footprint.hx,
  hz: p.footprint.hz,
  fx: p.footprint.fx,
  fz: p.footprint.fz,
  y0: p.footprint.y0,
  y1: p.footprint.y1,
  radius: p.footprint.radius,
}));

const ferris = createFerrisWheel(materials, [PLAN.attractions[0].centerXZ[0], PLAN.attractions[0].padY, PLAN.attractions[0].centerXZ[1]]);
ferris.root.scale.setScalar(WORLD_SCALE);
ferris.root.rotation.y = (PLAN.attractions[0].yawDeg * Math.PI) / 180;
const carousel = createCarousel(materials, [PLAN.attractions[1].centerXZ[0], PLAN.attractions[1].padY, PLAN.attractions[1].centerXZ[1]]);
carousel.root.scale.setScalar(WORLD_SCALE);
carousel.root.rotation.y = (PLAN.attractions[1].yawDeg * Math.PI) / 180;
townRoot.add(ferris.root, carousel.root);

for (const sg of railway.stationGroups) {
  places.push({
    kind: 'station',
    id: sg.station.id,
    name: sg.station.name,
    root: sg.group,
    labelAnchor: sg.anchor,
    setHighlight: (on) => { sg.ring.visible = on; },
    focus: new THREE.Vector3(sg.station.centerXZ[0], sg.station.y + 1.4, sg.station.centerXZ[1]),
  });
}

// --- Railway clearance validation + dev view ---
for (const t of vegetation.trees) {
  const gy = terrainHeight(t.x, t.z);
  obstacles.push({ id: 'tree', x: t.x, z: t.z, hx: 1.6 * t.s, hz: 1.6 * t.s, fx: 1, fz: 0, y0: gy, y1: gy + 3.4 * t.s, radius: 1.7 * t.s });
}
obstacles.push({ id: 'ferris', x: PLAN.attractions[0].centerXZ[0], z: PLAN.attractions[0].centerXZ[1], hx: 6, hz: 2.5, fx: 1, fz: 0, y0: 0.5, y1: 14.5, radius: 6.5 });
obstacles.push({ id: 'carousel', x: PLAN.attractions[1].centerXZ[0], z: PLAN.attractions[1].centerXZ[1], hx: 4, hz: 4, fx: 1, fz: 0, y0: 0.1, y1: 6.1, radius: 5 });
for (const sg of railway.stationGroups) {
  obstacles.push({ id: 'platform-' + sg.station.id, x: sg.station.centerXZ[0], z: sg.station.centerXZ[1], hx: sg.station.dimsXZ[0] / 2, hz: sg.station.dimsXZ[1] / 2, fx: 1, fz: 0, y0: sg.station.y, y1: sg.station.y + 1.4, radius: 6.2 });
}
obstacles.push(...mountain.obstacles);

// square furniture + entrance sign are solid for the avatar too
{
  const sp = PLAN.squareProps;
  obstacles.push({ id: 'well', x: sp.well[0], z: sp.well[1], hx: 0.78, hz: 0.78, fx: 1, fz: 0, y0: 0, y1: 1.5, radius: 0.9 });
  obstacles.push({ id: 'notice', x: sp.notice[0], z: sp.notice[1], hx: 0.72, hz: 0.22, fx: 1, fz: 0, y0: 0, y1: 1.9, radius: 0.8 });
  for (const [bx, bz, byaw] of sp.benches) {
    obstacles.push({ id: 'bench', x: bx, z: bz, hx: 0.92, hz: 0.34, fx: Math.sin(byaw), fz: Math.cos(byaw), y0: 0, y1: 0.9, radius: 1.0 });
  }
  for (const [lx, lz] of sp.lamps) {
    obstacles.push({ id: 'lamp', x: lx, z: lz, hx: 0.22, hz: 0.22, fx: 1, fz: 0, y0: 0, y1: 2.0, radius: 0.3 });
  }
  const es = PLAN.entranceSign.centerXZ;
  obstacles.push({ id: 'entrance-sign', x: es[0], z: es[1], hx: 0.95, hz: 0.22, fx: Math.sin((PLAN.entranceSign.yawDeg * Math.PI) / 180), fz: Math.cos((PLAN.entranceSign.yawDeg * Math.PI) / 180), y0: 0, y1: 2.0, radius: 1.0 });
}
const railCheck = railway.validate(obstacles);
if (railCheck.confirmed.length || railCheck.safety.length) {
  console.warn('[rail] confirmed overlaps', railCheck.confirmed, 'safety', railCheck.safety, 'broad-phase-only', railCheck.broad);
} else {
  console.info('[rail] clearance OK; broad-phase-only', railCheck.broad.length);
}

if (urlParams.get('dev') === 'rail') {
  const dbg = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(railway.curve, 220, 1.5, 8, false),
    new THREE.MeshBasicMaterial({ color: '#ff5577', transparent: true, opacity: 0.16, depthWrite: false }),
  );
  dbg.add(tube);
  for (const o of obstacles) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(o.radius, o.radius + 0.12, 28),
      new THREE.MeshBasicMaterial({ color: '#33ddaa', side: THREE.DoubleSide, transparent: true, opacity: 0.65, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(o.x, terrainHeight(o.x, o.z) + 0.12, o.z);
    dbg.add(ring);
  }
  townRoot.add(dbg);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:20px;bottom:84px;z-index:99;background:#111;color:#7dff9a;font:13px monospace;padding:6px 10px;border-radius:8px;white-space:pre';
  const ids = [...railCheck.confirmed, ...railCheck.safety]
    .map((c) => `${c.car}->${c.obstacle}(${c.gap})`)
    .join('  ');
  d.textContent = `overlap: ${railCheck.confirmed.length}  safety: ${railCheck.safety.length}  broad-only: ${railCheck.broad.length}\n${ids}`;
  document.body.appendChild(d);
}

if (urlParams.get('sim') === 'journey') {
  railway.setTimeScale(40);
  setTimeout(() => {
    const log = railway.getLog();
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:20px;bottom:84px;z-index:99;background:#111;color:#7dff9a;font:13px monospace;padding:6px 10px;border-radius:8px;white-space:pre';
    d.textContent =
      `stops: ${log.length}\n` +
      log.slice(0, 10).map((e) => `${e.station} dirIn=${e.dirIn} at=${e.at} cars=${e.cars}`).join('\n');
    document.body.appendChild(d);
  }, 2600);
}

// --- Clouds / balloons / lights ---
const clouds = createClouds(materials);
const balloons = createBalloons(materials);
scene.add(clouds.root, balloons.root);
const decorativeLights = createDecorativeLights(materials);
scene.add(decorativeLights.root);

// --- Season ---
const seasonParam = urlParams.get('season');
const seasonKey = ['spring', 'summer', 'autumn', 'winter'].includes(seasonParam)
  ? seasonParam
  : getSeasonKey(new Date());
applySeason(materials, { setSeason: (p) => vegetation.setSeason(p) }, seasonKey);
if (terrainRoot.userData.surfaceMat) {
  terrainRoot.userData.surfaceMat.color.copy(materials.grass.color);
}
const seasonParticles = createSeasonParticles();
seasonParticles.setSeason(seasonKey);
scene.add(seasonParticles.root);

// --- Weather ---
const weather = createWeather({ reducedMotion });
scene.add(weather.root);
const statusEl = document.getElementById('world-status');
const SEASON_EMOJI = { spring: '🌸', summer: '☀', autumn: '🍂', winter: '❄' };
function updateStatus(info) {
  const s = SEASONS[seasonKey];
  let text = `${SEASON_EMOJI[seasonKey] || ''} ${s.label}`;
  if (info && info.source === 'offline') text += ' · 天气未知';
  else if (info && info.source !== 'pending') {
    text += ` · ${info.icon} ${info.label}`;
    if (info.temp != null) text += ` ${Math.round(info.temp)}°C`;
  }
  statusEl.textContent = text;
  statusEl.classList.add('show');
}
weather.onChange(updateStatus);
const weatherParam = urlParams.get('weather');
const WEATHER_KEYS = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'snow', 'storm'];
if (weatherParam && WEATHER_KEYS.includes(weatherParam)) weather.setWeatherKey(weatherParam);
else if (WEATHER.enabled) {
  weather.fetchWeather();
  weather.scheduleRefresh();
}

// --- UI / cards ---
const memoryCard = createMemoryCard();
const panel = document.getElementById('destination-panel');
const panelList = document.getElementById('dp-list');
const exitBtn = document.getElementById('exit-follow');

function openDestinations() {
  panelList.innerHTML = '';
  for (const s of railway.stations) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = s.name;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.remove('open');
      startJourney(s);
    });
    panelList.appendChild(btn);
  }
  panel.classList.add('open');
}
document.getElementById('dp-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  panel.classList.remove('open');
});

// --- Camera control ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...CAMERA.defaultTarget);
controls.enableDamping = true;
controls.dampingFactor = CAMERA.dampingFactor;
controls.minZoom = CAMERA.minZoom;
controls.maxZoom = CAMERA.maxZoom;
controls.minPolarAngle = CAMERA.minPolar;
controls.maxPolarAngle = CAMERA.maxPolar;
controls.minDistance = CAMERA.minDistance;
controls.maxDistance = CAMERA.maxDistance;
controls.update();

const homePos = camera.position.clone();
const homeTarget = controls.target.clone();
const homeOffset = homePos.clone().sub(homeTarget);

let tween = null;
function focusOn(point, zoom = 1.5) {
  tween = {
    start: performance.now(),
    duration: 900,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromZoom: camera.zoom,
    toTarget: point.clone(),
    // keep the camera close along the same view direction: an orthographic
    // camera needs no distance for framing, and a far camera clips the sky dome
    toCamera: point.clone().add(homeOffset.clone().multiplyScalar(0.4)),
    toZoom: zoom,
  };
}
function resetView() {
  tween = {
    start: performance.now(),
    duration: 800,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromZoom: camera.zoom,
    toTarget: homeTarget.clone(),
    toCamera: homePos.clone(),
    toZoom: 1,
  };
  exitFollow();
}
document.getElementById('reset-btn').addEventListener('click', resetView);

// --- Train journey ---
let followActive = false;
let pendingDestination = null;
let arrivalTimer = 0;

function startJourney(station) {
  pendingDestination = station.id;
  followActive = true;
  controls.enabled = false;
  exitBtn.classList.add('show');
}
function exitFollow() {
  followActive = false;
  controls.enabled = true;
  exitBtn.classList.remove('show');
}
exitBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exitFollow();
  resetView();
});

railway.onStation((station) => {
  if (arrivalTimer > 0) return;
  if (pendingDestination && station.id === pendingDestination) {
    pendingDestination = null;
    arrivalTimer = 2.4;
    memoryCard.open({
      letter: station.name.slice(0, 1),
      name: station.name,
      englishName: 'Arrival',
      theme: '火车到站',
      story: `你乘着小火车来到了「${station.name}」。`,
      tags: ['目的地'],
      note: '点击「退出跟随」回到总览。',
    });
  }
});

// --- Personal avatar (Sze) ---
const avatar = createAvatar();
const avatarHome = new THREE.Vector2(-5, 8);
avatar.root.position.set(avatarHome.x, terrainHeight(avatarHome.x, avatarHome.y), avatarHome.y);
townRoot.add(avatar.root);
avatar.wave(3);

const avatarTarget = new THREE.Vector2(avatarHome.x, avatarHome.y);
let avatarHeading = 0;
let avatarPath = [];
let avatarStep = 0;
const isletNavObstacles = ENTRANCE_SOLIDS.map((s) => ({
  x: s.x,
  z: s.z,
  hx: s.hx,
  hz: s.hz,
  fx: Math.sin(s.yaw ?? 0),
  fz: Math.cos(s.yaw ?? 0),
}));
const nav = createNav([...obstacles, ...isletNavObstacles], {
  x: ENTRANCE.x,
  z: ENTRANCE.z,
  r: ENTRANCE.r,
});
const avatarRay = new THREE.Raycaster();
const avatarPointer = new THREE.Vector2(0, 0);
const terrainSurface = terrainRoot.children[0];

// --- avatar collision: buildings / trees / platforms are solid, the entrance
// is reachable so clicking a house stops the character at its door ---
const AVATAR_RADIUS = 0.22;

function insideFootprint(x, z, o, pad) {
  const dx = x - o.x;
  const dz = z - o.z;
  const fx = o.fx ?? 1;
  const fz = o.fz ?? 0;
  const lx = dx * fx + dz * fz;
  const lz = -dx * fz + dz * fx;
  const hx = (o.hx ?? 0.4) + pad;
  const hz = (o.hz ?? 0.4) + pad;
  return Math.abs(lx) <= hx && Math.abs(lz) <= hz;
}

function blockedBy(x, z, pad = AVATAR_RADIUS) {
  for (const o of obstacles) {
    if (insideFootprint(x, z, o, pad)) return o;
  }
  return null;
}

/** Point just outside a destination's door, on the path side. */
function entranceOf(place) {
  if (!place || !place.door) return null;
  const fx = place.footprint?.fx ?? 0;
  const fz = place.footprint?.fz ?? 1;
  return [place.door[0] + fx * 0.45, place.door[1] + fz * 0.45];
}

function resolveAvatarTarget(x, z) {
  const hit = blockedBy(x, z, AVATAR_RADIUS + 0.05);
  if (!hit) return [x, z];

  // only a destination building redirects to its entrance
  let bestPlace = null;
  let bestD = Infinity;
  for (const p of places) {
    if (!p.door || !p.footprint) continue;
    const d = (p.footprint.x - hit.x) ** 2 + (p.footprint.z - hit.z) ** 2;
    if (d < 4 && d < bestD) {
      bestD = d;
      bestPlace = p;
    }
  }
  if (bestPlace) {
    const e = entranceOf(bestPlace);
    if (e && !blockedBy(e[0], e[1], AVATAR_RADIUS)) return e;
  }

  // anything else (well, bench, lamp, tree, sign): step out of it
  const dx = x - hit.x || 0.001;
  const dz = z - hit.z || 0.001;
  const len = Math.hypot(dx, dz) || 1;
  const r = Math.max(hit.hx ?? 0.5, hit.hz ?? 0.5) + 0.7;
  return [hit.x + (dx / len) * r, hit.z + (dz / len) * r];
}

function isletBlocked(x, z) {
  for (const s of entrance.solids) {
    if (s.hx !== undefined) {
      const ddx = x - s.x;
      const ddz = z - s.z;
      const c = Math.cos(s.yaw);
      const sn = Math.sin(s.yaw);
      const lx = ddx * c - ddz * sn;
      const lz = ddx * sn + ddz * c;
      if (Math.abs(lx) < s.hx + 0.24 && Math.abs(lz) < s.hz + 0.24) return true;
    } else if (Math.hypot(x - s.x, z - s.z) < s.r + 0.24) {
      return true;
    }
  }
  return false;
}

function moveAvatarToPointer(e) {
  avatarPointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  avatarRay.setFromCamera(avatarPointer, camera);

  // standing up: step out in front of the bench first, otherwise the bench's
  // own collision volume would keep her trapped in the seat
  if (sitWanted) {
    avatar.setSitting(false);
    const fx = Math.sin(entrance.benchSeat.yaw);
    const fz = Math.cos(entrance.benchSeat.yaw);
    const sx = entrance.benchSeat.x + fx * 0.72;
    const sz = entrance.benchSeat.z + fz * 0.72;
    avatar.root.position.set(sx, groundY(sx, sz), sz);
    sitWanted = false;
    avatarPath = [];
    avatarStep = 0;
  }

  // clicking the bench: walk to the front of it, then sit
  if (phase === 'entrance' || phase === 'island') {
    const benchHit = avatarRay.intersectObject(entrance.bench, true)[0];
    if (benchHit) {
      sitWanted = true;
      const fx = Math.sin(entrance.benchSeat.yaw);
      const fz = Math.cos(entrance.benchSeat.yaw);
      const [tx, tz] = clampToIslet(
        entrance.benchSeat.x + fx * 0.68,
        entrance.benchSeat.z + fz * 0.68,
      );
      avatarTarget.set(tx, tz);
      const benchPath = nav.findPath(avatar.root.position.x, avatar.root.position.z, tx, tz);
      if (benchPath && benchPath.length) {
        avatarPath = benchPath;
        avatarStep = 0;
      }
      return;
    }
  }

  const hits = avatarRay.intersectObjects([terrainSurface, entrance.top], false);
  const hit = hits[0];
  if (!hit) return;

  // free roam on the entrance islet (A* grid covers the islet too)
  if (phase === 'entrance' || phase === 'island') {
    const [tx, tz] = clampToIslet(hit.point.x, hit.point.z);
    avatarTarget.set(tx, tz);
    const path = nav.findPath(avatar.root.position.x, avatar.root.position.z, tx, tz);
    if (path && path.length) {
      avatarPath = path;
      avatarStep = 0;
    }
    return;
  }

  const [tx, tz] = resolveAvatarTarget(hit.point.x, hit.point.z);
  avatarTarget.set(tx, tz);
  const path = nav.findPath(avatar.root.position.x, avatar.root.position.z, tx, tz);
  if (path && path.length) {
    avatarPath = path;
    avatarStep = 0;
  }
}
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 0) moveAvatarToPointer(e);
});

places.push({
  kind: 'avatar',
  id: 'me',
  name: 'Sze',
  story: '占位文字：这里将来放一段自我介绍。',
  root: avatar.root,
  labelAnchor: avatar.labelAnchor,
  setHighlight: () => {},
  focus: new THREE.Vector3(avatarHome.x, 1.4, avatarHome.y),
});

// dev: close-up of the avatar for visual checks  (?avatar=1)
if (new URLSearchParams(window.location.search).get('avatar') === '1') {
  setTimeout(() => {
    const p = avatar.root.position;
    startOverlay.remove();
    focusOn(new THREE.Vector3(p.x, p.y + 0.72, p.z), 8);
  }, 700);
}

// dev: verify entrance clamping  (?walk=x,z  e.g. a point inside a house)
{
  const walkParam = new URLSearchParams(window.location.search).get('walk');
  if (walkParam) {
    const [wx, wz] = walkParam.split(',').map(Number);
    const [tx, tz] = resolveAvatarTarget(wx, wz);
    avatar.root.position.set(tx, terrainHeight(tx, tz), tz);
    avatarTarget.set(tx, tz);
    const testPath = nav.findPath(avatarHome.x, avatarHome.y, tx, tz);
    console.info(
      '[nav] waypoints',
      testPath ? testPath.length : 0,
      testPath ? testPath.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' > ') : '',
    );
    console.info('[avatar] requested', wx, wz, '-> resolved', tx.toFixed(2), tz.toFixed(2));
  }
}

// ---------- entrance island, ferry, journey phases ----------
const entrance = createEntrance(materials);
townRoot.add(entrance.root);
const MAIN_DOCK = [29.5, 11];
const boat = createBoat(
  materials,
  [entrance.boatPos[0], ENTRANCE.y - 0.05, entrance.boatPos[1]],
  [MAIN_DOCK[0], 0.55, MAIN_DOCK[1]],
);
townRoot.add(boat.root);

function groundY(x, z) {
  const h = entranceHeight(x, z);
  return h === null ? terrainHeight(x, z) : h;
}

let phase = 'entrance';
let railHeld = false;
let sitWanted = false;
avatar.root.position.set(entrance.spawn[0], groundY(entrance.spawn[0], entrance.spawn[1]), entrance.spawn[1]);
avatar.root.rotation.y = 0;
avatarPath = [];
avatarStep = 0;
avatar.wave(5);

// frame the entrance close-up so the character reads clearly
{
  const ax = entrance.spawn[0];
  const az = entrance.spawn[1];
  controls.target.set(ax, ENTRANCE.y + 1.05, az);
  camera.position.set(ax, ENTRANCE.y + 1.05 + 18, az + 27.7);
  camera.zoom = 5.2;
  controls.maxZoom = 8;
  camera.updateProjectionMatrix();
  controls.update();
}

const startOverlay = document.createElement('div');
startOverlay.style.cssText =
  'position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end;justify-content:center;' +
  'padding-bottom:56px;background:linear-gradient(to bottom,rgba(18,26,34,0) 40%,rgba(18,26,34,.35));' +
  'transition:opacity .6s;font-family:inherit';
startOverlay.innerHTML = `
  <div style="max-width:430px;padding:34px 36px 28px;border-radius:24px;background:#f7efe1;
              box-shadow:0 18px 50px rgba(30,40,50,.35);text-align:center">
    <div style="font-size:27px;font-weight:700;color:#4b3a2c;letter-spacing:.6px">Sze的小世界</div>
    <div style="margin-top:12px;font-size:13.5px;line-height:1.9;color:#7b6650">
      你好，我是 Sze。<br/>这是我一点一点搭起来的小世界，<br/>坐上小船，我们过去看看。
    </div>
    <button id="start-btn" style="margin-top:24px;padding:11px 32px;border:none;border-radius:999px;
            background:#e8a07f;color:#fff;font-size:15px;font-weight:600;cursor:pointer">开始探索</button>
  </div>`;
document.body.appendChild(startOverlay);

function beginJourney() {
  if (phase !== 'entrance') return;
  phase = 'island';
  startOverlay.style.opacity = '0';
  setTimeout(() => startOverlay.remove(), 700);
}

function startBoarding() {
  if (phase !== 'island') return;
  phase = 'boarding';
  avatarPath = [{ x: entrance.dock[0], z: entrance.dock[1] }];
  avatarStep = 0;
}
document.getElementById('start-btn').addEventListener('click', beginJourney);

// "乘船" only appears when the player is standing at the dock
const boatBtn = document.createElement('button');
boatBtn.textContent = '乘船 →';
boatBtn.style.cssText =
  'position:fixed;right:20px;bottom:84px;z-index:120;padding:10px 20px;border:none;border-radius:999px;' +
  'background:#e8a07f;color:#fff;font-size:14px;font-weight:600;cursor:pointer;opacity:0;' +
  'pointer-events:none;transition:opacity .25s';
document.body.appendChild(boatBtn);
boatBtn.addEventListener('click', startBoarding);

function clampToIslet(x, z) {
  const dx = x - ENTRANCE.x;
  const dz = z - ENTRANCE.z;
  const d = Math.hypot(dx, dz) || 1;
  const maxR = ENTRANCE.r - 0.8;
  if (d <= maxR) return [x, z];
  return [ENTRANCE.x + (dx / d) * maxR, ENTRANCE.z + (dz / d) * maxR];
}

// dev: auto-start the journey for verification  (?journey=1)
if (new URLSearchParams(window.location.search).get('journey') === '1') {
  setTimeout(() => {
    beginJourney();
    startBoarding();
  }, 500);
}

// dev: verify the bench sit pose  (?sit=1)
if (new URLSearchParams(window.location.search).get('islet') === '1') {
  const p = nav.findPath(
    entrance.spawn[0],
    entrance.spawn[1],
    entrance.spawn[0] + 0.2,
    entrance.spawn[1] + 4.2,
  );
  console.info(
    '[islet] path',
    p ? p.length : 0,
    p ? p.map((q) => `${q.x.toFixed(1)},${q.z.toFixed(1)}`).join(' > ') : 'none',
  );
}
if (new URLSearchParams(window.location.search).get('sit') === '1') {
  startOverlay.remove();
  const fx = Math.sin(entrance.benchSeat.yaw);
  const fz = Math.cos(entrance.benchSeat.yaw);
  avatar.root.position.set(
    entrance.benchSeat.x + fx * 0.22,
    entrance.benchSeat.y - 0.36,
    entrance.benchSeat.z + fz * 0.22,
  );
  avatarHeading = entrance.benchSeat.yaw;
  avatar.root.rotation.y = avatarHeading;
  avatar.setSitting(true);
}

// --- Interaction ---
const interaction = createInteraction({
  camera,
  dom: renderer.domElement,
  attractions: [ferris, carousel],
  places,
  onPlaceClick: (place) => {
    if (place.kind === 'station') {
      openDestinations();
      return;
    }
    if (place.kind === 'avatar') {
      // gentle push-in on the character herself; never jump to another place
      memoryCard.open({
        letter: 'S',
        name: 'Sze',
        englishName: 'Me',
        theme: '小世界的主人',
        story: '你好，我是 Sze。点地面可以让我走过去。',
        tags: [],
        note: '点击地面或关闭按钮继续。',
      });
      const p = avatar.root.position;
      focusOn(new THREE.Vector3(p.x, p.y + 0.8, p.z), 7);
      return;
    }
    memoryCard.open({
      letter: place.name.slice(0, 1),
      name: place.name,
      englishName: '',
      theme: '小镇建筑',
      story: place.story || '',
      tags: [],
      note: '点击地面或关闭按钮继续闲逛。',
    });
    focusOn(place.focus);
  },
  onBackgroundClick: () => {
    memoryCard.close();
  },
});

// --- Day/Night toggle ---
const captionEl = document.getElementById('caption');
const dayBtn = document.getElementById('mode-day');
const nightBtn = document.getElementById('mode-night');
const modeButtons = { day: dayBtn, night: nightBtn };

function loadMode() {
  try {
    const m = new URLSearchParams(window.location.search).get('mode');
    if (m === 'day' || m === 'night') return m;
    return localStorage.getItem(MODE_KEY) === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}
function applyModeUI(mode) {
  dayBtn.classList.toggle('active', mode === 'day');
  nightBtn.classList.toggle('active', mode === 'night');
  captionEl.textContent = CAPTIONS[mode];
  captionEl.style.opacity = '0';
  requestAnimationFrame(() => { captionEl.style.opacity = '1'; });
}
function selectMode(mode) {
  environment.setMode(mode);
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
  applyModeUI(mode);
}
for (const [mode, btn] of Object.entries(modeButtons)) {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectMode(mode);
  });
}
environment.setInitial(loadMode());
applyModeUI(environment.getMode());

// --- Bloom ---
let composer = null;
let bloomPass = null;
if (useBloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0,
    BLOOM.radius,
    BLOOM.threshold,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  resizeCamera();
  if (composer) composer.setSize(w, h);
});

// --- Loop ---
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
const camOffset = new THREE.Vector3(7, 13, 11);
const devSpeed = Math.max(0.2, Number(new URLSearchParams(window.location.search).get('speed')) || 1);

function animate() {
  const SPEED = 1;
  const dt = Math.min(clock.getDelta(), 0.05) * devSpeed;
  const elapsed = clock.elapsedTime;

  if (tween) {
    const t = Math.min(1, (performance.now() - tween.start) / tween.duration);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
    camera.position.lerpVectors(tween.fromPos, tween.toCamera, e);
    camera.zoom = THREE.MathUtils.lerp(tween.fromZoom, tween.toZoom, e);
    camera.updateProjectionMatrix();
    if (t >= 1) tween = null;
  }

  // pedestrian near the rails -> hold the train until they clear
  if (phase === 'main') {
    const nearRail = railDistZ(avatar.root.position.x, avatar.root.position.z) < 3.4;
    if (nearRail && !railHeld) {
      railway.requestHold();
      railHeld = true;
    } else if (!nearRail && railHeld) {
      railway.releaseHold();
      railHeld = false;
    }
  }

  railway.update(dt);
  if (pendingDestination && !tween) {
    // keep following the train on its way to the destination
  }
  if (followActive) {
    tmpV.copy(railway.getTrainPos()).add(new THREE.Vector3(0, 0.9, 0));
    controls.target.lerp(tmpV, 0.08);
    camera.position.lerp(tmpV.clone().add(camOffset), 0.08);
    camera.lookAt(controls.target);
  }
  if (arrivalTimer > 0) arrivalTimer -= dt;

  controls.update();

  const env = environment.update();
  weather.apply(env, dt, elapsed);
  sky.update(env);
  scene.fog.color.copy(env.fog);
  scene.fog.near = env.fogNear;
  scene.fog.far = env.fogFar;
  hemi.color.copy(env.hemiSky);
  hemi.groundColor.copy(env.hemiGround);
  hemi.intensity = env.hemiIntensity;
  ambient.color.copy(env.ambient);
  ambient.intensity = env.ambientIntensity;
  keyLight.color.copy(env.key);
  keyLight.intensity = env.keyIntensity;
  keyLight.position.copy(env.keyPosition);
  materials.cloud.color.copy(env.cloudTint);
  materials.cloudTransparent.color.copy(env.cloudTint);
  renderer.toneMappingExposure = env.exposure;
  if (bloomPass) bloomPass.strength = env.bloom;

  decorativeLights.update(env);
  stars.update(elapsed, env);
  fireflies.update(elapsed, env);
  seasonParticles.update(dt, elapsed);

  // journey phases: entrance -> boarding -> crossing -> main
  if (phase === 'island') {
    const d = Math.hypot(avatar.root.position.x - entrance.dock[0], avatar.root.position.z - entrance.dock[1]);
    const nearDock = d < 3.4;
    boatBtn.style.opacity = nearDock ? '1' : '0';
    boatBtn.style.pointerEvents = nearDock ? 'auto' : 'none';
  } else {
    boatBtn.style.opacity = '0';
    boatBtn.style.pointerEvents = 'none';
  }

  if (phase === 'boarding') {
    const d = Math.hypot(avatar.root.position.x - entrance.dock[0], avatar.root.position.z - entrance.dock[1]);
    if (d < 0.9) {
      phase = 'crossing';
      console.info('[journey] boarding -> crossing');
      avatar.root.visible = false;
      boat.start();
    }
  } else if (phase === 'crossing') {
    boat.update(dt);
    const bp = boat.root.position;
    controls.target.lerp(new THREE.Vector3(bp.x, bp.y + 0.7, bp.z), 0.08);
    camera.position.lerp(new THREE.Vector3(bp.x, bp.y + 16, bp.z + 24), 0.08);
    camera.lookAt(controls.target);
    if (!boat.sailing && boat.progress >= 0.999) {
      phase = 'main';
      avatar.root.visible = true;
      avatar.root.position.set(MAIN_DOCK[0], groundY(MAIN_DOCK[0], MAIN_DOCK[1]), MAIN_DOCK[1]);
      avatarHeading = -Math.PI / 2;
      avatar.root.rotation.y = avatarHeading;
      avatarPath = [];
      avatarStep = 0;
      controls.maxZoom = 3.2;
      console.info('[journey] crossing -> main');
      focusOn(new THREE.Vector3(MAIN_DOCK[0], 1.0, MAIN_DOCK[1]), 1.7);
      setTimeout(() => resetView(), 2400);
    }
  } else {
    boat.update(dt);
  }

  // avatar: follow the A* waypoints, routing around buildings
  {
    let moving = false;
    if (avatarStep < avatarPath.length) {
      const wp = avatarPath[avatarStep];
      const dx = wp.x - avatar.root.position.x;
      const dz = wp.z - avatar.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.22) {
        avatarStep += 1;
      } else {
        const step = Math.min(dist, 4.2 * dt);
        const nx = avatar.root.position.x + (dx / dist) * step;
        const nz = avatar.root.position.z + (dz / dist) * step;

        avatar.root.position.set(nx, groundY(nx, nz), nz);
        let diff = Math.atan2(dx, dz) - avatarHeading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        avatarHeading += diff * Math.min(1, dt * 10);
        avatar.root.rotation.y = avatarHeading;
        moving = true;
      }
    }
    if (sitWanted && avatarStep >= avatarPath.length && phase === 'island') {
      const fx = Math.sin(entrance.benchSeat.yaw);
      const fz = Math.cos(entrance.benchSeat.yaw);
      const relX = avatar.root.position.x - entrance.benchSeat.x;
      const relZ = avatar.root.position.z - entrance.benchSeat.z;
      const d = Math.hypot(relX, relZ);
      const along = relX * fx + relZ * fz; // > 0 means in front of the bench
      // only sit when she actually reached the front; from behind she must walk
      // around first, otherwise the snap would pull her through the bench
      if (d < 1.3 && along > 0.3) {
        avatar.setSitting(true);
        avatar.root.position.set(
          entrance.benchSeat.x + fx * 0.22,
          entrance.benchSeat.y - 0.36,
          entrance.benchSeat.z + fz * 0.22,
        );
        avatarHeading = entrance.benchSeat.yaw;
        avatar.root.rotation.y = avatarHeading;
      }
    }
    avatar.update(dt, moving);
  }

  ferris.update(dt, elapsed);
  carousel.update(dt, elapsed);
  balloons.update(dt, elapsed);
  clouds.update(dt, elapsed);
  interaction.update();

  if (composer) composer.render(dt);
  else renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
