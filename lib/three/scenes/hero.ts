import * as THREE from "three";
import { Stage } from "../stage";
import { NOISE_GLSL } from "../glsl";
import { mulberry32 } from "../bodies";
import { SITE } from "@/lib/site";

/*
 * Hero: a slow night approach along a curving road under a long sweeping
 * canopy, toward a glowing wordmark sign on a landscaped berm. All shading is
 * custom (no lights) with a shared exponential fog toward a blue-grey dusk.
 */

const FOG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 applyFog(vec3 col, float dist) {
  float f = 1.0 - exp(-pow(uFogDensity * dist, 1.6));
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}`;

const LOOP_SECONDS = 42;

export function createHeroScene(canvas: HTMLCanvasElement, onReady: () => void, opts: { still?: boolean } = {}) {
  const stage = new Stage(canvas, { continuous: !opts.still, maxDpr: 1.5, rootMargin: "0px" });
  const { scene, camera } = stage;
  camera.fov = 42;
  camera.near = 0.5;
  camera.far = 2000;
  camera.updateProjectionMatrix();

  const fogU = { uFogColor: { value: new THREE.Color(0x2c3746) }, uFogDensity: { value: 0.0056 } };
  const rnd = mulberry32(21);

  /* ---------- sky ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vDir;
        ${NOISE_GLSL}
        void main() {
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 top = vec3(0.05, 0.07, 0.11);
          vec3 mid = vec3(0.2, 0.24, 0.31);
          vec3 hor = vec3(0.36, 0.38, 0.42);
          vec3 col = mix(hor, mid, smoothstep(0.0, 0.12, h));
          col = mix(col, top, smoothstep(0.12, 0.6, h));
          // dusk warmth low on the right
          col += vec3(0.16, 0.1, 0.05) * exp(-pow((vDir.x - 0.75) * 2.2, 2.0)) * exp(-h * 14.0);
          // layered stratus: darker undersides, faint lit edges
          vec2 uv = vDir.xz / max(h + 0.12, 0.08);
          float c = fbm(vec3(uv * 0.9 + vec2(uTime * 0.004, 0.0), 1.3), 5);
          float cl = smoothstep(-0.05, 0.35, c) * smoothstep(0.02, 0.18, h);
          col = mix(col, col * 0.55, cl * 0.8);
          col += vec3(0.05, 0.06, 0.08) * smoothstep(0.25, 0.45, c) * smoothstep(0.02, 0.2, h);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  /* ---------- ground ---------- */
  const groundMat = new THREE.ShaderMaterial({
    uniforms: { ...fogU },
    vertexShader: /* glsl */ `varying vec3 vW; varying float vDist; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying float vDist;
      ${NOISE_GLSL}
      ${FOG}
      void main() {
        float n = fbm(vec3(vW.xz * 0.08, 0.0), 5);
        float m = fbm(vec3(vW.xz * 0.9, 3.0), 3);
        vec3 grass = mix(vec3(0.05, 0.07, 0.06), vec3(0.1, 0.13, 0.1), n * 0.5 + 0.5);
        grass *= 0.8 + 0.35 * m;
        gl_FragColor = vec4(applyFog(grass, vDist), 1.0);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* ---------- road ---------- */
  const roadCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(4, 0, 80),
      new THREE.Vector3(2, 0, 30),
      new THREE.Vector3(-4, 0, -20),
      new THREE.Vector3(-14, 0, -70),
      new THREE.Vector3(-6, 0, -120),
      new THREE.Vector3(22, 0, -160),
      new THREE.Vector3(70, 0, -185),
    ],
    false,
    "centripetal",
  );
  const road = ribbon(roadCurve, 14, 400, () => 0.02);
  road.material = new THREE.ShaderMaterial({
    uniforms: { ...fogU },
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vDist; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vDist; varying vec3 vW;
      ${NOISE_GLSL}
      ${FOG}
      void main() {
        float grain = gnoise(vec3(vW.xz * 3.0, 1.0)) * 0.5 + 0.5;
        vec3 col = vec3(0.09, 0.095, 0.105) * (0.8 + 0.3 * grain);
        // tyre-polished lanes catch the sky
        col += vec3(0.05, 0.06, 0.075) * exp(-pow((abs(vUv.x - 0.5) - 0.22) * 9.0, 2.0));
        float aa = fwidth(vUv.x) * 1.5;
        float edge = smoothstep(0.006 + aa, 0.006, abs(vUv.x - 0.04)) + smoothstep(0.006 + aa, 0.006, abs(vUv.x - 0.96));
        float dash = step(fract(vUv.y / 9.0), 0.4) * smoothstep(0.005 + aa, 0.005, abs(vUv.x - 0.5));
        col = mix(col, vec3(0.72), clamp(edge * 0.55 + dash * 0.8, 0.0, 1.0));
        gl_FragColor = vec4(applyFog(col, vDist), 1.0);
      }`,
  });
  scene.add(road);

  /* ---------- canopy: a long banked ribbon sweeping overhead ---------- */
  const canopyCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-110, 15, 40),
      new THREE.Vector3(-40, 10, 12),
      new THREE.Vector3(5, 8.2, -10),
      new THREE.Vector3(45, 6.4, -32),
      new THREE.Vector3(80, 3.6, -50),
      new THREE.Vector3(110, 0.8, -58),
    ],
    false,
    "centripetal",
  );
  const canopy = ribbon(canopyCurve, 22, 500, (u) => 0.32 + 0.1 * Math.sin(u * Math.PI), true);
  canopy.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...fogU, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vDist; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vec4 mv = viewMatrix * w; vDist = -mv.z; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vDist; varying vec3 vN; varying vec3 vV;
      ${FOG}
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        // brushed dark metal with a soft sheen across the width
        vec3 col = vec3(0.06, 0.06, 0.065) + vec3(0.22, 0.2, 0.19) * pow(1.0 - facing, 3.0);
        col += vec3(0.12, 0.1, 0.09) * exp(-pow((vUv.x - 0.35) * 5.0, 2.0)) * 0.6;
        // warm light strip along the leading edge, slats along the length
        float strip = exp(-pow((vUv.x - 0.93) * 40.0, 2.0));
        float slats = 0.6 + 0.4 * step(0.5, fract(vUv.y / 1.4));
        col += vec3(1.0, 0.62, 0.32) * strip * 2.2 * slats;
        col += vec3(0.6, 0.32, 0.14) * exp(-pow((vUv.x - 0.9) * 9.0, 2.0)) * 0.35;
        // underside rim highlight on the far edge
        col += vec3(0.35, 0.33, 0.32) * exp(-pow((vUv.x - 0.02) * 30.0, 2.0));
        gl_FragColor = vec4(applyFog(col, vDist * 0.7), 1.0);
      }`,
  });
  scene.add(canopy);
  // Leading-edge fascia: gives the roof visible thickness and carries the light line.
  const fascia = edgeBand(canopyCurve, 11, 1.4, 500);
  fascia.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...fogU },
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vDist; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vDist;
      ${FOG}
      void main() {
        vec3 col = mix(vec3(0.05, 0.05, 0.055), vec3(0.16, 0.15, 0.15), vUv.x);
        col += vec3(1.0, 0.6, 0.3) * exp(-pow((vUv.x - 0.12) * 14.0, 2.0)) * 1.6;
        gl_FragColor = vec4(applyFog(col, vDist * 0.7), 1.0);
      }`,
  });
  scene.add(fascia);

  /* ---------- distant campus: low halls with lit clerestory bands ---------- */
  const hallMat = new THREE.ShaderMaterial({
    uniforms: { ...fogU },
    vertexShader: /* glsl */ `varying vec3 vL; varying float vDist; varying vec3 vNo; void main(){ vL = position; vNo = normal; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vL; varying float vDist; varying vec3 vNo;
      ${FOG}
      void main() {
        vec3 col = vec3(0.07, 0.075, 0.085) * (vNo.y > 0.5 ? 1.4 : 1.0);
        float band = smoothstep(0.06, 0.0, abs(vL.y - 0.32)) * step(0.5, fract(vL.x * 6.0 + vL.z * 6.0));
        col += vec3(1.0, 0.82, 0.6) * band * 0.9 * step(vNo.y, 0.5);
        gl_FragColor = vec4(applyFog(col, vDist * 0.8), 1.0);
      }`,
  });
  for (let i = 0; i < 9; i++) {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hallMat);
    const w = 30 + rnd() * 50;
    hall.scale.set(w, 6 + rnd() * 6, 14 + rnd() * 20);
    hall.position.set(-40 + i * 34 + rnd() * 10, hall.scale.y / 2 - 0.5, -200 - rnd() * 70);
    scene.add(hall);
  }

  /* ---------- sign in front of a landscaped berm ---------- */
  const signTex = makeSignTexture(SITE.wordmark);
  const signPos = new THREE.Vector3(14, 3.2, -68);
  const berm = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { ...fogU },
      vertexShader: /* glsl */ `varying float vDist; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        varying float vDist; varying vec3 vW;
        ${NOISE_GLSL}
        ${FOG}
        void main() {
          float n = fbm(vec3(vW.xz * 1.6, vW.y), 4);
          vec3 col = vec3(0.04, 0.06, 0.05) * (0.7 + 0.6 * (n * 0.5 + 0.5));
          // cyan spill from the sign
          col += vec3(0.0, 0.25, 0.3) * exp(-pow(length(vW.xz - vec2(${signPos.x.toFixed(1)}, ${signPos.z.toFixed(1)})) * 0.12, 2.0)) * 0.5;
          gl_FragColor = vec4(applyFog(col, vDist), 1.0);
        }`,
    }),
  );
  berm.scale.set(36, 4.6, 12);
  berm.position.set(signPos.x - 2, 0, signPos.z - 13);
  scene.add(berm);
  const signGeo = new THREE.PlaneGeometry(26, 26 * (signTex.image.height / signTex.image.width));
  const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sign.position.copy(signPos);
  sign.rotation.set(-0.22, -0.32, -0.04);
  scene.add(sign);

  /* ---------- tree line silhouette ring + roadside shrubs ---------- */
  const treeRing = new THREE.Mesh(
    new THREE.CylinderGeometry(520, 520, 60, 256, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { ...fogU },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        ${NOISE_GLSL}
        uniform vec3 uFogColor;
        void main() {
          float x = vUv.x * 140.0;
          float crown = 0.18 + 0.08 * fbm(vec3(x * 0.15, 0.0, 0.0), 4) + 0.05 * abs(gnoise(vec3(x * 1.3, 2.0, 0.0)));
          float a = step(vUv.y, crown);
          vec3 col = mix(vec3(0.06, 0.075, 0.08), uFogColor * 0.75, 0.55);
          gl_FragColor = vec4(col, a);
        }`,
    }),
  );
  treeRing.position.y = 28;
  scene.add(treeRing);

  const shrubGeo = new THREE.IcosahedronGeometry(1, 1);
  const shrubMat = new THREE.MeshBasicMaterial({ color: 0x16211b, fog: true });
  const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, 700);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const tmp = new THREE.Vector3();
  for (let i = 0; i < shrubs.count; i++) {
    const u = rnd();
    const pt = roadCurve.getPointAt(u);
    const tan = roadCurve.getTangentAt(u);
    const side = rnd() < 0.5 ? -1 : 1;
    const off = 24 + rnd() * 70;
    tmp.set(-tan.z, 0, tan.x).multiplyScalar(side * off).add(pt);
    const s = 0.6 + rnd() * 1.6;
    m.compose(tmp.setY(s * 0.5), q.random(), new THREE.Vector3(s * 1.4, s, s * 1.4));
    shrubs.setMatrixAt(i, m);
  }
  scene.add(shrubs);

  /* ---------- distant campus glow + canopy lights ---------- */
  const lightGeo = new THREE.BufferGeometry();
  const lp: number[] = [];
  for (let i = 0; i < 260; i++) {
    const u = rnd();
    const p = canopyCurve.getPointAt(u);
    lp.push(p.x + (rnd() - 0.5) * 2, p.y - 0.6, p.z + (rnd() - 0.5) * 2);
  }
  for (let i = 0; i < 500; i++) lp.push(-60 + rnd() * 200, 0.6 + rnd() * 6, -170 - rnd() * 80);
  lightGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const lights = new THREE.Points(
    lightGeo,
    new THREE.PointsMaterial({ color: 0xffc38a, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  scene.add(lights);

  scene.fog = new THREE.FogExp2(0x232d3b, 0.0075);

  /* ---------- fade plate for the loop seam ---------- */
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }));
  fade.position.z = -1;
  fade.renderOrder = 10;
  camera.add(fade);
  scene.add(camera);

  /* ---------- camera path ---------- */
  const look = new THREE.Vector3();
  const pos = new THREE.Vector3();
  stage.onFrame((t) => {
    const u = ((t + 6) % LOOP_SECONDS) / LOOP_SECONDS;
    const along = 0.06 + u * 0.36;
    roadCurve.getPointAt(along, pos);
    roadCurve.getPointAt(Math.min(1, along + 0.1), look);
    pos.x += 2.6;
    pos.y = 2.1 + Math.sin(t * 0.9) * 0.03;
    look.y = 8.5;
    look.x += 6;
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.rotateZ(-0.03);
    const edge = Math.min(u / 0.05, (1 - u) / 0.05, 1);
    (fade.material as THREE.MeshBasicMaterial).opacity = 1 - edge;
    (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  });

  // The sign is drawn with the web font, so redraw once fonts are in.
  document.fonts.ready.then(() => {
    drawSign(signTex.image as HTMLCanvasElement, SITE.wordmark);
    signTex.needsUpdate = true;
    if (opts.still) stage.renderNow(6);
    else stage.invalidate();
    onReady();
  });

  return { stage, dispose: () => stage.dispose() };
}

/** Flat strip following a curve; `width` across, uv.x in [0,1] across, uv.y = distance. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, segments: number, lift: (u: number) => number, bank = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const len = curve.getLength();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize();
    if (bank) side.applyAxisAngle(tan, 0.28 * Math.sin(u * Math.PI));
    const half = width / 2;
    const y = lift(u);
    pos.push(p.x - side.x * half, p.y - side.y * half + y, p.z - side.z * half);
    pos.push(p.x + side.x * half, p.y + side.y * half + y, p.z + side.z * half);
    uv.push(0, u * len, 1, u * len);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g);
}

/** Vertical band hanging from a curve, offset sideways by `offset` (the roof's leading edge). */
function edgeBand(curve: THREE.Curve<THREE.Vector3>, offset: number, depth: number, segments: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const side = new THREE.Vector3().crossVectors(curve.getTangentAt(u), up).normalize();
    side.applyAxisAngle(curve.getTangentAt(u), 0.28 * Math.sin(u * Math.PI));
    const e = p.clone().addScaledVector(side, offset);
    e.y += 0.32 + 0.1 * Math.sin(u * Math.PI);
    pos.push(e.x, e.y, e.z, e.x, e.y - depth, e.z);
    uv.push(0, u, 1, u);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return new THREE.Mesh(g);
}

/** Neon-tube wordmark drawn to a canvas: a cyan core with a wide soft halo. */
function makeSignTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 384;
  drawSign(c, text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function drawSign(c: HTMLCanvasElement, text: string) {
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  g.font = `300 210px ${getComputedStyle(document.documentElement).getPropertyValue("--font-unbounded") || "sans-serif"}, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const letterSpaced = text.split("").join(" ");
  for (const [blur, alpha, color, width] of [
    [60, 0.55, "#1fb7d6", 10],
    [22, 0.9, "#45d6ee", 8],
    [6, 1, "#c8f7ff", 4],
  ] as const) {
    g.shadowBlur = blur;
    g.shadowColor = color;
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.strokeText(letterSpaced, c.width / 2, c.height / 2);
  }
}
