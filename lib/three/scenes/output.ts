import * as THREE from "three";
import { Stage } from "../stage";
import { NOISE_GLSL } from "../glsl";
import { range, smoothstep } from "@/lib/motion";

/*
 * Size comparison, scrubbed by scroll progress p (0..1):
 *   beat 1 (p 0 → 0.5): a lone figure; the camera pulls up and back as one
 *                        factory-sized slab rises beside it.
 *   beat 2 (p 0.5 → 1): the slab replicates into a 2×5 campus while the
 *                        camera climbs to take in the whole run.
 * World units are metres-ish; the figure is 1.8 tall, a slab 300 × 100.
 */

const SLAB_L = 300;
const SLAB_W = 100;
const SLAB_H = 9;
const COLS = 5;

interface Key {
  p: number;
  pos: [number, number, number];
  at: [number, number, number];
  fov: number;
}
const KEYS: Key[] = [
  { p: 0.0, pos: [-2.5, 1.7, 8.5], at: [0, 1.15, 0], fov: 32 },
  { p: 0.14, pos: [-6, 4, 22], at: [0, 1, 0], fov: 32 },
  { p: 0.38, pos: [-60, 120, 300], at: [150, 0, -60], fov: 30 },
  { p: 0.5, pos: [-80, 135, 330], at: [160, 0, -60], fov: 30 },
  { p: 0.7, pos: [-170, 300, 520], at: [560, 0, -220], fov: 32 },
  { p: 1.0, pos: [-160, 330, 560], at: [640, 0, -240], fov: 32 },
];

export function createOutputScene(canvas: HTMLCanvasElement, onReady: () => void, opts: { still?: boolean } = {}) {
  const stage = new Stage(canvas, { continuous: false, maxDpr: 1.75, rootMargin: "200px 0px" });
  const { scene, camera } = stage;
  camera.near = 0.3;
  camera.far = 6000;
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 700, 2600);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-300, 600, 400);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfc8d6, 0.8);
  rim.position.set(600, 200, -500);
  scene.add(rim);

  /* ---------- floor: dark gradient with a fine grid, spot-lit near the subject ---------- */
  const floorU = { uFocus: { value: new THREE.Vector2(0, 0) }, uFocusR: { value: 30 }, uGrid: { value: 1 } };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: /* glsl */ `varying vec3 vW; varying float vDist; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vDist = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform vec2 uFocus; uniform float uFocusR; uniform float uGrid;
        varying vec3 vW; varying float vDist;
        ${NOISE_GLSL}
        float gridLine(vec2 p, float s) {
          vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s);
          return 1.0 - min(min(g.x, g.y), 1.0);
        }
        void main() {
          float r = length(vW.xz - uFocus) / uFocusR;
          float pool = exp(-r * r * 0.8);
          vec3 col = vec3(0.035) + vec3(0.17) * pool;
          col *= 0.92 + 0.08 * gnoise(vec3(vW.xz * 0.05, 0.0));
          float lines = gridLine(vW.xz, uGrid) * 0.55 + gridLine(vW.xz, uGrid * 10.0) * 0.35;
          float fade = exp(-vDist / (uGrid * 900.0));
          col += vec3(0.17) * lines * fade * (0.3 + 0.7 * pool);
          // horizon falls off to black
          col *= smoothstep(uFocusR * 14.0, uFocusR * 2.0, length(vW.xz - uFocus));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  /* ---------- figure: simple humanoid in suit white ---------- */
  const suit = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.45, metalness: 0.05 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.15, metalness: 0.6 });
  const figure = new THREE.Group();
  const cap = (r: number, l: number, x: number, y: number, z = 0, rz = 0, m: THREE.Material = suit) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    figure.add(mesh);
    return mesh;
  };
  cap(0.075, 0.68, -0.11, 0.46); // legs
  cap(0.075, 0.68, 0.11, 0.46);
  cap(0.17, 0.42, 0, 1.18); // torso
  cap(0.055, 0.5, -0.27, 1.14, 0, -0.12); // arms
  cap(0.055, 0.5, 0.27, 1.14, 0, 0.12);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), suit);
  head.position.set(0, 1.66, 0);
  figure.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18, -0.9, 1.8, 0.7, 1.4), visor);
  face.position.set(0, 1.66, 0.025);
  figure.add(face);
  figure.position.set(0, 0, 0);
  scene.add(figure);

  /* ---------- slabs: chamfered footprint, white top, grey sides, glowing base line ---------- */
  const slabGeo = chamferedSlab(SLAB_L, SLAB_W, SLAB_H, 18);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.55, metalness: 0.0 });
  const glowGeo = new THREE.PlaneGeometry(SLAB_L * 1.08, SLAB_W * 1.25);
  const slabs: Array<{ mesh: THREE.Mesh; glow: THREE.Mesh; appear: number }> = [];
  // first slab sits just behind and right of the figure; replicas run away along +x,
  // two rows side by side
  const origin = new THREE.Vector3(14 + SLAB_L / 2, 0, -60);
  for (let i = 0; i < COLS * 2; i++) {
    const col = Math.floor(i / 2);
    const row = i % 2;
    const mesh = new THREE.Mesh(slabGeo, slabMat);
    mesh.position.set(origin.x + col * (SLAB_L + 4), 0, origin.z - row * (SLAB_W + 3));
    const glow = new THREE.Mesh(glowGeo, glowMaterial());
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(mesh.position.x, 0.05, mesh.position.z);
    scene.add(mesh, glow);
    // slab 0 rises in beat 1; the rest stagger through beat 2
    const appear = i === 0 ? 0.2 : 0.53 + (i - 1) * 0.022;
    slabs.push({ mesh, glow, appear });
  }

  /* ---------- progress → camera + reveals ---------- */
  let progress = 0;
  const pos = new THREE.Vector3();
  const at = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  stage.onFrame(() => {
    const p = progress;
    let k = 0;
    while (k < KEYS.length - 2 && p > KEYS[k + 1].p) k++;
    const k0 = KEYS[k];
    const k1 = KEYS[k + 1];
    const u = smoothstep(range(p, k0.p, k1.p));
    pos.lerpVectors(a.fromArray(k0.pos), b.fromArray(k1.pos), u);
    at.lerpVectors(a.fromArray(k0.at), b.fromArray(k1.at), u);
    camera.position.copy(pos);
    camera.lookAt(at);
    camera.fov = k0.fov + (k1.fov - k0.fov) * u;
    camera.updateProjectionMatrix();

    for (const s of slabs) {
      const r = smoothstep(range(p, s.appear, s.appear + (s === slabs[0] ? 0.12 : 0.05)));
      s.mesh.visible = r > 0.001;
      s.mesh.scale.set(1, Math.max(r, 0.001), 1);
      (s.glow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = r;
      s.glow.visible = r > 0.001;
    }
    // floor spotlight and grid scale track the subject as the frame widens
    const span = THREE.MathUtils.lerp(6, 900, smoothstep(range(p, 0, 0.75)));
    floorU.uFocusR.value = span;
    floorU.uGrid.value = span < 40 ? 1 : span < 300 ? 10 : 40;
    floorU.uFocus.value.set(THREE.MathUtils.lerp(0, origin.x + 500, smoothstep(range(p, 0.2, 1))), THREE.MathUtils.lerp(0, origin.z - 50, smoothstep(range(p, 0.2, 1))));
    figure.visible = p < 0.6;
  });

  requestAnimationFrame(() => {
    if (opts.still) stage.renderNow(0);
    else stage.invalidate();
    onReady();
  });

  return {
    stage,
    setProgress(p: number) {
      if (p === progress) return;
      progress = p;
      stage.invalidate();
    },
    dispose: () => stage.dispose(),
  };
}

function glowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec2 vUv;
      void main() {
        // light leaking out from under the slab edges
        vec2 d = abs(vUv - 0.5) * 2.0;
        float edge = max(d.x, d.y);
        float g = smoothstep(1.0, 0.82, edge) * smoothstep(0.7, 0.9, edge);
        gl_FragColor = vec4(vec3(1.0) * g * 0.9 * uOpacity, g * uOpacity);
      }`,
  });
}

/** Extruded rectangle with chamfered corners, base at y = 0. */
function chamferedSlab(l: number, w: number, h: number, c: number) {
  const s = new THREE.Shape();
  const x = l / 2;
  const z = w / 2;
  s.moveTo(-x + c, -z);
  s.lineTo(x - c, -z);
  s.lineTo(x, -z + c);
  s.lineTo(x, z - c);
  s.lineTo(x - c, z);
  s.lineTo(-x + c, z);
  s.lineTo(-x, z - c);
  s.lineTo(-x, -z + c);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}
