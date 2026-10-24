import Image from "next/image";
import styles from "./Chips.module.css";

const CHIPS = [
  { code: "M1", line: "Powering vehicles & robotics", alt: "M1 chip package on an amber backdrop" },
  { code: "M2", line: "Powering humanoid robots", alt: "M2 chip package on a charcoal backdrop" },
  { code: "O1", line: "Powering orbital compute", alt: "O1 chip package lit in deep blue" },
  { code: null, line: null, alt: "A patterned silicon wafer" },
];

export function Chips() {
  return (
    <section className={styles.block} id="chips">
      <div className={`container ${styles.wrap}`}>
        <header className={styles.head}>
          <h2 className="h2 reveal">Producing chips for use on Earth and in space</h2>
        </header>
        <div className={styles.grid}>
          {CHIPS.map((c, i) => (
            <figure key={i} className={`${styles.chip} reveal`}>
              <div className={styles.img}>
                <Image src={`/media/chip-${i}.webp`} alt={c.alt} fill sizes="(max-width: 980px) 50vw, 271px" />
              </div>
              <figcaption>
                {c.code ? (
                  <>
                    <b className={styles.badge}>{c.code}</b>
                    <span>{c.line}</span>
                  </>
                ) : (
                  <b className={styles.beyond}>…and Beyond</b>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
