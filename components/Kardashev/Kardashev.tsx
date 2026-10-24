"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SceneCanvas } from "@/components/ui/SceneCanvas";
import type { SceneHandle } from "@/lib/three/registry";
import { DESKTOP_MQ, prefersReducedMotion, useMediaQuery, usePinProgress } from "@/lib/motion";
import styles from "./Kardashev.module.css";

const TIERS = [
  { id: "Type I", desc: "Harness all of the energy on a planet" },
  { id: "Type II", desc: "Harness all of the energy from a star" },
  { id: "Type III", desc: "Harness all of the energy in a galaxy" },
];
const TIER_AT = [0, 0.5, 1];
const MOBILE_CENTRES = [0.14, 0.5, 0.86];

/**
 * Pinned scrub: the scroll position inside the tall shell drives the scene.
 * Desktop chases the target with an eased follow; phones map directly. The
 * active tier switches at p = 0.25 / 0.75 (desktop) or fades continuously.
 */
export function Kardashev() {
  const shellRef = useRef<HTMLDivElement>(null);
  const tierRefs = useRef<Array<HTMLLIElement | null>>([]);
  const sceneRef = useRef<SceneHandle | null>(null);
  const target = useRef(0);
  const current = useRef(0);
  const desktop = useMediaQuery(DESKTOP_MQ);
  const [active, setActive] = useState(0);

  usePinProgress(
    shellRef,
    (p) => {
      target.current = p;
    },
    [desktop],
    { start: desktop ? "top top" : "top 10%" },
  );

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    const loop = () => {
      const d = target.current - current.current;
      if (desktop && !reduced) current.current += Math.abs(d) > 0.35 ? d * 0.22 : d * 0.12;
      else current.current = target.current;
      if (Math.abs(d) < 0.0005) current.current = target.current;
      const p = current.current;
      sceneRef.current?.setProgress?.(p);
      if (desktop) {
        setActive(p < 0.25 ? 0 : p < 0.75 ? 1 : 2);
        tierRefs.current.forEach((t) => t && (t.style.opacity = ""));
      } else {
        tierRefs.current.forEach((t, i) => {
          if (!t) return;
          const o = Math.min(1, 0.42 + 0.58 * Math.max(0, 1 - Math.abs(p - MOBILE_CENTRES[i]) / 0.3));
          t.style.opacity = String(o);
          if (o >= 0.8) setActive(i);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [desktop]);

  const onScene = useCallback((s: SceneHandle | null) => {
    sceneRef.current = s;
    s?.setProgress?.(current.current);
  }, []);

  const goTo = (i: number) => {
    const shell = shellRef.current;
    if (!shell) return;
    const top = shell.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + TIER_AT[i] * (shell.offsetHeight - window.innerHeight), behavior: "smooth" });
  };

  return (
    <section className={`${styles.kardashev} edge-guide`} id="kardashev">
      <div ref={shellRef} className={styles.shell} data-shell>
        <div className={styles.sticky}>
          <div className={styles.media}>
            <SceneCanvas scene="kardashev" poster="/media/kardashev-poster.webp" onScene={onScene} stillWhenReduced={false} />
            <div className={styles.scrim} aria-hidden="true" />
          </div>
          <div className={`container ${styles.overlay}`}>
            <p className="kicker">The Kardashev Scale</p>
            <h2 className={styles.title}>We aspire to be a galactic civilization</h2>
            <ol className={styles.scale}>
              {TIERS.map((t, i) => (
                <li key={t.id} ref={(el) => void (tierRefs.current[i] = el)} className={`${styles.tier} ${active === i ? styles.active : ""}`}>
                  <button type="button" onClick={() => goTo(i)} aria-current={active === i ? "step" : undefined}>
                    <span className={styles.id}>{t.id}</span>
                    <span className={styles.desc}>{t.desc}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
