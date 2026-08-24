import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uHorizon;
  uniform vec2 uSunUV;
  uniform vec3 uSunColor;
  uniform float uSunGlow;
  uniform vec2 uMoonUV;
  uniform float uMoonAlpha;
  uniform float uStarAlpha;
  uniform float uCityAlpha;
  uniform float uCloudAlpha;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(1.5, 1.0);

    vec3 col = mix(uBottom, uTop, pow(clamp(uv.y, 0.0, 1.0), 0.85));
    col = mix(col, uHorizon, exp(-abs(uv.y - 0.3) * 5.5) * 0.5);

    float sd = distance(uv * aspect, uSunUV * aspect);
    float disc = smoothstep(0.05, 0.032, sd);
    float glow = exp(-sd * 7.0) * 0.85;
    col += uSunColor * (disc + glow) * uSunGlow;

    float md = distance(uv * aspect, uMoonUV * aspect);
    float moon = smoothstep(0.036, 0.03, md);
    float bite = smoothstep(0.042, 0.036, distance(uv * aspect + vec2(0.014, 0.01), uMoonUV * aspect));
    col += vec3(0.85, 0.88, 1.0) * moon * uMoonAlpha * 0.85;
    col -= vec3(0.02, 0.02, 0.03) * bite * uMoonAlpha;
    col += vec3(0.4, 0.5, 0.9) * exp(-md * 10.0) * uMoonAlpha * 0.12;

    vec2 grid = floor(uv * 110.0);
    float h1 = hash(grid);
    float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + h1 * 43.0);
    float star = step(0.9935, h1) * twinkle;
    col += vec3(0.85, 0.9, 1.0) * star * uStarAlpha * smoothstep(0.12, 0.45, uv.y);

    float cl = sin(uv.x * 5.0 + uTime * 0.045 + sin(uv.y * 8.0 + uTime * 0.03) * 1.6) * 0.5 + 0.5;
    cl *= smoothstep(0.32, 0.72, uv.y);
    vec3 cloudCol = mix(col, vec3(0.95) * (0.35 + uCloudAlpha * 0.5), 0.6);
    col = mix(col, cloudCol, smoothstep(0.66, 0.9, cl) * uCloudAlpha);

    float colIdx = floor(uv.x * 24.0);
    float bh = 0.05 + hash(vec2(colIdx, 7.0)) * 0.17;
    float building = (1.0 - step(bh, uv.y)) * step(0.015, uv.y);
    vec3 cityCol = mix(uHorizon * 0.35, vec3(0.015, 0.022, 0.05), 0.75);
    col = mix(col, cityCol, building * uCityAlpha);

    vec2 cell = vec2(colIdx, floor(uv.y * 34.0));
    float lit = step(0.72, hash(cell + 3.0))
      * step(fract(uv.y * 34.0), 0.5)
      * step(fract(uv.x * 24.0), 0.55);
    float flicker = 0.65 + 0.35 * sin(uTime * 0.6 + hash(cell) * 25.0);
    col += vec3(1.0, 0.83, 0.5) * lit * building * uCityAlpha * flicker * 0.75;

    col *= 1.0 - 0.22 * pow(distance(uv, vec2(0.5, 0.45)), 2.6);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0.25, 0.5, 0.84) },
      uBottom: { value: new THREE.Color(0.75, 0.88, 1) },
      uHorizon: { value: new THREE.Color(0.92, 0.96, 1) },
      uSunUV: { value: new THREE.Vector2(0.5, 0.5) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uSunGlow: { value: 1 },
      uMoonUV: { value: new THREE.Vector2(0.5, 0.8) },
      uMoonAlpha: { value: 0 },
      uStarAlpha: { value: 0 },
      uCityAlpha: { value: 0 },
      uCloudAlpha: { value: 0.4 },
    },
  })
}
