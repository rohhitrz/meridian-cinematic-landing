import { SITE } from "@/lib/site";
import styles from "./Wordmark.module.css";

/**
 * Text wordmark split into an initial and the rest, so the nav can collapse the
 * rest while the initial settles into a tile. Decorative: the enclosing link
 * carries the accessible name.
 */
export function Wordmark({ className }: { className?: string }) {
  const [first, ...rest] = SITE.wordmark;
  return (
    <span className={[styles.mark, className].filter(Boolean).join(" ")} aria-hidden="true">
      <span className={styles.tile} data-part="tile" />
      <span className={styles.first} data-part="first">
        {first}
      </span>
      <span className={styles.restTrack} data-part="track">
        <span className={styles.rest}>{rest.join("")}</span>
      </span>
    </span>
  );
}
