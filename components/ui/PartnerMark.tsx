import styles from "./PartnerMark.module.css";

/** Fictional partner as a wide-tracked text mark (no real logos in this study). */
export function PartnerMark({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  return <span className={`${styles.mark} ${styles[size]}`}>{name.toUpperCase()}</span>;
}
