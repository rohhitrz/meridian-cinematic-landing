"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./LinkCta.module.css";

type Variant = "fill" | "glass" | "plain";

interface BaseProps {
  label: string;
  /** Shorter label shown at ≤560px. */
  short?: string;
  variant?: Variant;
  className?: string;
}
type Props = BaseProps & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * CTA whose chevron springs into an arrow on hover/focus. A damped spring
 * (k=500, c=30) drives the three line endpoints so reversals stay fluid.
 */
export function LinkCta({ label, short, variant = "fill", className, ...rest }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const target = useRef(0);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const [shaft, upper, lower] = Array.from(svg.querySelectorAll("line"));
    const apply = (p: number) => {
      shaft.setAttribute("x1", String(lerp(15, 9, p)));
      shaft.setAttribute("x2", String(lerp(15, 18, p)));
      shaft.style.opacity = p < 0.1 ? "0" : String((p - 0.1) / 0.9);
      for (const l of [upper, lower]) {
        l.setAttribute("x1", String(lerp(11, 14, p)));
        l.setAttribute("x2", String(lerp(15, 18, p)));
      }
    };
    apply(0);
    const reduced = prefersReducedMotion();
    let p = 0;
    let v = 0;
    let raf = 0;
    const tick = () => {
      const f = -500 * (p - target.current) - 30 * v;
      v += f / 60;
      p += v / 60;
      if (Math.abs(p - target.current) < 0.002 && Math.abs(v) < 0.002) {
        p = target.current;
        v = 0;
      }
      apply(p);
      raf = p !== target.current || Math.abs(v) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    kick.current = () => {
      if (reduced) return apply(target.current);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    return () => cancelAnimationFrame(raf);
  }, []);

  const on = () => {
    target.current = 1;
    kick.current();
  };
  const off = () => {
    target.current = 0;
    kick.current();
  };
  const cls = [styles.cta, styles[variant], className].filter(Boolean).join(" ");
  const content = (
    <>
      {short ? (
        <>
          <span className="cta-full">{label}</span>
          <span className="cta-mob">{short}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
      <span className={styles.arrow} aria-hidden="true">
        <svg ref={svgRef} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="15" y1="12" x2="15" y2="12" />
          <line x1="11" y1="8" x2="15" y2="12" />
          <line x1="11" y1="16" x2="15" y2="12" />
        </svg>
      </span>
    </>
  );
  const handlers = { onMouseEnter: on, onMouseLeave: off, onFocus: on, onBlur: off };
  if ("href" in rest && rest.href !== undefined) {
    return (
      <a className={cls} href={rest.href} {...handlers}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={rest.onClick} {...handlers}>
      {content}
    </button>
  );
}
