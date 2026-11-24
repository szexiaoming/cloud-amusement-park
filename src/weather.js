import * as THREE from 'three';
import { WEATHER } from './config.js';
import { mulberry32 } from './helpers.js';

/**
 * Real-world weather for the town, read from Open-Meteo (no API key).
 * Location comes from the browser geolocation prompt; if that is unavailable
 * or denied we fall back to `WEATHER.fallback` in config.js.
 *
 * WMO weather codes are collapsed into a handful of visual states, each of
 * which dims / tints the environment and toggles rain or snow particles.
 */

const WMO = {
  0: { key: 'clear', label: '晴', icon: '☀' },
  1: { key: 'partly', label: '多云', icon: '🌤' },
  2: { key: 'partly', label: '多云', icon: '🌤' },
  3: { key: 'cloudy', label: '阴', icon: '☁' },
  45: { key: 'fog', label: '雾', icon: '🌫' },
  48: { key: 'fog', label: '雾', icon: '🌫' },
  51: { key: 'rain', label: '小雨', icon: '🌦' },
  53: { key: 'rain', label: '小雨', icon: '🌦' },
  55: { key: 'rain', label: '小雨', icon: '🌦' },
  56: { key: 'rain', label: '冻雨', icon: '🌧' },
  57: { key: 'rain', label: '冻雨', icon: '🌧' },
  61: { key: 'rain', label: '雨', icon: '🌧' },
  63: { key: 'rain', label: '雨', icon: '🌧' },
  65: { key: 'rain', label: '大雨', icon: '🌧' },
  66: { key: 'rain', label: '冻雨', icon: '🌧' },
  67: { key: 'rain', label: '冻雨', icon: '🌧' },
  71: { key: 'snow', label: '小雪', icon: '🌨' },
  73: { key: 'snow', label: '小雪', icon: '🌨' },
  75: { key: 'snow', label: '大雪', icon: '❄' },
  77: { key: 'snow', label: '雪', icon: '❄' },
  80: { key: 'rain', label: '阵雨', icon: '🌦' },
  81: { key: 'rain', label: '阵雨', icon: '🌧' },
  82: { key: 'rain', label: '强阵雨', icon: '⛈' },
  85: { key: 'snow', label: '阵雪', icon: '🌨' },
  86: { key: 'snow', label: '阵雪', icon: '❄' },
  95: { key: 'storm', label: '雷雨', icon: '⛈' },
  96: { key: 'storm', label: '雷雨', icon: '⛈' },
  99: { key: 'storm', label: '雷雨', icon: '⛈' },
};

const KEY_META = {
  clear: { label: '晴', icon: '☀' },
  partly: { label: '多云', icon: '🌤' },
  cloudy: { label: '阴', icon: '☁' },
  fog: { label: '雾', icon: '🌫' },
  rain: { label: '雨', icon: '🌧' },
  snow: { label: '雪', icon: '🌨' },
  storm: { label: '雷雨', icon: '⛈' },
};

const EFFECTS = {
  clear: { keyMul: 1, hemiMul: 1, fogNear: 1, fogFar: 1, rain: 0, snow: 0 },
  partly: { keyMul: 0.96, hemiMul: 0.98, fogNear: 0.95, fogFar: 1, rain: 0, snow: 0 },
  cloudy: {
    keyMul: 0.86,
    hemiMul: 1,
    fogNear: 0.9,
    fogFar: 0.98,
    rain: 0,
    snow: 0,
    fogTint: new THREE.Color('#b9c4cc'),
    fogAmt: 0.2,
  },
  fog: {
    keyMul: 0.8,
    hemiMul: 1.05,
    fogNear: 0.42,
    fogFar: 0.55,
    rain: 0,
    snow: 0,
    fogTint: new THREE.Color('#c8d2d8'),
    fogAmt: 0.45,
  },
  rain: {
    keyMul: 0.72,
    hemiMul: 1,
    fogNear: 0.7,
    fogFar: 0.8,
    rain: 1,
    snow: 0,
    fogTint: new THREE.Color('#9fb1bf'),
    fogAmt: 0.32,
  },
  storm: {
    keyMul: 0.62,
    hemiMul: 1,
    fogNear: 0.65,
    fogFar: 0.75,
    rain: 1,
    snow: 0,
    fogTint: new THREE.Color('#8b9aab'),
    fogAmt: 0.42,
  },
  snow: {
    keyMul: 0.88,
    hemiMul: 1.08,
    fogNear: 0.75,
    fogFar: 0.85,
    rain: 0,
    snow: 1,
    fogTint: new THREE.Color('#dfe7ee'),
    fogAmt: 0.38,
  },
};

export function createWeather({ reducedMotion = false } = {}) {
  const root = new THREE.Group();
  const rain = createRain();
  const snow = createSnow();
  root.add(rain.mesh, snow.mesh);

  const state = { key: 'clear', label: '', icon: '', temp: null, code: null, source: 'pending' };
  let effect = EFFECTS.clear;
  const listeners = [];
  let refreshTimer = null;

  function emit() {
    const info = getInfo();
    for (const fn of listeners) fn(info);
  }

  function getInfo() {
    return { ...state };
  }

  function onChange(fn) {
    listeners.push(fn);
    fn(getInfo());
  }

  function applyKey(key, { label, icon, temp, code, source } = {}) {
    const meta = KEY_META[key] || KEY_META.clear;
    state.key = EFFECTS[key] ? key : 'clear';
    state.label = label || meta.label;
    state.icon = icon || meta.icon;
    state.temp = temp ?? null;
    state.code = code ?? null;
    if (source) state.source = source;
    effect = EFFECTS[state.key];
    emit();
  }

  function setWeatherKey(key, temp = null) {
    applyKey(key, { temp, source: 'default' });
  }

  async function fetchWeather() {
    let lat = WEATHER.fallback.lat;
    let lon = WEATHER.fallback.lon;
    let source = 'default';
    try {
      const pos = await geolocate();
      if (pos) {
        lat = pos.lat;
        lon = pos.lon;
        source = 'geo';
      }
    } catch {
      /* use fallback */
    }
    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=' +
        lat +
        '&longitude=' +
        lon +
        '&current=temperature_2m,weather_code';
      const res = await fetch(url);
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      const code = data.current.weather_code;
      const temp = data.current.temperature_2m;
      const meta = WMO[code] || WMO[1];
      applyKey(meta.key, { label: meta.label, icon: meta.icon, temp, code, source });
      return getInfo();
    } catch {
      // Keep the current (clear) look; mark the chip as unavailable.
      state.source = 'offline';
      emit();
      return null;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    const ms = Math.max(5, WEATHER.refreshMinutes) * 60 * 1000;
    refreshTimer = setInterval(fetchWeather, ms);
  }

  function apply(env, dt, elapsed) {
    env.keyIntensity *= effect.keyMul;
    env.hemiIntensity *= effect.hemiMul;
    env.fogNear = Math.max(6, env.fogNear * effect.fogNear);
    env.fogFar = Math.max(env.fogNear + 12, env.fogFar * effect.fogFar);
    if (effect.fogTint) env.fog.lerp(effect.fogTint, effect.fogAmt);
    updateRain(rain, dt, effect.rain > 0);
    updateSnow(snow, dt, elapsed, effect.snow > 0);
  }

  return { root, apply, fetchWeather, setWeatherKey, getInfo, onChange, scheduleRefresh };
}

function geolocate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 6000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: 5000, maximumAge: 600000 },
    );
  });
}

function createRain() {
  const N = 700;
  const TOP = 26;
  const pos = new Float32Array(N * 2 * 3);
  const speed = new Float32Array(N);
  const rng = mulberry32(9001);

  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 22;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = rng() * TOP;
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x;
    pos[i * 6 + 4] = y - 0.7;
    pos[i * 6 + 5] = z;
    speed[i] = 16 + rng() * 10;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: '#cfe3f2',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, pos, speed, N, TOP, geo };
}

function updateRain(rain, dt, active) {
  rain.mesh.visible = active;
  if (!active) return;
  const { pos, speed, N, TOP } = rain;
  for (let i = 0; i < N; i++) {
    const dy = speed[i] * dt;
    pos[i * 6 + 1] -= dy;
    pos[i * 6 + 4] -= dy;
    if (pos[i * 6 + 1] < 0) {
      pos[i * 6 + 1] += TOP;
      pos[i * 6 + 4] += TOP;
    }
  }
  rain.geo.attributes.position.needsUpdate = true;
}

function createSnow() {
  const N = 450;
  const TOP = 22;
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  const phase = new Float32Array(N);
  const rng = mulberry32(9002);

  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 20;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = rng() * TOP;
    pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 1.2 + rng() * 1.6;
    phase[i] = rng() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uVisibility: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      uniform float uVisibility;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(3.2 * uPixelRatio * (50.0 / -mv.z), 9.0);
        gl_Position = projectionMatrix * mv;
        vA = uVisibility;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.12, d);
        gl_FragColor = vec4(1.0, 1.0, 1.0, a * vA * 0.9);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  return { mesh: points, pos, speed, phase, N, TOP, geo, mat };
}

function updateSnow(snow, dt, elapsed, active) {
  snow.mesh.visible = active;
  snow.mat.uniforms.uVisibility.value = active ? 1 : 0;
  if (!active) return;
  const { pos, speed, phase, N, TOP } = snow;
  for (let i = 0; i < N; i++) {
    pos[i * 3 + 1] -= speed[i] * dt * 2.2;
    pos[i * 3] += Math.sin(elapsed * 0.8 + phase[i]) * dt * 0.4;
    pos[i * 3 + 2] += Math.cos(elapsed * 0.7 + phase[i]) * dt * 0.4;
    if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] += TOP;
  }
  snow.geo.attributes.position.needsUpdate = true;
}
