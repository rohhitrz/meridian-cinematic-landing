"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
export function getScrollTrigger() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return ScrollTrigger;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Remaps x from [a, b] to [0, 1], clamped. */
export const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Tracks a media query; false during SSR. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const DESKTOP_MQ = "(min-width: 981px)";

/**
 * Pinned-section progress: 0 when the shell's top hits the viewport top, 1 when
 * its bottom reaches the viewport bottom. `onProgress` receives the raw value;
 * callers apply their own smoothing so the scroll handler stays cheap.
 */
export function usePinProgress(
  shellRef: React.RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  deps: React.DependencyList = [],
  bounds: { start?: string; end?: string } = {},
) {
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ST = getScrollTrigger();
    const st = ST.create({
      trigger: el,
      start: bounds.start ?? "top top",
      end: bounds.end ?? "bottom bottom",
      onUpdate: (self) => onProgress(self.progress),
      onRefresh: (self) => onProgress(self.progress),
    });
    onProgress(st.progress);
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
