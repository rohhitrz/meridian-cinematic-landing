import styles from "./Scaling.module.css";

/*
 * Original to-scale diagram (viewBox 985 × 777, ground at y = 718):
 * a humanoid robot, a two-module satellite stack and a heavy launcher. Object
 * boxes are known exactly, so labels and height lines are placed from these.
 */
const W = 985;
const H = 777;
const GROUND = 718;
export const OBJECTS = {
  humanoid: { cx: 270, left: 262, top: 690, label: "Humanoid robot" },
  satellite: { cx: 480, left: 461, top: 436, label: "Satellite" },
  launcher: { cx: 700, left: 686, top: 326, label: "Heavy launcher" },
} as const;

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

export function ScaleDiagram() {
  return (
    <div className={styles.diagram}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A humanoid robot, a satellite and a heavy launcher drawn to the same scale">
        <defs>
          <linearGradient id="metal" x1="0" x2="1">
            <stop offset="0" stopColor="#5b5e63" />
            <stop offset="0.35" stopColor="#e4e6ea" />
            <stop offset="0.6" stopColor="#b9bcc2" />
            <stop offset="1" stopColor="#4a4d52" />
          </linearGradient>
          <linearGradient id="panel" x1="0" x2="1">
            <stop offset="0" stopColor="#2a2d33" />
            <stop offset="0.45" stopColor="#6c7079" />
            <stop offset="1" stopColor="#24272c" />
          </linearGradient>
          <pattern id="cells" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0H8V8" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* humanoid, ~28 units tall */}
        <g fill="url(#metal)">
          <circle cx="270" cy="693" r="3.2" />
          <rect x="265" y="697" width="10" height="11" rx="3" />
          <rect x="262.5" y="698" width="2.4" height="10" rx="1.2" />
          <rect x="275.1" y="698" width="2.4" height="10" rx="1.2" />
          <rect x="266" y="707.5" width="3.4" height="10.5" rx="1.4" />
          <rect x="270.6" y="707.5" width="3.4" height="10.5" rx="1.4" />
        </g>

        {/* satellite stack: two array modules joined by a docking collar */}
        <g transform="translate(480 718) scale(0.675) translate(-480 -718)">
          <rect x="452" y="300" width="56" height="190" fill="url(#panel)" />
          <rect x="452" y="300" width="56" height="190" fill="url(#cells)" />
          <rect x="463" y="490" width="34" height="14" fill="url(#metal)" />
          <rect x="452" y="504" width="56" height="214" fill="url(#panel)" />
          <rect x="452" y="504" width="56" height="214" fill="url(#cells)" />
          <rect x="452" y="300" width="56" height="418" fill="url(#fade)" />
        </g>

        {/* heavy launcher: upper stage with nose, flaps; booster with grid fins */}
        <g transform="translate(700 718) scale(0.6) translate(-700 -718)">
          <path d="M700 64 C688 84 684 104 683 128 L683 300 L717 300 L717 128 C716 104 712 84 700 64Z" fill="url(#metal)" />
          <path d="M683 104 L671 140 L671 160 L683 150Z M717 104 L729 140 L729 160 L717 150Z" fill="#8d9096" />
          <path d="M683 262 L668 300 L683 300Z M717 262 L732 300 L717 300Z" fill="#8d9096" />
          <rect x="681" y="300" width="38" height="6" fill="#3b3e43" />
          <rect x="681" y="306" width="38" height="412" fill="url(#metal)" />
          <rect x="673" y="320" width="8" height="10" fill="#6d7076" />
          <rect x="719" y="320" width="8" height="10" fill="#6d7076" />
          <rect x="681" y="690" width="38" height="28" fill="#2f3237" />
          <rect x="681" y="306" width="38" height="412" fill="url(#fade)" />
        </g>
      </svg>

      {(Object.keys(OBJECTS) as Array<keyof typeof OBJECTS>).map((k) => {
        const o = OBJECTS[k];
        const h = GROUND - o.top;
        return (
          <span
            key={k}
            className={styles.dline}
            aria-hidden="true"
            style={{ left: `calc(${pct(o.left, W)} - 13px)`, bottom: pct(H - GROUND, H), ["--h" as string]: pct(h, H) }}
          />
        );
      })}
      {(Object.keys(OBJECTS) as Array<keyof typeof OBJECTS>).map((k) => {
        const o = OBJECTS[k];
        return (
          <span key={k} className={styles.dlabel} style={{ left: pct(o.cx, W), bottom: pct(H - o.top, H) }}>
            {o.label}
          </span>
        );
      })}
    </div>
  );
}
