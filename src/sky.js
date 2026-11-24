import * as THREE from 'three';

/**
 * Soft vertical sky gradient dome. Because the camera looks down at the
 * floating island, the visible sky band sits below the island (world Y around
 * -90..-125), so the gradient is mapped over a band just below the island:
 * top colour above, bottom colour below. ShaderMaterial ignores fog and is
 * unlit, keeping the gradient crisp; the fog colour matches the horizon in
 * main.js for a seamless rim.
 */
export function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color('#7fc1dd') },
    bottomColor: { value: new THREE.Color('#e4f5fb') },
  };

  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying float vY;
      void main() {
        float u = clamp((vY - (-150.0)) / ((-70.0) - (-150.0)), 0.0, 1.0);
        float t = u * u * (3.0 - 2.0 * u); // smoothstep
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 36, 22), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;

  return {
    mesh,
    update(env) {
      uniforms.topColor.value.copy(env.skyTop);
      uniforms.bottomColor.value.copy(env.skyBottom);
    },
  };
}
