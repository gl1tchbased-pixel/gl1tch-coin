import type { Metadata } from "next";
import Link from "next/link";
import { BUYBACKS, buybackTotals } from "@/content/buybacks";
import styles from "./buyback.module.css";

export const metadata: Metadata = {
  title: "Buyback & Burn Ledger — GL1TCH",
  description:
    "GL1TCH's public buyback→burn ledger. Value accrual is engineered, staged, and honest: real revenue is routed into $GL1TCH buybacks and burned, with every transaction verifiable on Solscan. Non-custodial — no user funds, no promises.",
  alternates: { canonical: "/buyback" },
};

const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}`;
const fmt = (n: number) => n.toLocaleString("en-US");

export default function BuybackPage() {
  const totals = buybackTotals();
  const live = BUYBACKS.length > 0;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Value accrual · radically honest</span>
        <h1 className={styles.title}>
          Buyback &amp; <span className={styles.signal}>burn</span> ledger
        </h1>
        <p className={styles.lede}>
          A useful product doesn&apos;t make a valuable token — value accrual is a separate,
          engineered pillar. When GL1TCH earns real revenue, it routes that revenue into open-market
          $GL1TCH buybacks and burns them, shrinking a fixed supply. Every buy and burn is a public
          transaction you can verify on Solscan. No user funds, no yield promise.
        </p>
      </header>

      {live ? (
        <>
          <section className={styles.totals}>
            <div className={styles.stat}><span className={styles.statV}>{totals.cycles}</span><span className={styles.statK}>cycles</span></div>
            <div className={styles.stat}><span className={styles.statV}>{fmt(totals.glitchBurned)}</span><span className={styles.statK}>$GL1TCH burned</span></div>
            <div className={styles.stat}><span className={styles.statV}>${fmt(totals.revenueUsd)}</span><span className={styles.statK}>revenue routed</span></div>
          </section>

          <section className={styles.ledger}>
            <div className={`${styles.row} ${styles.head}`}>
              <span>Date</span><span>Revenue</span><span>Burned</span><span>Proof</span>
            </div>
            {BUYBACKS.map((b) => (
              <div key={b.burnTx} className={styles.row}>
                <span>{b.date}</span>
                <span>${fmt(b.revenueUsd)}</span>
                <span>{fmt(b.glitchBurned)} $GL1TCH</span>
                <span className={styles.proof}>
                  <a href={solscanTx(b.buyTx)} target="_blank" rel="noreferrer">buy ↗</a>
                  <a href={solscanTx(b.burnTx)} target="_blank" rel="noreferrer">burn ↗</a>
                </span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className={styles.empty}>
          <span className={styles.emptyTag}>designed · not yet active</span>
          <h2 className={styles.emptyH}>No buybacks yet — and we won&apos;t pretend otherwise.</h2>
          <p className={styles.emptyP}>
            This mechanism activates <strong>only</strong> when GL1TCH has real, sustained revenue
            (≥3 months), after a third-party audit and founder approval. There is no revenue to route
            yet, so there are no buybacks — and inventing one would be a lie this project won&apos;t
            tell. When the first real buyback happens, its buy + burn transaction signatures will
            appear here, each verifiable on Solscan.
          </p>
          <p className={styles.emptyP}>
            This is the honest half of the investment case: the token&apos;s <em>required utility</em>
            is live today; its <em>value-accrual</em> mechanism is engineered and staged, on the proven
            Chainlink / Sky / GMX templates — real, then routed.
          </p>
        </section>
      )}

      <section className={styles.how}>
        <span className={styles.kicker}>How it will work</span>
        <h2 className={styles.h2}>Real revenue → buy → burn → published.</h2>
        <ol className={styles.steps}>
          <li><strong>Real revenue.</strong> Paid B2B usage of the risk-API, randomness-as-a-service, and agent-trust API accrues to the operations multisig — never user funds, never minted supply.</li>
          <li><strong>Open-market buy.</strong> On a published cadence, that revenue market-buys $GL1TCH on a public venue (no OTC, no self-dealing).</li>
          <li><strong>Burn.</strong> The bought tokens are sent to the incinerator, permanently reducing a fixed supply.</li>
          <li><strong>Publish.</strong> Every buy + burn signature is posted here and links to Solscan. A buyback is structural demand — not a dividend, and not a promise of price.</li>
        </ol>
        <p className={styles.note}>
          Non-custodial throughout: the token contract is untouched (mint + freeze revoked), no
          staking or deposits exist, and the multisig only ever spends its own revenue.
        </p>
        <div className={styles.cta}>
          <Link href="/token" className={styles.btnPrimary}>The full investment case →</Link>
          <Link href="/quantum-core" className={styles.btnGhost}>See the product</Link>
          <Link href="/security" className={styles.btnGhost}>Security &amp; trust</Link>
        </div>
      </section>
    </main>
  );
}
