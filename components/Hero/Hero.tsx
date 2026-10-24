import { SITE } from "@/lib/site";
import { LinkCta } from "@/components/ui/LinkCta";
import { PartnerMark } from "@/components/ui/PartnerMark";
import { HeroMedia } from "./HeroMedia";
import { HeroSequence } from "./HeroSequence";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} id="hero" data-hero>
      <HeroMedia />
      <div className={styles.fade} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        <h1 className={`${styles.title} ${styles.seq}`}>{SITE.name}</h1>
        <p className={`${styles.copy} ${styles.seq}`}>{SITE.tagline}</p>
        <div className={`${styles.actions} ${styles.seq}`} data-hero-actions>
          <LinkCta href={SITE.links.watch} label="Watch Now" short="Watch" />
          <LinkCta href={SITE.links.join} label="Join Us" short="Join" variant="glass" />
        </div>
        <div className={`${styles.partners} ${styles.seq}`}>
          <ul className={styles.logos} aria-label="Partners">
            {SITE.partners.map((p) => (
              <li key={p} className={styles.logo}>
                <PartnerMark name={p} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <HeroSequence readyClass={styles.ready} />
    </section>
  );
}
