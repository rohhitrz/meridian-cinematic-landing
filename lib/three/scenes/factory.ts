import * as THREE from "three";
import { Stage } from "../stage";
import { NOISE_GLSL } from "../glsl";
import { mulberry32 } from "../bodies";

/*
 * Aerial night view of an original campus layout: a long central spine with
 * paired production halls branching off it, and a crescent front hall. Roofs
 * carry rows of lit skylights; road and perimeter lights dot the dark land.
 * Rendered once to a still (see scripts/render-stills.mjs).
 */
export function createFactoryScene(canvas: HTMLCanvasElement, onReady: () => void) {
  const stage = new Stage(canvas, { continuous: false, maxDpr: 2, preserveDrawingBuffer: true });
  const { scene, camera } = stage;
  camera.fov = 30;
  camera.near = 5;
  camera.far = 20000;
  camera.position.set(-700, 820, 1450);
  camera.lookAt(980, -80, -420);
  const rnd = mulberry32(5);

  const HAZE = new THREE.Color(0.16, 0.2, 0.26);
  const fogGlsl = /* glsl */ `
    vec3 haze(vec3 c, float d) { float f = 1.0 - exp(-pow(d * 0.00032, 1.5)); return mix(c, vec3(${HAZE.r.toFixed(3)}, ${HAZE.g.toFixed(3)}, ${HAZE.b.toFixed(3)}), f); }`;

  /* ---------- sky band at the top of frame ---------- */
  scene.background = new THREE.Color(0x0a0e14);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(15000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vD;
        ${NOISE_GLSL}
        void main(){
          float h = vD.y;
          vec3 col = mix(vec3(0.16, 0.2, 0.26), vec3(0.05, 0.07, 0.1), smoothstep(0.0, 0.25, h));
          float c = fbm(vec3(vD.xz / max(h + 0.05, 0.05) * 1.4, 2.0), 5);
          col = mix(col, col * 1.6 + 0.02, smoothstep(0.1, 0.5, c) * smoothstep(0.0, 0.1, h) * 0.6);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  /* ---------- land: forest, clearings and a road grid ---------- */
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(40000, 40000),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vW; varying float vD;
        ${NOISE_GLSL}
        ${fogGlsl}
        float line(float x, float w) { return smoothstep(w + fwidth(x), w, abs(x)); }
        void main(){
          vec2 p = vW.xz;
          float forest = smoothstep(-0.1, 0.25, fbm(vec3(p * 0.0012, 1.0), 5));
          float tex = fbm(vec3(p * 0.03, 3.0), 4) * 0.5 + 0.5;
          vec3 col = mix(vec3(0.2, 0.22, 0.25), vec3(0.1, 0.13, 0.13), forest) * (0.7 + 0.6 * tex);
          // cleared site pad around the campus
          float pad = smoothstep(1300.0, 1100.0, length((p - vec2(150.0, -150.0)) * vec2(0.65, 1.0)));
          col = mix(col, vec3(0.17, 0.18, 0.2) * (0.85 + 0.3 * tex), pad);
          // service roads with sodium lights
          float roads = line(p.y + 980.0, 7.0) + line(p.x - 1350.0, 7.0) * step(p.y, 400.0) + line(p.x + 1100.0, 7.0) * step(p.y, 300.0);
          float lamps = roads * step(0.86, fract((p.x + p.y) / 60.0));
          col = mix(col, vec3(0.16, 0.16, 0.17), clamp(roads, 0.0, 1.0) * 0.8);
          col += vec3(1.0, 0.7, 0.4) * lamps * 0.9;
          // parking fields: grids of faint lights
          vec2 lot = (p - vec2(-700.0, 300.0)) / vec2(380.0, 220.0);
          float inLot = step(abs(lot.x), 1.0) * step(abs(lot.y), 1.0);
          float dots = step(0.82, fract(p.x / 26.0)) * step(0.82, fract(p.y / 26.0));
          col += vec3(0.9, 0.8, 0.65) * dots * inLot * 0.45;
          gl_FragColor = vec4(haze(col, vD), 1.0);
        }`,
    }),
  );
  land.rotation.x = -Math.PI / 2;
  scene.add(land);

  /* ---------- buildings ---------- */
  const roofMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec3 aSize;
      varying vec3 vL; varying vec3 vN; varying float vD; varying vec3 vSize;
      void main(){
        vL = position; vN = normal; vSize = aSize;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec4 mv = viewMatrix * w; vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vL; varying vec3 vN; varying float vD; varying vec3 vSize;
      ${fogGlsl}
      void main(){
        vec3 n = normalize(vN);
        vec3 col;
        if (n.y > 0.5) {
          // roof: slate with skylight rows along the hall's long axis
          vec2 m = (vL.xz + 0.5) * vSize.xz;
          float rows = smoothstep(0.42, 0.5, abs(fract(m.y / 22.0) - 0.5));
          float cuts = step(0.18, fract(m.x / 46.0));
          float edge = smoothstep(6.0, 0.0, min(min(m.x, vSize.x - m.x), min(m.y, vSize.z - m.y)));
          col = vec3(0.27, 0.3, 0.37) + vec3(0.05) * (1.0 - rows);
          col += vec3(1.0, 0.82, 0.6) * rows * cuts * 1.1;
          col += vec3(0.6, 0.65, 0.75) * edge * 0.35;
        } else {
          // walls: dark with a warm glazing band
          float y = (vL.y + 0.5) * vSize.y;
          col = vec3(0.04, 0.045, 0.055);
          col += vec3(1.0, 0.68, 0.38) * smoothstep(2.0, 0.0, abs(y - vSize.y * 0.3)) * 0.9;
        }
        gl_FragColor = vec4(haze(col, vD), 1.0);
      }`,
  });

  const halls: Array<[number, number, number, number, number, number]> = []; // x, z, sx, sy, sz, rotY
  // spine
  halls.push([150, -150, 1500, 34, 70, 0]);
  // paired halls branching both sides of the spine
  for (let i = 0; i < 5; i++) {
    const x = -420 + i * 270;
    const len = 420 - Math.abs(i - 2) * 50;
    halls.push([x, -150 - 35 - len / 2, 170, 28, len, 0]);
    halls.push([x, -150 + 35 + len / 2, 170, 28, len, 0]);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(geo, roofMat, halls.length);
  const sizes = new Float32Array(halls.length * 3);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let n = 0;
  const addBox = (x: number, z: number, sx: number, sy: number, sz: number, ry: number) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    m4.compose(new THREE.Vector3(x, sy / 2, z), q, new THREE.Vector3(sx, sy, sz));
    inst.setMatrixAt(n, m4);
    sizes.set([sx, sy, sz], n * 3);
    n++;
  };
  halls.forEach((h) => addBox(...h));
  inst.count = n;
  geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 3));
  scene.add(inst);

  // crescent front hall: one swept, continuous roof bowed around the spine's east end
  const arc = new THREE.Shape();
  arc.absarc(0, 0, 560, -1.05, 1.05, false);
  arc.absarc(0, 0, 430, 1.05, -1.05, true);
  const crescentGeo = new THREE.ExtrudeGeometry(arc, { depth: 34, bevelEnabled: false, curveSegments: 64 });
  crescentGeo.rotateX(-Math.PI / 2);
  const crescent = new THREE.Mesh(
    crescentGeo,
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vL; varying vec3 vN; varying float vD; void main(){ vL = position; vN = normal; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vL; varying vec3 vN; varying float vD;
        ${fogGlsl}
        void main(){
          vec3 n = normalize(vN);
          float r = length(vL.xz);
          vec3 col;
          if (n.y > 0.5) {
            float rows = smoothstep(0.4, 0.5, abs(fract(r / 24.0) - 0.5));
            col = vec3(0.21, 0.24, 0.3) + vec3(1.0, 0.82, 0.6) * rows * 0.9;
            col += vec3(0.6, 0.65, 0.75) * smoothstep(8.0, 0.0, min(abs(r - 430.0), abs(r - 560.0))) * 0.4;
          } else {
            col = vec3(0.04, 0.045, 0.055) + vec3(1.0, 0.68, 0.38) * smoothstep(3.0, 0.0, abs(vL.y - 10.0)) * 0.9;
          }
          gl_FragColor = vec4(haze(col, vD), 1.0);
        }`,
    }),
  );
  crescent.position.set(560, 0, -150);
  scene.add(crescent);

  // perimeter and yard lights
  const lp: number[] = [];
  for (let i = 0; i < 700; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 700 + rnd() * 700;
    lp.push(150 + Math.cos(a) * r * 1.4, 3, -150 + Math.sin(a) * r * 0.9);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffd2a0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.55 })));

  requestAnimationFrame(() => {
    stage.renderNow(0);
    onReady();
  });
  return { stage, dispose: () => stage.dispose() };
}
