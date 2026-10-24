import { ScaleDiagram } from "./ScaleDiagram";
import styles from "./Scaling.module.css";

const FIGS = [
  { n: "1 Billion", p: "Humanoid robots doing the work" },
  { n: "10 Million", p: "Tons of mass launched to orbit each year" },
  { n: "1 TW+", p: "Solar power required" },
];

export function Scaling() {
  return (
    <section className={styles.block} id="scaling">
      <div className="container">
        <header className={styles.head}>
          <h2 className="h2 reveal">Scaling for massive capacity</h2>
        </header>
        <div className={styles.grid}>
          <div className={styles.figs}>
            {FIGS.map((f) => (
              <div key={f.n} className={`${styles.fig} reveal`}>
                <div className={styles.n}>{f.n}</div>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
          <figure className={`${styles.plate} reveal`}>
            <ScaleDiagram />
          </figure>
        </div>
      </div>
    </section>
  );
}
