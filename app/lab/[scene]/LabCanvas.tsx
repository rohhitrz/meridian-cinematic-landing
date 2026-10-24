"use client";

import { useEffect, useRef } from "react";
import { SCENES, type SceneHandle } from "@/lib/three/registry";

export function LabCanvas({ scene }: { scene: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const q = new URLSearchParams(location.search);
    const p = parseFloat(q.get("p") ?? "0");
    const frozen = q.has("t") ? parseFloat(q.get("t")!) : null;
    const [key, v] = scene.split("-");
    let handle: SceneHandle | null = null;
    let cancelled = false;
    SCENES[key]?.().then((create) => {
      if (cancelled) return;
      handle = create(
        canvas,
        () => {
          if (frozen !== null) handle?.stage.renderNow(frozen);
          // Signal for the still-capture script once assets are in.
          requestAnimationFrame(() => (document.body.dataset.ready = "1"));
        },
        { still: frozen !== null, variant: v ? parseInt(v, 10) : 0 },
      );
      handle.setProgress?.(p);
      if (frozen !== null) handle.stage.renderNow(frozen);
    });
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [scene]);
  return <canvas ref={ref} data-scene={scene} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }} />;
}
