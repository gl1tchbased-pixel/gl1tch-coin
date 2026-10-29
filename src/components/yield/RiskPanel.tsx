import styles from "@/app/yield/yield.module.css";
import type { Risk } from "@/lib/yield/risk";

const LABEL = { low: "Low", moderate: "Moderate", elevated: "Elevated", high: "High" } as const;

/** The risk score with every point explained; hard warnings sit above it, outside the score. */
export function RiskPanel({ risk }: { risk: Risk }) {
  return (
    <div>
      {risk.warnings.length > 0 && (
        <div className={styles.warnings} role="alert">
          {risk.warnings.map((w) => (
            <div key={w} className={styles.warning}>⚠ {w}</div>
          ))}
        </div>
      )}
      <p className={styles.p}>
        <span className={`${styles.pill} ${styles[risk.level]}`}>{LABEL[risk.level]} · {risk.score}/100</span>{" "}
        Higher means riskier. Each point below says where it comes from.
      </p>
      {risk.reasons.length ? (
        <ul className={styles.reasons}>
          {risk.reasons.map((r) => (
            <li key={r.text}>
              <span className={styles.points}>+{r.points}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.p}>No risk points from what GL1TCH can measure. That is not the same as safe.</p>
      )}
    </div>
  );
}
