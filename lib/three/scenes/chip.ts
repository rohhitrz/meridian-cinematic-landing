import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Stage } from "../stage";
import { mulberry32 } from "../bodies";

/*
 * Product stills for the four chip cards: a packaged die (substrate, pad ring,
 * patterned silicon) lit like a studio shot. Variant 3 is a patterned wafer.
 */
const LOOKS = [
  { bg: [0xc4702f, 0x2a1206], key: 0xffd2a0, rim: 0xff9a50, sub: 0x1a1714 }, // warm amber
  { bg: [0x222222, 0x050505], key: 0xffe2b0, rim: 0xc9a46a, sub: 0x0e0e0f }, // charcoal + gold
  { bg: [0x173a6e, 0x02060e], key: 0xcfe2ff, rim: 0x6aa8ff, sub: 0x0b1220 }, // orbital blue
  { bg: [0xb59088, 0x3a2a29], key: 0xffffff, rim: 0xffd9cf, sub: 0x1a1a1a }, // dusty rose (wafer)
];

export function createChipScene(canvas: HTMLCanvasElement, onReady: () => void, opts: { variant?: number } = {}) {
  const v = Math.min(3, Math.max(0, opts.variant ?? 0));
  const look = LOOKS[v];
  const stage = new Stage(canvas, { continuous: false, maxDpr: 2, preserveDrawingBuffer: true });
  const { scene, camera, renderer } = stage;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  camera.fov = 28;
  camera.position.set(0, 25, 33);
  camera.lookAt(0, -0.6, 0.5);

  // backdrop: a screen-space pool of light behind the subject, falling off to the corners
  scene.background = backdrop(look.bg[0], look.bg[1]);

  const key = new THREE.DirectionalLight(look.key, 3.2);
  key.position.set(-12, 22, 14);
  const rim = new THREE.DirectionalLight(look.rim, 2.6);
  rim.position.set(16, 8, -18);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.08));

  if (v === 3) scene.environmentIntensity = 0.9;
  const subject = v === 3 ? wafer() : chipPackage(look.sub, v);
  scene.add(subject);

  requestAnimationFrame(() => {
    stage.renderNow(0);
    onReady();
  });
  return { stage, dispose: () => stage.dispose() };
}

function chipPackage(subColor: number, seed: number) {
  const g = new THREE.Group();
  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.7, 12),
    new THREE.MeshPhysicalMaterial({ color: subColor, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.4 }),
  );
  g.add(substrate);
  // gold pad ring around the die
  const pad = new THREE.BoxGeometry(0.34, 0.06, 0.7);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.28 });
  const pads = new THREE.InstancedMesh(pad, gold, 4 * 22);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 22; i++) {
      const t = -4.9 + (i / 21) * 9.8;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (side * Math.PI) / 2);
      const p = new THREE.Vector3(t, 0.38, 5.35).applyQuaternion(q);
      m.compose(p, q, new THREE.Vector3(1, 1, 1));
      pads.setMatrixAt(n++, m);
    }
  }
  g.add(pads);
  // die with a patterned, slightly iridescent surface
  const dieTex = dieTexture(seed);
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.5, 7.4),
    [
      new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.3 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.3 }),
      new THREE.MeshPhysicalMaterial({ map: dieTex, metalness: 0.65, roughness: 0.18, iridescence: 0.6, iridescenceIOR: 1.6, clearcoat: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e }),
      new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.3 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.3 }),
    ],
  );
  die.position.y = 0.6;
  g.add(die);
  g.rotation.set(0, -0.62, 0);
  g.position.y = 0.4;
  return g;
}

function wafer() {
  const tex = dieTexture(9, true);
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(9.2, 9.2, 0.25, 160, 1),
    [
      new THREE.MeshPhysicalMaterial({ color: 0x9a9ea6, metalness: 1, roughness: 0.25 }),
      new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.9, roughness: 0.22, iridescence: 0.6, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 450] }),
      new THREE.MeshPhysicalMaterial({ color: 0x777b82 }),
    ],
  );
  w.rotation.set(0.6, 0.3, -0.3);
  w.scale.setScalar(0.82);
  return w;
}

function backdrop(a: number, b: number) {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 800;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(300, 300, 20, 300, 340, 620);
  grad.addColorStop(0, new THREE.Color(a).getStyle());
  grad.addColorStop(1, new THREE.Color(b).getStyle());
  g.fillStyle = grad;
  g.fillRect(0, 0, 600, 800);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Floorplan-like die pattern: blocks of logic, cache arrays and routing. */
function dieTexture(seed: number, waferGrid = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const rnd = mulberry32(seed + 1);
  g.fillStyle = "#15161a";
  g.fillRect(0, 0, 1024, 1024);
  const drawDie = (x0: number, y0: number, s: number) => {
    g.fillStyle = "#1c1e24";
    g.fillRect(x0, y0, s, s);
    for (let i = 0; i < 14; i++) {
      const w = s * (0.12 + rnd() * 0.3);
      const h = s * (0.08 + rnd() * 0.3);
      const x = x0 + rnd() * (s - w);
      const y = y0 + rnd() * (s - h);
      const shade = 30 + Math.floor(rnd() * 40);
      g.fillStyle = `rgb(${shade},${shade + 2},${shade + 8})`;
      g.fillRect(x, y, w, h);
      // fine array texture inside cache-like blocks
      if (rnd() < 0.5) {
        g.strokeStyle = "rgba(255,255,255,0.05)";
        g.lineWidth = 1;
        for (let yy = y; yy < y + h; yy += Math.max(2, s / 128)) {
          g.beginPath();
          g.moveTo(x, yy);
          g.lineTo(x + w, yy);
          g.stroke();
        }
      }
    }
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = Math.max(1, s / 256);
    g.strokeRect(x0 + 2, y0 + 2, s - 4, s - 4);
  };
  if (waferGrid) {
    const s = 64;
    for (let y = 0; y < 1024; y += s) for (let x = 0; x < 1024; x += s) drawDie(x + 2, y + 2, s - 4);
  } else {
    drawDie(24, 24, 976);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
