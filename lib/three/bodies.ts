import * as THREE from "three";
import { NOISE_GLSL } from "./glsl";

/* ------------------------------------------------------------------ Sun */

export interface SunUniforms {
  [k: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uDetail: THREE.IUniform<number>;
}

/**
 * Photosphere: domain-warped turbulence on the sphere's object-space position
 * gives granulation plus brighter active regions; a temperature ramp and limb
 * darkening finish it.
 */
export function createSunMaterial(detail = 1) {
  const uniforms: SunUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uDetail: { value: detail },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uDetail;
      varying vec3 vPos;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${NOISE_GLSL}
      vec3 ramp(float t) {
        vec3 c0 = vec3(0.08, 0.01, 0.0);
        vec3 c1 = vec3(0.55, 0.09, 0.0);
        vec3 c2 = vec3(0.98, 0.36, 0.03);
        vec3 c3 = vec3(1.0, 0.72, 0.32);
        vec3 c4 = vec3(1.0, 0.96, 0.84);
        if (t < 0.3) return mix(c0, c1, t / 0.3);
        if (t < 0.55) return mix(c1, c2, (t - 0.3) / 0.25);
        if (t < 0.8) return mix(c2, c3, (t - 0.55) / 0.25);
        return mix(c3, c4, clamp((t - 0.8) / 0.2, 0.0, 1.0));
      }
      void main() {
        vec3 p = normalize(vPos);
        float t = uTime * 0.035;
        vec3 q = p * 3.2 + vec3(t, -t * 0.6, t * 0.4);
        vec3 warp = vec3(fbm(q, 4), fbm(q + 5.2, 4), fbm(q + 9.7, 4));
        float cells = turb(p * 9.0 * uDetail + warp * 1.6 + t * 1.5, 5);
        float fine = turb(p * 26.0 * uDetail + warp * 2.4 - t * 2.0, 3);
        float regions = smoothstep(0.12, 0.5, fbm(p * 1.6 + warp * 0.6 + t * 0.2, 4));
        // dark intergranular lanes, hot cell centres, a few bright active regions
        float g = pow(1.0 - cells, 3.6);
        float heat = 0.1 + 0.62 * g + 0.08 * (1.0 - fine) + 0.75 * regions * pow(g, 0.6);
        float mu = clamp(dot(vNormalV, vViewDir), 0.0, 1.0);
        float limb = pow(mu, 0.5);
        vec3 col = ramp(clamp(heat * (0.6 + 0.4 * limb), 0.0, 1.0)) * (0.62 + 0.6 * limb);
        col += vec3(1.0, 0.42, 0.06) * pow(1.0 - mu, 2.5) * 0.7;
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });
  return { material, uniforms };
}

/** Additive, camera-facing glow disc for the corona. */
export function createGlowSprite(color: THREE.ColorRepresentation, size: number, falloff = 2.2) {
  const uniforms = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uFalloff: { value: falloff }, uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // billboard: keep the quad facing the camera
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        mv.xy += position.xy * scale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uFalloff;
      uniform float uTime;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 c = vUv - 0.5;
        float r = length(c) * 2.0;
        float a = atan(c.y, c.x);
        float flick = 0.85 + 0.3 * gnoise(vec3(cos(a) * 3.0, sin(a) * 3.0, uTime * 0.15));
        float g = pow(max(0.0, 1.0 - r), uFalloff) * flick;
        gl_FragColor = vec4(uColor * g, g * uOpacity);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.scale.setScalar(size);
  mesh.renderOrder = 2;
  return { mesh, uniforms };
}

/* ---------------------------------------------------------------- Earth */

export interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  clouds: THREE.Texture;
}

export function loadEarthTextures(manager?: THREE.LoadingManager): EarthTextures {
  const loader = new THREE.TextureLoader(manager);
  const load = (url: string, srgb: boolean) => {
    const t = loader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return {
    day: load("/textures/earth-day.jpg", true),
    night: load("/textures/earth-night.jpg", true),
    clouds: load("/textures/earth-clouds.jpg", false),
  };
}

/**
 * Earth with day/night blend across the terminator, a lit cloud layer and a
 * fresnel atmosphere shell. `uSun` is the light direction in view space.
 */
export function createEarth(tex: EarthTextures, radius = 1) {
  const uniforms = {
    uDay: { value: tex.day },
    uNight: { value: tex.night },
    uClouds: { value: tex.clouds },
    uSun: { value: new THREE.Vector3(1, 0.25, 0.6).normalize() },
    uOpacity: { value: 1 },
    uCloudShift: { value: 0 },
  };
  const surface = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDay;
      uniform sampler2D uNight;
      uniform sampler2D uClouds;
      uniform vec3 uSun;
      uniform float uOpacity;
      uniform float uCloudShift;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        float ndl = dot(n, normalize(uSun));
        float day = smoothstep(-0.12, 0.28, ndl);
        vec3 dayCol = texture2D(uDay, vUv).rgb;
        vec3 nightCol = texture2D(uNight, vUv).rgb;
        // city lights only, not the dark land/ocean colour of the night map
        nightCol = max(nightCol - 0.1, 0.0) * vec3(1.35, 1.1, 0.75) * 1.1;
        float cloud = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).r;
        cloud = smoothstep(0.12, 0.85, cloud);
        // open ocean (blue-dominant, dark in the day map) graded to a deep saturated blue
        // (the mask works on gamma-encoded values; the texture is decoded to linear)
        vec3 g = sqrt(dayCol);
        float ocean = smoothstep(0.03, 0.12, g.b - g.r) * smoothstep(0.45, 0.25, g.g);
        dayCol = mix(dayCol, vec3(0.02, 0.12, 0.52), ocean * 0.85);
        float light = max(ndl, 0.0);
        vec3 lit = dayCol * (0.06 + 1.35 * light);
        lit = mix(lit, vec3(1.0) * (0.12 + 1.15 * light), cloud * 0.85);
        // sun glint on water: broad sheen plus a tight hotspot
        vec3 h = normalize(normalize(uSun) + normalize(vV));
        float nh = max(dot(n, h), 0.0);
        float wet = ocean * (1.0 - cloud * 0.9) * day;
        lit += vec3(0.55, 0.75, 1.0) * pow(nh, 12.0) * wet * 0.12;
        lit += vec3(1.0, 0.96, 0.9) * pow(nh, 600.0) * wet * 2.2;
        vec3 col = mix(nightCol * (1.0 - cloud * 0.8), lit, day);
        // thin blue limb haze over the surface
        float fres = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
        col += vec3(0.25, 0.5, 1.0) * fres * 0.55 * smoothstep(-0.25, 0.4, ndl);
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });
  const group = new THREE.Group();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), surface);
  group.add(globe);

  const atmoUniforms = { uSun: uniforms.uSun, uOpacity: uniforms.uOpacity };
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.018, 96, 72),
    new THREE.ShaderMaterial({
      uniforms: atmoUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun;
        uniform float uOpacity;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          // back faces: brightest just outside the limb, fading to space
          float d = abs(dot(normalize(vN), normalize(vV)));
          float rim = pow(d, 1.6) * smoothstep(0.0, 0.35, d);
          float lit = smoothstep(-0.35, 0.6, dot(normalize(vN), normalize(uSun)));
          vec3 col = vec3(0.32, 0.62, 1.0) * rim * lit * 1.6;
          gl_FragColor = vec4(col, rim * lit * uOpacity);
        }`,
    }),
  );
  group.add(atmo);
  return { group, globe, uniforms };
}

/* --------------------------------------------------------------- Galaxy */

/** Logarithmic arm pitch shared by the star points and the disc light. */
const ARM_WIND = 3.2;

/**
 * Two-armed spiral galaxy as additive points: dense warm bulge, bluish arms,
 * and sparse pink star-forming knots along the arms.
 */
export function createGalaxy(count = 90000, radius = 1) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const rnd = mulberry32(7);
  const core = new THREE.Color(1.0, 0.92, 0.78);
  const arm = new THREE.Color(0.62, 0.74, 1.0);
  const dust = new THREE.Color(0.55, 0.38, 0.28);
  const knot = new THREE.Color(1.0, 0.45, 0.62);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const kind = rnd();
    let r: number, theta: number, y: number;
    if (kind < 0.3) {
      // bulge: dense, warm, slightly flattened
      r = Math.pow(rnd(), 1.8) * 0.3;
      theta = rnd() * Math.PI * 2;
      y = gauss(rnd) * 0.06 * (1 - r * 2.5);
      c.copy(core).lerp(arm, r * 0.6).multiplyScalar(0.6);
    } else if (kind < 0.55) {
      // diffuse disc between the arms
      r = 0.1 + Math.pow(rnd(), 1.3) * 0.85;
      theta = rnd() * Math.PI * 2;
      y = gauss(rnd) * 0.025;
      c.copy(core).lerp(arm, Math.min(1, r * 1.2)).multiplyScalar(0.55);
    } else {
      r = 0.08 + Math.pow(rnd(), 1.25) * 0.9;
      const branch = rnd() < 0.5 ? 0 : Math.PI;
      const spin = Math.log(r * 10 + 1) * ARM_WIND;
      const spread = 0.5 * (0.22 + r) * gauss(rnd);
      theta = branch + spin + spread;
      y = gauss(rnd) * 0.02;
      c.copy(core).lerp(arm, Math.min(1, r * 1.4));
      if (rnd() < 0.1) c.copy(dust);
      if (rnd() < 0.015 && r > 0.25) c.copy(knot);
    }
    pos[i * 3] = Math.cos(theta) * r * radius;
    pos[i * 3 + 1] = y * radius;
    pos[i * 3 + 2] = Math.sin(theta) * r * radius;
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    size[i] = (kind < 0.28 ? 1.4 : 1) * (0.6 + rnd() * rnd() * 3.2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const uniforms = { uOpacity: { value: 1 }, uPx: { value: 1 }, uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uPx;
      uniform float uTime;
      varying vec3 vColor;
      void main() {
        vColor = color;
        // differential rotation: inner stars orbit faster
        float r = length(position.xz);
        float a = uTime * 0.04 / (0.25 + r);
        vec3 p = vec3(position.x * cos(a) - position.z * sin(a), position.y, position.x * sin(a) + position.z * cos(a));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uPx * (3.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0);
        gl_FragColor = vec4(vColor * a, a * uOpacity * 0.85);
      }`,
  });
  const points = new THREE.Points(geo, material);

  // Continuous disc light under the stars, in the galaxy's own plane, with the
  // same logarithmic arm pitch so arms read as glowing lanes rather than dust.
  const discUniforms = { uOpacity: uniforms.uOpacity };
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4 * radius, 2.4 * radius),
    new THREE.ShaderMaterial({
      uniforms: discUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy / ${(1.2).toFixed(1)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float th = atan(vP.y, vP.x);
          float arms = 0.5 + 0.5 * cos(2.0 * (th + log(r * 10.0 + 1.0) * ${ARM_WIND.toFixed(2)}));
          float disc = exp(-r * 3.4) * (0.35 + 0.65 * pow(arms, 1.6));
          float bulge = exp(-r * r * 60.0);
          vec3 col = mix(vec3(0.55, 0.66, 0.95), vec3(1.0, 0.9, 0.75), clamp(1.0 - r * 2.2, 0.0, 1.0)) * disc * 0.6
                   + vec3(1.0, 0.88, 0.7) * bulge * 0.45;
          float a = clamp(disc * 0.6 + bulge * 0.5, 0.0, 1.0) * uOpacity * smoothstep(1.0, 0.75, r);
          gl_FragColor = vec4(col * uOpacity, a);
        }`,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  points.add(disc);
  return { points, uniforms };
}

/** Background star field on a large sphere shell. */
export function createStarfield(count = 2500, radius = 400, seed = 3) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1;
    const th = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = s * Math.cos(th) * radius;
    pos[i * 3 + 1] = u * radius;
    pos[i * 3 + 2] = s * Math.sin(th) * radius;
    size[i] = 0.4 + Math.pow(rnd(), 6) * 2.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const uniforms = { uOpacity: { value: 1 }, uPx: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uPx;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a * uOpacity * 0.7);
      }`,
  });
  return { points: new THREE.Points(geo, material), uniforms };
}

/* ---------------------------------------------------------------- utils */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() - 1.5) / 1.5;
}
