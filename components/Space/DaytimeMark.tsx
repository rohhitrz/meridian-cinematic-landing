"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./Space.module.css";

// Stacked lettering; each word animates in turn and replays on every re-entry.
const WORDS: Array<{ t: string; x: number; y: number; size: number }> = [
  { t: "IT'S", x: 112, y: 30, size: 30 },
  { t: "ALWAYS", x: 2, y: 92, size: 66 },
  { t: "DAYTIME", x: 0, y: 152, size: 60 },
  { t: "IN", x: 278, y: 152, size: 22 },
  { t: "ORBIT", x: 58, y: 210, size: 60 },
];

export function DaytimeMark({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return setRun(1);
    let armed = false;
    const io = new IntersectionObserver(
      ([e]) => {
        const show = e.isIntersecting && e.intersectionRatio >= 0.12;
        if (show && !armed) {
          armed = true;
          setRun((n) => n + 1);
        } else if (!show && armed) armed = false;
      },
      { threshold: [0, 0.06, 0.12, 0.22, 0.38], rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg ref={ref} className={`${className ?? ""} ${run ? styles.markReady : ""}`} viewBox="0 0 310 224" role="img" aria-label="It's always daytime in orbit">
      {/* key forces the CSS animation to restart on each re-entry */}
      <g key={run}>
        {WORDS.map((w, i) => (
          <text key={w.t} className={styles.word} style={{ ["--word-i" as string]: i }} x={w.x} y={w.y} fontSize={w.size}>
            {w.t}
          </text>
        ))}
      </g>
    </svg>
  );
}
