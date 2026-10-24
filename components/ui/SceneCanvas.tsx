"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SCENES, type SceneHandle } from "@/lib/three/registry";
import { webglAvailable } from "@/lib/three/support";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./SceneCanvas.module.css";

interface Props {
  scene: keyof typeof SCENES;
  poster: string;
  className?: string;
  /** Receives the live scene once created (for scroll-driven progress). */
  onScene?: (scene: SceneHandle | null) => void;
  /** Keep the poster only (no live render) when motion is reduced. */
  stillWhenReduced?: boolean;
  priority?: boolean;
  sizes?: string;
}

/**
 * Poster image underneath, live WebGL canvas on top once its first frame is
 * ready. The scene module is fetched only when the section nears the viewport;
 * without WebGL the poster simply stays.
 */
export function SceneCanvas({ scene, poster, className, onScene, stillWhenReduced = true, priority, sizes = "100vw" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const onSceneRef = useRef(onScene);
  onSceneRef.current = onScene;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !webglAvailable()) return;
    if (stillWhenReduced && prefersReducedMotion()) return;
    let handle: SceneHandle | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        SCENES[scene]().then((create) => {
          if (cancelled) return;
          handle = create(canvas, () => {
            if (cancelled) return;
            requestAnimationFrame(() => setLive(true));
          });
          onSceneRef.current?.(handle);
        });
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(wrap);
    return () => {
      cancelled = true;
      io.disconnect();
      onSceneRef.current?.(null);
      handle?.dispose();
    };
  }, [scene, stillWhenReduced]);

  return (
    <div ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(" ")} aria-hidden="true">
      <Image className={styles.poster} src={poster} alt="" fill sizes={sizes} priority={priority} />
      <canvas ref={canvasRef} className={`${styles.canvas} ${live ? styles.live : ""}`} />
    </div>
  );
}
