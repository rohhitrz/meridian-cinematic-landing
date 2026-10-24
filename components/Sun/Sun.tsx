"use client";

import { useEffect, useRef, useState } from "react";
import { SceneCanvas } from "@/components/ui/SceneCanvas";
import { DESKTOP_MQ, clamp01, getScrollTrigger, prefersReducedMotion, useMediaQuery } from "@/lib/motion";
import styles from "./Sun.module.css";

const POINTS = ["Capture far more of the Sun's energy", "Manufacture AI chips at scale", "Open the path to interplanetary travel"];

export function Sun() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery(DESKTOP_MQ);
  const [markerIn, setMarkerIn] = useState(false);

  // Marker draws in once the section is a third visible (desktop only).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !desktop) return;
    if (prefersReducedMotion()) return setMarkerIn(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setMarkerIn(true);
        io.disconnect();
      },
      { threshold: 0.32 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [desktop]);

  // Desktop: the left scrim (and its faint horizon line) deepens as the section rises.
  useEffect(() => {
    const el = sectionRef.current;
    const scrim = scrimRef.current;
    if (!el || !scrim || !desktop || prefersReducedMotion()) return;
    const st = getScrollTrigger().create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: () => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const fade = clamp01((r.top + r.height * 0.38 - vh * 0.22) / (vh * 0.38));
        scrim.style.opacity = String(0.22 + fade * 0.78);
        scrim.style.setProperty("--sun-line", String(0.12 + fade * 0.38));
      },
    });
    return () => st.kill();
  }, [desktop]);

  return (
    <section ref={sectionRef} className={`${styles.sun} edge-guide`} id="sun">
      <div className={styles.media}>
        <SceneCanvas scene="sun" poster="/media/sun-poster.webp" />
        <div className={styles.scrimTop} aria-hidden="true" />
        <div ref={scrimRef} className={styles.scrim} aria-hidden="true" />
      </div>
      {desktop && (
        <div className={styles.overlay} aria-hidden="true">
          <div className={`container ${styles.overlayInner}`}>
            <div className={`${styles.marker} ${markerIn ? styles.markerIn : ""}`}>
              <div className={styles.callout}>
                <span className={styles.label}>You are here</span>
                <span className={styles.tick} />
              </div>
              <div className={styles.earthWrap}>
                <svg className={styles.ring} viewBox="0 0 40 40">
                  <path
                    className={styles.ringSketch}
                    pathLength={1}
                    d="M20 6.5 C27 6 33 11 34 17.4 C34.8 23.6 30.6 29.4 24 31.2 C17.6 33 11.4 30.2 8.8 24.2 C6.8 19 8.6 13.2 13.2 9.4 C15.6 7.6 18 6.8 20.6 6.6"
                  />
                  <path
                    className={styles.ringPath}
                    pathLength={1}
                    d="M20 8 C26 7.6 31 11.4 32 16.8 C32.8 21.8 29 26.6 23.6 28.2 C18.2 29.8 13 27.4 10.8 22.4 C9 18 10.6 13.2 14.2 10.4 C16.2 8.9 18.2 8.2 20.8 8.2"
                  />
                </svg>
                <span className={styles.earth}>
                  <span className={styles.tip}>Earth</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`container ${styles.content}`}>
        <h2 className="h2 reveal">
          Harnessing the power of <span className="keep">the Sun</span>
        </h2>
        <ul className={styles.list}>
          {POINTS.map((p) => (
            <li key={p} className="reveal">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
