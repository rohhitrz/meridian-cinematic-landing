import * as THREE from "three";
import { Stage } from "../stage";
import { createEarth, createGlowSprite, createStarfield, loadEarthTextures } from "../bodies";

/*
 * Orbital dawn: Earth's limb across the lower frame, the Sun just clearing it,
 * and a large solar-array satellite catching the light in front. Still render.
 */
export function createSpaceScene(canvas: HTMLCanvasElement, onReady: () => void) {
  const manager = new THREE.LoadingManager();
  const stage = new Stage(canvas, { continuous: false, maxDpr: 2, preserveDrawingBuffer: true });
  const { scene, camera } = stage;
  camera.fov = 40;
  camera.near = 1;
  camera.far = 20000;
  camera.position.set(0, 0, 0);
  camera.lookAt(0, -0.12, -1);

  scene.add(createStarfield(1800, 9000, 4).points);

  const earth = createEarth(loadEarthTextures(manager), 1);
  earth.group.scale.setScalar(1400);
  earth.group.position.set(-260, -1560, -900);
  earth.globe.rotation.set(0.35, 0.7, 0.1);
  // light from behind the limb: a thin lit crescent, night side facing us
  earth.uniforms.uSun.value.set(0.12, 0.3, -0.95).normalize();
  scene.add(earth.group);

  // the Sun sitting on the limb, top-centre
  const sunPos = new THREE.Vector3(60, -128, -900);
  const sunCore = createGlowSprite(0xfff4e0, 170, 2.6);
  sunCore.mesh.position.copy(sunPos);
  const sunHalo = createGlowSprite(0xffcf96, 1150, 2.0);
  sunHalo.mesh.position.copy(sunPos);
  sunHalo.uniforms.uOpacity.value = 0.8;
  scene.add(sunHalo.mesh, sunCore.mesh);
  // horizontal lens streak
  const streak = createGlowSprite(0xffd9a8, 1, 1.6);
  streak.mesh.scale.set(1400, 26, 1);
  streak.mesh.position.copy(sunPos);
  streak.uniforms.uOpacity.value = 0.45;
  scene.add(streak.mesh);

  /* ---------- satellite ---------- */
  const sat = new THREE.Group();
  const panelMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        vec2 cell = vUv * vec2(48.0, 10.0);
        vec2 f = abs(fract(cell) - 0.5);
        float grid = smoothstep(0.47, 0.5, max(f.x, f.y));
        float major = smoothstep(0.485, 0.5, abs(fract(vUv.x * 6.0) - 0.5));
        vec3 n = normalize(vN);
        vec3 h = normalize(normalize(uSun - vW) + normalize(vV));
        float spec = pow(max(dot(n, h), 0.0), 30.0);
        float sheen = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.0);
        vec3 col = vec3(0.03, 0.045, 0.08) + vec3(0.35, 0.38, 0.45) * sheen * 0.5;
        col += vec3(1.0, 0.85, 0.65) * spec * 0.9;
        col = mix(col, vec3(0.55, 0.57, 0.62) * (0.4 + spec), max(grid * 0.5, major * 0.8));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  panelMat.uniforms.uSun.value.copy(sunPos);
  const panelGeo = new THREE.BoxGeometry(260, 64, 1.4);
  const left = new THREE.Mesh(panelGeo, panelMat);
  left.position.x = -150;
  const right = new THREE.Mesh(panelGeo, panelMat);
  right.position.x = 150;
  const truss = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 6), new THREE.MeshBasicMaterial({ color: 0x8a8f98 }));
  const bus = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 16), new THREE.MeshBasicMaterial({ color: 0xb7b9bf }));
  sat.add(left, right, truss, bus);
  sat.position.set(60, -125, -470);
  sat.rotation.set(0.32, -1.05, 0.38);
  scene.add(sat);

  manager.onLoad = () => {
    stage.renderNow(0);
    onReady();
  };
  return { stage, dispose: () => stage.dispose() };
}
