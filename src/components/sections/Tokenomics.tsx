import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { tokenomicsContent } from "@/content/tokenomics";
import { TRUST_REPORT } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./Tokenomics.module.css";

export function Tokenomics() {
  const { headline, body, launch, badges, cta } = tokenomicsContent;

  return (
    <section className={`${shared.section} ${shared.alt}`} id="tokenomics">
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.text}>
          <h2 className={shared.title}>{headline}</h2>
          <p className={shared.body}>{body}</p>
          <ul className={styles.badges}>
            {badges.map((badge) => {
              const verified =
                badge.verifyKey === null
                  ? true
                  : Boolean(TRUST_REPORT[badge.verifyKey]);
              return (
                <li key={badge.id} className={styles.badge} id={badge.id}>
                  <span
                    className={verified ? styles.check : styles.pending}
                    aria-hidden="true"
                  >
                    {verified ? "✓" : "○"}
                  </span>
                  <span>{badge.label}</span>
                  {!verified && (
                    <span className={styles.pendingTag}>verifies at launch</span>
                  )}
                </li>
              );
            })}
          </ul>
          <Link href={cta.href} className={styles.cta} id={cta.id}>
            {cta.label} →
          </Link>
        </Reveal>

        <Reveal className={styles.chart} delay={120}>
          <div
            className={styles.bar}
            role="img"
            aria-label={`${launch.label}: ${launch.openMarketPercent}% of supply`}
          >
            <span className={styles.segment} style={{ width: `${launch.openMarketPercent}%` }} />
          </div>
          <div className={styles.barLegend}>
            <span className={styles.legendLabel}>{launch.label}</span>
            <span className={styles.legendPct}>{launch.openMarketPercent}%</span>
          </div>
          <ul className={styles.facts}>
            {launch.facts.map((f) => (
              <li key={f.id} className={styles.fact} id={`launch-${f.id}`}>
                <span className={styles.factTitle}>{f.title}</span>
                <span className={styles.factDetail}>{f.detail}</span>
              </li>
            ))}
          </ul>
          <Link href={launch.liveHref} className={styles.cta}>
            See the live holder list →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
