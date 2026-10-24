"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Observes every `.reveal` on the page once. Siblings that are both reveals get
 * a 70ms stagger (capped at 0.4s).
 */
export function Reveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    els.forEach((el) => {
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal")) : [];
      const i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty("--reveal-delay", `${Math.min(i * 0.07, 0.4)}s`);
    });
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in-view");
          io.unobserve(e.target);
        }),
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
