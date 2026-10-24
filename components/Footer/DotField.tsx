"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const PITCH = 11; // dot spacing (px)
const DOT = 1.05; // base half-size of each square dot
const BASE = 0.19; // floor brightness
const SPARK = 0.36; // extra brightness for the scattered bright dots
const DEPTH = 0.62; // strength of the noise clustering
const FLICKER = 0.0033; // twinkle speed (rad/ms)
const GLOW_R = 460; // cursor influence radius
const TRAIL = 0.986; // per-frame decay of the cursor heat
const FEATHER = 64; // irregular edge width

/** Smooth 2D value noise from a small hashed lattice. */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/**
 * Footer field: a dense grid of tiny dots that gently breathes, with soft
 * brightness clouds, irregular scattered edges hugging the content column, and
 * a wide cursor lift that leaves a fading trail.
 */
export function DotField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const noise = makeNoise(3);
    const edgeNoise = makeNoise(11);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let ox = 0;
    let oy = 0;
    let spark = new Float32Array(0);
    let depth = new Float32Array(0);
    let phase = new Float32Array(0);
    let speed = new Float32Array(0);
    let mask = new Float32Array(0);
    let heat = new Float32Array(0);

    const size = () => {
      const r = host.getBoundingClientRect();
      w = Math.round(r.width);
      h = Math.round(r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      cols = Math.floor(w / PITCH) + 1;
      rows = Math.floor(h / PITCH) + 1;
      ox = (w - (cols - 1) * PITCH) / 2;
      oy = (h - (rows - 1) * PITCH) / 2;
      const n = cols * rows;
      spark = new Float32Array(n);
      depth = new Float32Array(n);
      phase = new Float32Array(n);
      speed = new Float32Array(n);
      mask = new Float32Array(n);
      heat = new Float32Array(n);
      // field bounds: the content column plus a bleed, the full height
      const box = host.querySelector(".container")?.getBoundingClientRect();
      const bleed = Math.min(80, Math.max(44, w * 0.055));
      const left = box ? Math.max(0, box.left - r.left - bleed) : w * 0.02;
      const right = box ? Math.min(w, box.right - r.left + bleed) : w * 0.98;
      for (let j = 0, k = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const x = ox + i * PITCH;
          const y = oy + j * PITCH;
          const rnd = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
          const rr = rnd - Math.floor(rnd);
          spark[k] = Math.pow(rr, 4);
          depth[k] = noise(x / 180, y / 180);
          phase[k] = ((rr * 977) % 1) * Math.PI * 2;
          speed[k] = 0.6 + ((rr * 433) % 1) * 0.9;
          // distance inside the bounds, jittered by noise → ragged, organic edges
          const inside = Math.min(x - left, right - x, y - h * 0.02, h - y);
          const jitter = (edgeNoise(x / 46, y / 46) - 0.5) * FEATHER * 1.6;
          let m = Math.min(1, Math.max(0, (inside + jitter) / FEATHER));
          m = m * m * (3 - 2 * m);
          // interior pockets so the field never reads as a flat rectangle
          const pocket = noise(x / 120 + 40, y / 120 + 9);
          if (pocket < 0.28) m *= 0.25 + pocket * 2;
          mask[k] = m;
        }
      }
    };

    let px = -9999;
    let py = -9999;
    let gx = px;
    let gy = py;
    let pointer = false;
    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      gx += (px - gx) * 0.14;
      gy += (py - gy) * 0.14;
      for (let j = 0, k = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const m = mask[k];
          if (m <= 0.01) continue;
          const x = ox + i * PITCH;
          const y = oy + j * PITCH;
          let hk = heat[k] * TRAIL;
          if (pointer) {
            const dx = x - gx;
            const dy = y - gy;
            const d2 = dx * dx + dy * dy;
            if (d2 < GLOW_R * GLOW_R) {
              let pr = 1 - Math.sqrt(d2) / GLOW_R;
              pr *= pr;
              if (pr > hk) hk += (pr - hk) * 0.1;
            }
          }
          heat[k] = hk;
          const sp = speed[k];
          const ph = phase[k];
          let f = reduced ? 0.25 : (0.5 + 0.5 * Math.sin(now * FLICKER * sp + ph)) * (0.5 + 0.5 * Math.sin(now * FLICKER * sp * 0.53 + ph * 2.3 + 1.1));
          f *= f;
          const dp = depth[k];
          let a = (BASE + SPARK * spark[k]) * (1 - DEPTH + DEPTH * dp) * (0.92 + (1.15 + 2.4 * hk) * f) * (1 + 0.45 * hk);
          a *= m;
          if (a <= 0.004) continue;
          const rad = DOT * (0.78 + 0.5 * dp) * (1 + 0.35 * hk);
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let running = false;
    const frame = () => {
      draw(performance.now());
      raf = running ? requestAnimationFrame(frame) : 0;
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    size();
    draw(performance.now());
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0.01 });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      if (!pointer) {
        gx = px;
        gy = py;
      }
      pointer = true;
    };
    const onVis = () => (document.hidden ? stop() : start());
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        size();
        draw(performance.now());
      }, 150);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      clearTimeout(rt);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
