import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { CURRENT_LAUNCH_STATUS, LAUNCH_STATUS } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./SocialProof.module.css";

/** Real-only social proof. Pre-launch shows the fair-launch promise, not fake metrics. */
const preLaunchPoints = [
  { id: "sp-tax", stat: "0%", label: "Buy / sell tax" },
  { id: "sp-renounce", stat: "100%", label: "Authorities revoked at launch" },
  { id: "sp-presale", stat: "No", label: "Presale or hidden allocation" },
];

export function SocialProof() {
  const live = CURRENT_LAUNCH_STATUS === LAUNCH_STATUS.LIVE;
  return (
    <section className={shared.section} id="social-proof">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Social Proof</span>
          <h2 className={shared.title}>The Pattern Is Already Visible.</h2>
        </Reveal>
        <Reveal className={styles.grid}>
          {preLaunchPoints.map((p) => (
            <Card key={p.id} id={p.id} variant="elevated" className={styles.card}>
              <span className={styles.stat}>{p.stat}</span>
              <span className={styles.label}>{p.label}</span>
            </Card>
          ))}
        </Reveal>
        {!live && (
          <Reveal>
            <p className={styles.note}>
              Live holder count, volume, and verified coverage appear here at launch —
              real metrics only, never fabricated.
            </p>
          </Reveal>
        )}

        <Reveal>
          <p className={styles.verifiedLabel}>Verifiable on</p>
          <ul className={styles.platforms}>
            {["Solana", "Solscan", "DEXScreener", "RugCheck", "SolSniffer", "Pump.fun"].map(
              (p) => (
                <li key={p} className={styles.platform}>
                  {p}
                </li>
              )
            )}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
