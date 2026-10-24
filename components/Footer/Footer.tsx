import { LinkCta } from "@/components/ui/LinkCta";
import { SITE } from "@/lib/site";
import { DotField } from "./DotField";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} id="join">
      <DotField className={styles.field} />
      <div className={styles.fade} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <div className={styles.cta}>
          <h2 className={`${styles.head} reveal`}>
            Join us on
            <br />
            our journey.
          </h2>
          <div className={`${styles.actions} reveal`}>
            <LinkCta href={SITE.links.join} label="Join Us" />
          </div>
        </div>
        <div className={styles.base}>
          <p className={styles.legal}>
            Independent design study. {SITE.name} and its partners are fictional; not affiliated with any company.
          </p>
          <p className={styles.legal}>
            Earth imagery:{" "}
            <a href="https://visibleearth.nasa.gov/" rel="noopener noreferrer" target="_blank">
              NASA Visible Earth
            </a>
            . All other visuals generated for this study.
          </p>
        </div>
      </div>
    </footer>
  );
}
