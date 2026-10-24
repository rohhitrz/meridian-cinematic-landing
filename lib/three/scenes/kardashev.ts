import * as THREE from "three";
import { Stage } from "../stage";
import { createEarth, createGalaxy, createGlowSprite, createStarfield, createSunMaterial, loadEarthTextures } from "../bodies";
import { lerp, range, smoothstep } from "@/lib/motion";

/**
 * Kardashev tiers as one continuous zoom-out, driven by scroll progress p:
 *   p 0.00  Earth fills the right of the frame      (Type I)
 *   p 0.50  the Sun has replaced it                  (Type II)
 *   p 1.00  the Sun is one star in a spiral galaxy   (Type III)
 * The hand-offs centre on p = 0.25 and 0.75, where the tier list switches.
 */
const EARTH_YAW = -0.08;

export function createKardashevScene(canvas: HTMLCanvasElement, onReady?: () => void, _opts?: { still?: boolean }) {
  const manager = new THREE.LoadingManager(() => onReady?.());
  const stage = new Stage(canvas, { continuous: true, maxDpr: 1.75 });
  const { scene, camera } = stage;
  camera.fov = 35;
  camera.position.set(0, 0, 10);

  const stars = createStarfield(2200, 300, 11);
  scene.add(stars.points);

  const earth = createEarth(loadEarthTextures(manager), 1);
  // Americas and the Caribbean face the camera, Arctic tipped towards it
  earth.globe.rotation.set(0.42, EARTH_YAW, 0.06);
  // lit from the front-right: glint right of centre, terminator a third in from the left limb
  earth.uniforms.uSun.value.set(0.76, 0.3, 0.58).normalize();
  scene.add(earth.group);

  const sun = createSunMaterial(1);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), sun.material);
  scene.add(sunMesh);
  const corona = createGlowSprite(0xff7a22, 1, 1.5);
  scene.add(corona.mesh);

  const galaxy = createGalaxy(window.matchMedia("(max-width: 980px)").matches ? 45000 : 90000, 1);
  // tipped ~30° open, major axis rising to the right
  galaxy.points.rotation.order = "ZYX";
  galaxy.points.rotation.set(0.42, 0, 0.52);
  scene.add(galaxy.points);
  const galaxyCore = createGlowSprite(0xffeedd, 1, 2.6);
  scene.add(galaxyCore.mesh);

  let progress = 0;
  const layout = { visH: 1, visW: 1, narrow: false };
  stage.onResize((w, h) => {
    layout.visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    layout.visW = layout.visH * (w / h);
    layout.narrow = w / h < 1;
    const px = stage.renderer.getPixelRatio();
    galaxy.uniforms.uPx.value = px * (h / 900) * 9;
    stars.uniforms.uPx.value = px;
  });

  /** Viewport-relative placement: fx/fy in [0,1] from the top-left, r as a fraction of height. */
  const place = (o: THREE.Object3D, fx: number, fy: number, rFrac: number) => {
    o.position.set((fx - 0.5) * layout.visW, (0.5 - fy) * layout.visH, 0);
    o.scale.setScalar(rFrac * layout.visH);
  };

  stage.onFrame((t) => {
    const p = progress;
    const a = smoothstep(range(p, 0.06, 0.46)); // Earth → Sun
    const b = smoothstep(range(p, 0.54, 0.94)); // Sun → galaxy
    const n = layout.narrow;

    // Earth: shrinks and drifts up-left as the frame widens, fading by mid-way.
    const er = lerp(n ? 0.28 : 0.4, 0.05, a);
    place(earth.group, lerp(n ? 0.58 : 0.52, n ? 0.25 : 0.33, a), lerp(n ? 0.36 : 0.49, 0.24, a), er);
    earth.uniforms.uOpacity.value = 1 - smoothstep(range(a, 0.45, 0.8));
    earth.group.visible = earth.uniforms.uOpacity.value > 0.001;
    earth.globe.rotation.y = EARTH_YAW + t * 0.01;
    earth.uniforms.uCloudShift.value = t * 0.0015;

    // Sun: grows in behind Earth, then collapses to a single bright star.
    // The Sun ends as a star in the galaxy's outer arm (right of the core).
    const gx = n ? 0.5 : 0.54;
    const gy = n ? 0.4 : 0.42;
    const shrink = smoothstep(range(b, 0, 0.55));
    const sunIn = smoothstep(range(a, 0.25, 1));
    const sr = lerp(lerp(n ? 0.12 : 0.18, n ? 0.34 : 0.43, sunIn), 0.003, shrink);
    place(sunMesh, lerp(n ? 0.6 : 0.65, gx + (n ? 0.16 : 0.11), shrink), lerp(n ? 0.38 : 0.46, gy + 0.08, shrink), sr);
    sun.uniforms.uOpacity.value = sunIn * (1 - smoothstep(range(b, 0.45, 0.7)));
    sun.uniforms.uTime.value = t;
    sunMesh.visible = sun.uniforms.uOpacity.value > 0.001;
    sunMesh.rotation.y = t * 0.01;
    corona.mesh.position.copy(sunMesh.position);
    corona.mesh.scale.setScalar(Math.max(sunMesh.scale.x * 3.6, layout.visH * 0.05 * shrink));
    corona.uniforms.uOpacity.value = sunIn * lerp(0.9, 0.0, smoothstep(range(b, 0.55, 1)));
    corona.uniforms.uTime.value = t;

    // Galaxy: unfolds around the star the Sun became.
    const gIn = smoothstep(range(b, 0.2, 1));
    place(galaxy.points, gx, gy, lerp(0.1, n ? 0.44 : 0.52, gIn));
    galaxy.uniforms.uOpacity.value = gIn;
    galaxy.uniforms.uTime.value = t;
    galaxy.points.visible = gIn > 0.001;
    galaxyCore.mesh.position.copy(galaxy.points.position);
    galaxyCore.mesh.scale.setScalar(galaxy.points.scale.x * 0.7);
    galaxyCore.uniforms.uOpacity.value = gIn * 0.3;

    stars.uniforms.uOpacity.value = 0.35 + 0.65 * b;
  });

  return {
    stage,
    setProgress(p: number) {
      progress = p;
    },
    dispose: () => stage.dispose(),
  };
}
