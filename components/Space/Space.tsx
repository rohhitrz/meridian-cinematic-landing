"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { getScrollTrigger, prefersReducedMotion, smoothstep } from "@/lib/motion";
import { DaytimeMark } from "./DaytimeMark";
import styles from "./Space.module.css";

const EARTH = ["Power build", "Permitting", "Operating costs", "Land", "Energy costs", "Infrastructure", "Cooling"];
const ORBIT = ["Launch cost", "Operating costs", "Satellite build", "Infrastructure"];

export function Space() {
  const mediaRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // The sun's glow brightens as the sun (48% down the image) rises through the lower 60% of the viewport.
  useEffect(() => {
    const media = mediaRef.current;
    const glow = glowRef.current;
    if (!media || !glow) return;
    if (prefersReducedMotion()) {
      glow.style.opacity = "1";
      return;
    }
    const update = () => {
      const r = media.getBoundingClientRect();
      const vh = window.innerHeight;
      glow.style.opacity = smoothstep((vh - (r.top + r.height * 0.48)) / (vh * 0.6)).toFixed(3);
    };
    const st = getScrollTrigger().create({ trigger: media, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: update });
    update();
    return () => st.kill();
  }, []);

  return (
    <section className={`${styles.space} edge-guide`} id="space">
      <div ref={mediaRef} className={styles.media}>
        <Image className={styles.bg} src="/media/space.webp" alt="" fill sizes="100vw" />
        <div ref={glowRef} className={styles.glow} aria-hidden="true" />
        <div className={styles.scrim} aria-hidden="true" />
        <div className={styles.scrimBottom} aria-hidden="true" />
        <DaytimeMark className={styles.mark} />
      </div>
      <div className={`container ${styles.content}`}>
        <div className={`${styles.lead} reveal`}>
          <p className="kicker">Orbital compute</p>
          <h2 className="h2">Space: the only truly scalable platform for the future of AI</h2>
        </div>
        <div className={`${styles.compare} reveal`}>
          <div className={styles.col}>
            <h3>Cost of compute on Earth</h3>
            <ol>
              {EARTH.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </div>
          <div className={`${styles.col} ${styles.win}`}>
            <h3>Cost of compute in space</h3>
            <ol>
              {ORBIT.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
