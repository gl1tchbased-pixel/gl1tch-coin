import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { tokenomicsContent } from "@/content/tokenomics";
import { TRUST_REPORT } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./Tokenomics.module.css";

export function Tokenomics() {
  const { headline, body, allocations, badges, cta } = tokenomicsContent;

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
          <div className={styles.bar} role="img" aria-label="Token allocation">
            {allocations.map((a) => (
              <span
                key={a.label}
                className={styles.segment}
                style={{ width: `${a.percent}%` }}
                title={`${a.label} ${a.percent}%`}
              />
            ))}
          </div>
          <ul className={styles.legend}>
            {allocations.map((a, i) => (
              <li key={a.label} className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ opacity: 1 - i * 0.16 }}
                />
                <span className={styles.legendLabel}>{a.label}</span>
                <span className={styles.legendPct}>{a.percent}%</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
