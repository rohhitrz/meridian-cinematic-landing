import * as THREE from "three";
import { Stage } from "../stage";
import { NOISE_GLSL } from "../glsl";
import { createSunMaterial } from "../bodies";

/**
 * Close-up of the photosphere: a sphere far larger than the frame, placed so
 * its limb sits ~35% from the left, with flickering corona filaments off the
 * edge into the black on the left (where the "you are here" marker sits).
 */
export function createSunSurfaceScene(canvas: HTMLCanvasElement, onReady: () => void, opts: { still?: boolean } = {}) {
  const stage = new Stage(canvas, { continuous: !opts.still, maxDpr: 1.25 });
  const { scene, camera } = stage;
  camera.fov = 35;
  camera.position.set(0, 0, 10);

  const R = 6.2;
  const sun = createSunMaterial(2.2);
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), sun.material);
  scene.add(body);

  const coronaU = { uTime: { value: 0 } };
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.22, 160, 120),
    new THREE.ShaderMaterial({
      uniforms: coronaU,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        ${NOISE_GLSL}
        void main() {
          // On this back-facing shell, d = 0 at its outer silhouette and
          // d = LIMB where the photosphere's limb projects; peak there.
          const float LIMB = 0.57;
          float d = abs(dot(normalize(vN), normalize(vV)));
          float k = clamp(d / LIMB, 0.0, 1.0);
          vec3 p = normalize(vP);
          // filaments: angular noise stretched outward, drifting slowly
          // sampled on the unit circle (not atan) so the pattern has no seam at ±π
          vec2 ring = normalize(p.xy + 1e-5);
          float fil = turb(vec3(ring * 6.0, k * 2.5 - uTime * 0.06), 4);
          float flare = smoothstep(0.0, 0.5, fbm(vec3(ring * 2.0, uTime * 0.03), 3));
          float glow = pow(k, 3.5);
          float a = glow * (0.5 + 2.4 * fil * (0.3 + flare));
          vec3 col = mix(vec3(1.0, 0.32, 0.03), vec3(1.0, 0.72, 0.3), fil);
          gl_FragColor = vec4(col * a * 2.2, clamp(a, 0.0, 1.0));
        }`,
    }),
  );
  scene.add(corona);

  stage.onResize((w, h) => {
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * (w / h);
    const narrow = w / h < 1;
    // limb at 35% (desktop) / 18% (portrait) of the width, centre slightly low
    const limbX = ((narrow ? 0.18 : 0.35) - 0.5) * visW;
    body.position.set(limbX + R, -visH * 0.05, -2);
    corona.position.copy(body.position);
  });

  stage.onFrame((t) => {
    sun.uniforms.uTime.value = t * 1.6;
    coronaU.uTime.value = t;
    body.rotation.y = t * 0.006;
  });

  requestAnimationFrame(() => {
    if (opts.still) stage.renderNow(4);
    else stage.invalidate();
    onReady();
  });
  return { stage, dispose: () => stage.dispose() };
}
