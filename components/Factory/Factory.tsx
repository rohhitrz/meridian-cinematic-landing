import Image from "next/image";
import { LinkCta } from "@/components/ui/LinkCta";
import { SITE } from "@/lib/site";
import styles from "./Factory.module.css";

export function Factory() {
  return (
    <section className={styles.sec} id="factory">
      <div className={styles.media} aria-hidden="true">
        <Image className={styles.bg} src="/media/factory.webp" alt="" fill sizes="100vw" />
        <div className={styles.scrim} />
      </div>
      <div className={`container ${styles.content}`}>
        <div className={styles.copy}>
          <h2 className={`${styles.title} reveal`}>A chip foundry built for Earth and orbit</h2>
          <p className={`${styles.body} reveal`}>Logic, memory and advanced packaging, all under one roof</p>
          <div className="reveal">
            <LinkCta href={SITE.links.learn} label="Learn More" short="Learn more" />
          </div>
        </div>
      </div>
    </section>
  );
}
