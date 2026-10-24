import { PartnerMark } from "@/components/ui/PartnerMark";
import styles from "./Builders.module.css";

// Fictional partners and records for this design study.
const ROWS = [
  {
    name: "Northline",
    a: ["Delivered 6 M+ vehicles to date", "Shipped camera-only autonomous driving across its fleet", "Designed a humanoid robot for large-scale production"],
    b: ["Deployed 90 GWh+ of energy storage globally", "Built gigafactories on three continents", "Opened its own battery-materials refinery"],
  },
  {
    name: "Vantage",
    a: [
      "Flew the first reusable heavy boosters",
      "Restored crewed launch capability to home soil",
      "Carries most of the world's mass to orbit",
      "Built a GW-scale AI training cluster",
      "Runs a vast coherent supercomputer",
    ],
    b: ["Operates a global satellite internet network", "Built a high-volume PCB manufacturing site", "Flies the most powerful rocket in service", "Designing orbital AI compute at scale"],
  },
];

export function Builders() {
  return (
    <section className={styles.block} id="builders">
      <div className={`container ${styles.grid}`}>
        <header className={styles.head}>
          <h2 className="h2 reveal">
            We&apos;re builders.
            <br />
            <em className="keep">We&apos;ve done the impossible before.</em>
          </h2>
        </header>
        {ROWS.map((row) => (
          <article key={row.name} className={`${styles.row} reveal`}>
            <div className={styles.brand}>
              <PartnerMark name={row.name} size="lg" />
            </div>
            <ul className={styles.colA}>
              {row.a.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ul className={styles.colB}>
              {row.b.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
