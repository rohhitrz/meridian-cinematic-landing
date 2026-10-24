"use client";

import { useCallback, useEffect, useRef } from "react";
import { SceneCanvas } from "@/components/ui/SceneCanvas";
import type { SceneHandle } from "@/lib/three/registry";
import { getScrollTrigger, prefersReducedMotion, useMediaQuery } from "@/lib/motion";
import { SITE } from "@/lib/site";
import styles from "./Output.module.css";

const PHONE_MQ = "(max-width: 560px)";

/**
 * Size comparison scrubbed by scroll. Pinned on wider screens (300vh runway);
 * on phones the 16:9 box scrubs as it travels through the viewport in flow.
 * Captions appear in fixed progress windows; the one being replaced hides
 * instantly so fast reversals never stack two labels.
 */
export function Output() {
  const shellRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const gfRef = useRef<HTMLElement>(null);
  const tfRef = useRef<HTMLElement>(null);
  const cmpRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const target = useRef(0);
  const phone = useMediaQuery(PHONE_MQ);

  useEffect(() => {
    const trigger = phone ? mediaRef.current : shellRef.current;
    if (!trigger) return;
    const st = getScrollTrigger().create({
      trigger,
      start: phone ? "bottom 90%" : "top top",
      end: phone ? "top 20%" : "bottom bottom",
      onUpdate: (self) => (target.current = self.progress),
      onRefresh: (self) => (target.current = self.progress),
    });
    target.current = st.progress;
    return () => st.kill();
  }, [phone]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let cur = target.current;
    let last = performance.now();
    let raf = 0;
    const setIn = (el: HTMLElement | null, on: boolean) => {
      if (!el) return;
      if (on) el.classList.remove(styles.snap);
      el.classList.toggle(styles.in, on);
    };
    const snapHide = (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.add(styles.snap);
      el.classList.remove(styles.in);
    };
    const apply = (p: number) => {
      sceneRef.current?.setProgress?.(p);
      const gf = p >= 0.3 && p <= 0.45;
      const tf = p >= 0.72;
      if (gf) snapHide(tfRef.current);
      else if (tf) snapHide(gfRef.current);
      setIn(gfRef.current, gf);
      setIn(tfRef.current, tf);
      setIn(cmpRef.current, tf);
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = target.current - cur;
      if (reduced) cur = target.current;
      else {
        // frame-rate independent follow: quick when far, soft when close
        const rate = 10 + Math.min(18, Math.abs(d) * 40);
        cur += d * (1 - Math.exp(-rate * dt));
        if (Math.abs(d) < 0.0004) cur = target.current;
      }
      apply(cur);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onScene = useCallback((s: SceneHandle | null) => {
    sceneRef.current = s;
    s?.setProgress?.(target.current);
  }, []);

  return (
    <section className={styles.block} id="output">
      <div className="container">
        <header className={styles.head}>
          <h2 className="h2 reveal">Production at terawatt scale</h2>
        </header>
        <div ref={shellRef} className={styles.shell} data-shell>
          <div className={styles.sticky}>
            <div ref={mediaRef} className={styles.media}>
              <SceneCanvas scene="output" poster="/media/output-poster.webp" onScene={onScene} stillWhenReduced={false} sizes="(max-width: 1180px) 100vw, 1084px" />
              <div className={styles.overlay} aria-hidden="true">
                <figure ref={gfRef} className={`${styles.cap} ${styles.capGf}`}>
                  <span className={styles.capN}>10,000,000 ft²</span>
                  <span className={styles.capL}>A typical gigafactory</span>
                  <span className={styles.capLine} />
                </figure>
                <figure ref={tfRef} className={`${styles.cap} ${styles.capTf}`}>
                  <span className={styles.capN}>100,000,000 ft²</span>
                  <span className={styles.capL}>{SITE.name}</span>
                  <span className={styles.capLine} />
                </figure>
                <div ref={cmpRef} className={styles.compare}>
                  <div className={`${styles.stat} ${styles.statHi}`}>
                    <span className={styles.statL}>{SITE.name} output</span>
                    <span className={styles.statN}>
                      1 TW<span className={styles.statU}>/Year</span>
                    </span>
                  </div>
                  <span className={styles.div} />
                  <div className={`${styles.stat} ${styles.statUs}`}>
                    <span className={styles.statL}>Current annual U.S. consumption</span>
                    <span className={styles.statN}>.5 TW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="sr-only">
          A size comparison: a person, a typical 10 million square foot gigafactory, then a 100 million square foot campus producing about 1 terawatt a year, against
          current U.S. consumption of about half a terawatt.
        </p>
      </div>
    </section>
  );
}
