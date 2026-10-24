import * as THREE from "three";
import { Stage } from "../stage";
import { NOISE_GLSL } from "../glsl";
import { createEarth, createStarfield, loadEarthTextures } from "../bodies";

/*
 * Lunar mass driver: low camera on cratered regolith, a long launch rail on
 * A-frame supports rising diagonally out of frame, and a small Earth in the
 * black sky. Hard low sunlight from the right. Still render, or a slow
 * camera drift for the short film (opts.film).
 */
export function createMassScene(canvas: HTMLCanvasElement, onReady: () => void, opts: { still?: boolean; variant?: number } = {}) {
  const film = opts.variant === 1;
  const manager = new THREE.LoadingManager();
  const stage = new Stage(canvas, { continuous: film && !opts.still, maxDpr: film ? 1 : 2, preserveDrawingBuffer: true });
  const { scene, camera } = stage;
  camera.fov = 38;
  camera.near = 0.5;
  camera.far = 20000;

  scene.add(createStarfield(900, 9000, 9).points);

  const SUN = new THREE.Vector3(1, 0.32, 0.25).normalize();

  /* ---------- terrain: displaced plane, craters + fbm, lit in the shader ---------- */
  const terrainGeo = new THREE.PlaneGeometry(1600, 1600, 400, 400);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN } },
      vertexShader: /* glsl */ `
        varying vec3 vW; varying float vD; varying vec3 vNrm;
        ${NOISE_GLSL}
        float crater(vec2 p, vec2 c, float r) {
          float d = length(p - c) / r;
          return d < 1.0 ? (d * d - 1.0) * 0.6 : 0.25 * exp(-pow((d - 1.0) * 4.0, 2.0));
        }
        float height(vec2 p) {
          float h = fbm(vec3(p * 0.004, 1.0), 5) * 46.0 + fbm(vec3(p * 0.02, 5.0), 3) * 1.6;
          h += crater(p, vec2(-120.0, -260.0), 70.0) * 22.0 + crater(p, vec2(220.0, -420.0), 120.0) * 30.0;
          h += crater(p, vec2(60.0, -120.0), 26.0) * 8.0 + crater(p, vec2(-260.0, -80.0), 34.0) * 10.0;
          // rise toward the back-left so the ground climbs into frame
          h += (-p.y) * 0.05 - p.x * 0.05;
          return h;
        }
        void main() {
          vec3 p = position;
          p.y = height(p.xz);
          float e = 2.0;
          vNrm = normalize(vec3(height(p.xz - vec2(e, 0.0)) - height(p.xz + vec2(e, 0.0)), 2.0 * e, height(p.xz - vec2(0.0, e)) - height(p.xz + vec2(0.0, e))));
          vec4 w = modelMatrix * vec4(p, 1.0);
          vW = w.xyz;
          vec4 mv = viewMatrix * w; vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; varying vec3 vW; varying float vD; varying vec3 vNrm;
        ${NOISE_GLSL}
        void main() {
          // fine relief perturbs the smooth normal; pebbles add albedo speckle
          vec3 n = normalize(vNrm + 0.22 * vec3(gnoise(vec3(vW.xz * 0.12, 1.0)), 0.0, gnoise(vec3(vW.xz * 0.12, 4.0))));
          float diff = max(dot(n, uSun), 0.0);
          float rock = fbm(vec3(vW.xz * 0.35, 2.0), 4) * 0.5 + 0.5;
          float grit = gnoise(vec3(vW.xz * 0.9, 7.0)) * 0.5 + 0.5;
          vec3 alb = vec3(0.42, 0.41, 0.4) * (0.7 + 0.35 * rock) * (0.85 + 0.25 * grit);
          vec3 col = alb * (0.012 + 1.9 * pow(diff, 1.2));
          // distance fades into black (no atmosphere: just falloff to the frame edge)
          col *= smoothstep(2200.0, 600.0, vD);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(terrain);

  scene.add(new THREE.AmbientLight(0x404650, 0.15));
  const sunLight = new THREE.DirectionalLight(0xffffff, 4.5);
  sunLight.position.copy(SUN).multiplyScalar(1000);
  scene.add(sunLight);

  /* ---------- launch rail on A-frames ---------- */
  const railMat = new THREE.MeshStandardMaterial({ color: 0xaeb2b8, roughness: 0.4, metalness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.6, metalness: 0.4 });
  const accent = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  // Straight beam from A (upper-left, near) to B (lower-right, far); A-frame
  // legs drop from it to well below the ground so they always meet the terrain.
  const A = new THREE.Vector3(-170, 92, 20);
  const B = new THREE.Vector3(420, 34, -420);
  const LEN = A.distanceTo(B);
  const rail = new THREE.Group();
  rail.position.copy(A).add(B).multiplyScalar(0.5);
  rail.lookAt(B);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(14, 9, LEN), railMat);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(10, 4, LEN), darkMat);
  lower.position.y = -7;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, LEN), railMat);
  fin.position.y = 5.2;
  rail.add(beam, lower, fin);
  scene.add(rail);
  const legs = new THREE.Group();
  for (let i = 2; i < 7; i++) {
    const at = new THREE.Vector3().lerpVectors(A, B, i / 7);
    const h = at.y + 60;
    const leg = new THREE.Group();
    for (const side of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(5, h, 5), darkMat);
      l.position.set(side * h * 0.18, -h / 2, 0);
      l.rotation.z = -side * 0.36;
      leg.add(l);
    }
    const tie = new THREE.Mesh(new THREE.BoxGeometry(h * 0.42, 4, 4), darkMat);
    tie.position.y = -h * 0.45;
    leg.add(tie);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), accent);
    lamp.position.set(0, -6, 6);
    leg.add(lamp);
    leg.position.copy(at);
    leg.lookAt(at.x + (B.x - A.x), at.y, at.z + (B.z - A.z));
    legs.add(leg);
  }
  scene.add(legs);

  /* ---------- Earth in the sky ---------- */
  const earth = createEarth(loadEarthTextures(manager), 1);
  earth.group.scale.setScalar(95);
  earth.uniforms.uSun.value.copy(SUN).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.4);
  earth.globe.rotation.set(0.3, 1.2, 0);
  scene.add(earth.group);

  const camPos = new THREE.Vector3(-60, 22, 150);
  const look = new THREE.Vector3(60, 52, -150);
  const place = (t: number) => {
    const drift = film ? t : 0;
    camera.position.set(camPos.x + drift * 4, camPos.y + Math.sin(drift * 0.3) * 1.5, camPos.z - drift * 6);
    camera.lookAt(look.x + drift * 2, look.y, look.z);
    // Earth fixed relative to the camera's view: top-right of frame
    const dir = new THREE.Vector3(0.42, 0.22, -1).normalize().applyQuaternion(camera.quaternion);
    earth.group.position.copy(camera.position).addScaledVector(dir, 3000);
  };
  stage.onFrame((t) => place(t));

  manager.onLoad = () => {
    if (opts.still) stage.renderNow(0);
    else stage.invalidate();
    onReady();
  };
  return { stage, dispose: () => stage.dispose() };
}
