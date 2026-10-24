"use client";

import { useEffect, useRef } from "react";
import { getScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { SITE } from "@/lib/site";
import styles from "./Statement.module.css";

const LINES = [`${SITE.name} will close the gap between today's chip output and tomorrow's demand —`, "a future among the stars."];

/**
 * Words light up in reading order as the block scrolls through the viewport.
 * Lit count is ceil(progress × words) over the trigger window; reversible.
 */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.closest("section");
    if (!el || !section) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-w]"));
    if (prefersReducedMotion()) {
      words.forEach((w) => w.classList.add(styles.lit));
      return;
    }
    let lit = -1;
    const st = getScrollTrigger().create({
      trigger: section,
      start: "top 72%",
      end: "bottom 56%",
      onUpdate: (self) => {
        const n = Math.ceil(self.progress * words.length);
        if (n === lit) return;
        lit = n;
        words.forEach((w, i) => w.classList.toggle(styles.lit, i < n));
      },
    });
    return () => st.kill();
  }, []);

  let i = 0;
  return (
    <section className={styles.sec} id="statement">
      <div className="container">
        <p ref={ref} className={styles.statement}>
          {LINES.map((line, li) => (
            <span key={li}>
              {li > 0 && <br />}
              {line.split(" ").map((w, wi, arr) => (
                <span key={wi}>
                  <span data-w={i++} className={styles.w}>
                    {w}
                  </span>
                  {wi < arr.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
