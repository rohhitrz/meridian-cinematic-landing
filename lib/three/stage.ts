import * as THREE from "three";

export interface StageOptions {
  /** Upper bound on devicePixelRatio; scenes are fill-rate bound. */
  maxDpr?: number;
  alpha?: boolean;
  /** Keep rendering every frame (animated scenes) vs only on invalidate(). */
  continuous?: boolean;
  /** Distance outside the viewport at which rendering starts. */
  rootMargin?: string;
  preserveDrawingBuffer?: boolean;
}

/**
 * Owns a WebGL renderer bound to a canvas: sizing to the canvas' CSS box,
 * pausing while offscreen or when the tab is hidden, and a single rAF loop.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  width = 1;
  height = 1;
  private raf = 0;
  private visible = false;
  private dirty = true;
  private disposed = false;
  private readonly clock = new THREE.Clock();
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  private readonly onVis = () => this.kick();
  /** When set, every frame renders at this time (still capture). */
  private frozenTime: number | null = null;
  private frameCbs: Array<(t: number, dt: number) => void> = [];
  private resizeCbs: Array<(w: number, h: number) => void> = [];

  constructor(readonly canvas: HTMLCanvasElement, private opts: StageOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: opts.alpha ?? false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, opts.alpha ? 0 : 1);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries[0]?.isIntersecting ?? false;
        this.kick();
      },
      { rootMargin: opts.rootMargin ?? "300px 0px" },
    );
    this.io.observe(canvas);
    document.addEventListener("visibilitychange", this.onVis);
    this.resize();
  }

  onFrame(cb: (t: number, dt: number) => void) {
    this.frameCbs.push(cb);
  }

  onResize(cb: (w: number, h: number) => void) {
    this.resizeCbs.push(cb);
    cb(this.width, this.height);
  }

  /** Request a render when not continuous (e.g. after scroll progress changed). */
  invalidate() {
    this.dirty = true;
    this.kick();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.maxDpr ?? 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.resizeCbs.forEach((cb) => cb(w, h));
    this.invalidate();
  }

  private shouldRun() {
    return !this.disposed && this.visible && !document.hidden;
  }

  private kick() {
    if (this.raf || !this.shouldRun()) return;
    this.clock.getDelta();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    this.raf = 0;
    if (!this.shouldRun()) return;
    const dt = this.frozenTime === null ? Math.min(this.clock.getDelta(), 0.05) : 0;
    const t = this.frozenTime ?? this.clock.elapsedTime;
    if (this.opts.continuous || this.dirty) {
      this.dirty = false;
      this.frameCbs.forEach((cb) => cb(t, dt));
      this.renderer.render(this.scene, this.camera);
    }
    if (this.opts.continuous || this.dirty) this.raf = requestAnimationFrame(this.tick);
  };

  /** Renders one frame synchronously at time t and holds that time (stills capture). */
  renderNow(t = 0) {
    this.frozenTime = t;
    this.frameCbs.forEach((cb) => cb(t, 0));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.renderer.dispose();
  }
}
