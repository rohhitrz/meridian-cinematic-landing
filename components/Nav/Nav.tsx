"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { Wordmark } from "@/components/ui/Wordmark";
import styles from "./Nav.module.css";

const NAV_SCROLL = 320;
const navEase = (t: number) => 1 - Math.pow(1 - t, 2.4);

/**
 * Fixed nav. Frost (blur + tint) eases in over the first 320px of scroll; once
 * the hero CTAs leave the viewport the wordmark collapses to its initial tile
 * and the nav CTAs fade in. The full wordmark returns over the footer.
 */
export function Nav() {
  const ref = useRef<HTMLElement>(null);
  const [heroPast, setHeroPast] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  const [logoIn, setLogoIn] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const t = navEase(Math.min(1, window.scrollY / NAV_SCROLL));
      nav.style.setProperty("--nav-blur", `${(t * 26).toFixed(1)}px`);
      nav.style.setProperty("--nav-bg", t.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io: IntersectionObserver[] = [];
    const actions = document.querySelector("[data-hero-actions]");
    if (actions) {
      const o = new IntersectionObserver(([e]) => setHeroPast(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      o.observe(actions);
      io.push(o);
    }
    const footer = document.getElementById("join");
    if (footer) {
      const o = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { rootMargin: "0px 0px -50% 0px" });
      o.observe(footer);
      io.push(o);
    }
    // two frames so the initial state paints before the entrance transition
    const r1 = requestAnimationFrame(() => requestAnimationFrame(() => setLogoIn(true)));
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(r1);
      io.forEach((o) => o.disconnect());
    };
  }, []);

  const cls = [styles.nav, logoIn && styles.logoIn, heroPast && styles.ctaVisible, heroPast && !atFooter && styles.retract]
    .filter(Boolean)
    .join(" ");

  return (
    <header ref={ref} className={cls}>
      <div className={styles.frost} aria-hidden="true">
        <span className={`${styles.band} ${styles.b1}`} />
        <span className={`${styles.band} ${styles.b2}`} />
        <span className={`${styles.band} ${styles.b3}`} />
        <span className={`${styles.band} ${styles.b4}`} />
      </div>
      <div className={styles.inner}>
        <a className={styles.brand} href="#top" aria-label={`${SITE.name} home`}>
          <Wordmark className={styles.logo} />
        </a>
        <nav className={styles.actions} aria-label="Primary">
          <a className={styles.link} href={SITE.links.watch} tabIndex={heroPast ? 0 : -1}>
            <span className="cta-full">Watch Now</span>
            <span className="cta-mob">Watch</span>
          </a>
          <a className={`${styles.link} ${styles.linkCta}`} href={SITE.links.join} tabIndex={heroPast ? 0 : -1}>
            <span className="cta-full">Join Us</span>
            <span className="cta-mob">Join</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
