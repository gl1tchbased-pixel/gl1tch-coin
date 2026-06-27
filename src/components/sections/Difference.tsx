import { Reveal } from "@/components/effects/Reveal";
import shared from "./shared.module.css";
import styles from "./Difference.module.css";

interface Row {
  criteria: string;
  gl1tch: string;
  average: string;
}

const rows: Row[] = [
  { criteria: "Buy / Sell Tax", gl1tch: "0% / 0% — protocol-level", average: "5–10%, often hidden" },
  { criteria: "Mint Authority", gl1tch: "Revoked — supply is fixed", average: "Frequently retained" },
  { criteria: "Freeze Authority", gl1tch: "Revoked — can't freeze you", average: "Can blacklist wallets" },
  { criteria: "Liquidity", gl1tch: "Burned / locked at migration", average: "Pulled — the classic rug" },
  { criteria: "Utility", gl1tch: "Live holder-gated ranks & rooms", average: "“Coming soon” forever" },
  { criteria: "Your Funds", gl1tch: "Never touched — read-only access", average: "“Approve” wallet drainers" },
  { criteria: "Transparency", gl1tch: "Public changelog + give-back wallet", average: "Anon, silent after launch" },
  { criteria: "Verification", gl1tch: "RugCheck clean, fully on-chain", average: "Unverifiable promises" },
];

export function Difference() {
  return (
    <section className={`${shared.section} ${shared.alt}`} id="difference" aria-label="How GL1TCH compares">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>The Difference</span>
          <h2 className={shared.title}>Not Your Average Meme Coin.</h2>
          <p className={shared.body}>
            Most meme coins die the same way: a hidden tax, a retained mint key, a
            yanked pool. GL1TCH closes every one of those doors — and you can
            verify it yourself, on-chain, right now.
          </p>
        </Reveal>

        <Reveal className={styles.table}>
          <div className={`${styles.row} ${styles.headRow}`}>
            <span className={styles.criteria} />
            <span className={`${styles.col} ${styles.colGl}`}>
              <span className={styles.brand}>$GL1TCH</span>
            </span>
            <span className={`${styles.col} ${styles.colAvg}`}>
              Average Meme Coin
            </span>
          </div>

          {rows.map((r) => (
            <div key={r.criteria} className={styles.row}>
              <span className={styles.criteria}>{r.criteria}</span>
              <span className={`${styles.col} ${styles.colGl}`}>
                <span className={styles.yes} aria-hidden="true">✓</span>
                <span className={styles.cellText}>{r.gl1tch}</span>
              </span>
              <span className={`${styles.col} ${styles.colAvg}`}>
                <span className={styles.no} aria-hidden="true">✕</span>
                <span className={styles.cellTextMuted}>{r.average}</span>
              </span>
            </div>
          ))}
        </Reveal>

        <Reveal className={styles.footnote}>
          <span className={styles.glow} aria-hidden="true" />
          Don&apos;t take our word for it — every claim in the left column is a
          public, on-chain fact. That&apos;s the whole point.
        </Reveal>
      </div>
    </section>
  );
}
