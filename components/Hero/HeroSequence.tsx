"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const HERO_READY_DELAY = 280;

/** Starts the hero copy entrance shortly after the nav logo (two frames + 280ms). */
export function HeroSequence({ readyClass }: { readyClass: string }) {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) return;
    if (prefersReducedMotion()) {
      hero.classList.add(readyClass);
      return;
    }
    let timer = 0;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        timer = window.setTimeout(() => hero.classList.add(readyClass), HERO_READY_DELAY);
      }),
    );
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(timer);
    };
  }, [readyClass]);
  return null;
}
