import * as THREE from 'three';
import { ENV, TRANSITION } from './config.js';

const color = (hex) => new THREE.Color(hex);

function buildPreset(p) {
  return {
    skyTop: color(p.skyTop),
    skyBottom: color(p.skyBottom),
    fog: color(p.fog),
    fogNear: p.fogNear,
    fogFar: p.fogFar,
    hemiSky: color(p.hemiSky),
    hemiGround: color(p.hemiGround),
    hemiIntensity: p.hemiIntensity,
    ambient: color(p.ambientColor),
    ambientIntensity: p.ambientIntensity,
    key: color(p.keyColor),
    keyIntensity: p.keyIntensity,
    keyPosition: new THREE.Vector3(...p.keyPosition),
    cloudTint: color(p.cloudTint),
    emissive: p.emissive,
    fireflies: p.fireflies,
    stars: p.stars,
    bloom: p.bloom,
    exposure: p.exposure,
  };
}

/**
 * Day/Night environment controller. Interpolates every preset field from the
 * current appearance to the target over ~2s, so rapid switching never flashes.
 */
export function createEnvironment(reducedMotion = false) {
  const day = buildPreset(ENV.day);
  const night = buildPreset(ENV.night);

  let mix = 0;
  let target = 0;
  let anim = null;
  let mode = 'day';

  // Reused interpolated output object (no per-frame allocations for colors).
  const cur = {
    skyTop: new THREE.Color(),
    skyBottom: new THREE.Color(),
    fog: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    ambient: new THREE.Color(),
    key: new THREE.Color(),
    cloudTint: new THREE.Color(),
    keyPosition: new THREE.Vector3(),
    fogNear: day.fogNear,
    fogFar: day.fogFar,
    hemiIntensity: day.hemiIntensity,
    ambientIntensity: day.ambientIntensity,
    keyIntensity: day.keyIntensity,
    emissive: day.emissive,
    fireflies: day.fireflies,
    stars: day.stars,
    bloom: day.bloom,
    exposure: day.exposure,
    mix: 0,
  };

  function setMode(next) {
    mode = next === 'night' ? 'night' : 'day';
    target = mode === 'night' ? 1 : 0;
    if (reducedMotion) {
      mix = target;
      anim = null;
      return;
    }
    anim = { from: mix, start: performance.now(), duration: TRANSITION.duration };
  }

  // Jump straight to a mode with no transition (used on first load).
  function setInitial(next) {
    mode = next === 'night' ? 'night' : 'day';
    mix = mode === 'night' ? 1 : 0;
    target = mix;
    anim = null;
  }

  function update() {
    if (anim) {
      const t = Math.min(1, (performance.now() - anim.start) / anim.duration);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      mix = THREE.MathUtils.lerp(anim.from, target, e);
      if (t >= 1) {
        mix = target;
        anim = null;
      }
    }

    const m = mix;
    cur.skyTop.lerpColors(day.skyTop, night.skyTop, m);
    cur.skyBottom.lerpColors(day.skyBottom, night.skyBottom, m);
    cur.fog.lerpColors(day.fog, night.fog, m);
    cur.hemiSky.lerpColors(day.hemiSky, night.hemiSky, m);
    cur.hemiGround.lerpColors(day.hemiGround, night.hemiGround, m);
    cur.ambient.lerpColors(day.ambient, night.ambient, m);
    cur.key.lerpColors(day.key, night.key, m);
    cur.cloudTint.lerpColors(day.cloudTint, night.cloudTint, m);
    cur.keyPosition.lerpVectors(day.keyPosition, night.keyPosition, m);
    cur.fogNear = THREE.MathUtils.lerp(day.fogNear, night.fogNear, m);
    cur.fogFar = THREE.MathUtils.lerp(day.fogFar, night.fogFar, m);
    cur.hemiIntensity = THREE.MathUtils.lerp(day.hemiIntensity, night.hemiIntensity, m);
    cur.ambientIntensity = THREE.MathUtils.lerp(day.ambientIntensity, night.ambientIntensity, m);
    cur.keyIntensity = THREE.MathUtils.lerp(day.keyIntensity, night.keyIntensity, m);
    cur.emissive = THREE.MathUtils.lerp(day.emissive, night.emissive, m);
    cur.fireflies = THREE.MathUtils.lerp(day.fireflies, night.fireflies, m);
    cur.stars = THREE.MathUtils.lerp(day.stars, night.stars, m);
    cur.bloom = THREE.MathUtils.lerp(day.bloom, night.bloom, m);
    cur.exposure = THREE.MathUtils.lerp(day.exposure, night.exposure, m);
    cur.mix = m;
    return cur;
  }

  return { setMode, setInitial, update, getMode: () => mode, getMix: () => mix };
}
