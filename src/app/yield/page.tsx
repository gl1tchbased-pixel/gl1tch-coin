import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import { getYieldSnapshot } from "@/lib/yield/client";
import { toRow } from "@/lib/yield/view";
import { ago } from "@/lib/yield/format";
import { METHOD_TEXT } from "@/lib/yield/copy";
import { RISK_WEIGHTS } from "@/lib/yield/risk";
import { YieldTable } from "@/components/yield/YieldTable";
import { Disclaimer, Unavailable, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "./yield.module.css";

export const revalidate = 300;

export const metadata: Metadata = shareMeta({
  title: "Yield X-Ray — where does the APY come from? | GL1TCH",
  description:
    "Staking, lending and vault yields on Ethereum, Base, Arbitrum, BNB Chain, Robinhood Chain and Solana, read straight from the chain. Who pays each yield, how you get out, an explainable risk score, and the exact request to verify it yourself. Free, read-only, not financial advice.",
  alternates: { canonical: "/yield" },
});

export default async function YieldPage() {
  const snap = await getYieldSnapshot();
  const rows = snap ? snap.opportunities.map(toRow) : [];
  const chains = new Set(rows.map((r) => r.chain)).size;
  const failed = snap?.sources.filter((s) => !s.ok).length ?? 0;

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">Yield X-Ray</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Where does the <span style={{ color: "var(--color-signal)" }}>APY</span> come from?
        </h1>
        <p className={`t-body-lg ${styles.lede}`}>
          Every number below is read straight from the chain: Aave&apos;s live rates, Solana stake pools, ETH staking tokens and
          Robinhood Chain vaults. Each card says who pays the yield, how you get your money out, and gives you the exact request to
          check it yourself. Sorted by risk, not by the biggest number.
        </p>
        <YieldSubnav />
      </div>

      {snap ? (
        <>
          <p className={styles.fresh}>
            Updated {ago(snap.updatedAt)} · {rows.length} opportunities on {chains} chains
            {failed > 0 && ` · ${failed} source${failed === 1 ? "" : "s"} failed on the last read (rows marked stale)`}
          </p>
          <YieldTable rows={rows} />
        </>
      ) : (
        <Unavailable />
      )}

      <div className={styles.section}>
        <h2 className={styles.h2}>How GL1TCH measures</h2>
        <p className={styles.p}><strong>Live rate.</strong> {METHOD_TEXT.rate} Aave&apos;s supply rate is what borrowers pay right now, shared with suppliers.</p>
        <p className={styles.p}><strong>Last epoch.</strong> {METHOD_TEXT.epoch} A Solana stake-pool account stores both today&apos;s rate and the rate at the last epoch boundary.</p>
        <p className={styles.p}>
          <strong>Measured growth.</strong> {METHOD_TEXT.growth} Free public nodes only serve the latest state, so these show
          &ldquo;measuring&rdquo; until GL1TCH has a day of its own history, and switch to a 7-day window after a week.
        </p>
        <p className={styles.p}>
          <strong>Risk score.</strong> 0 to 100, higher is riskier, built from what can be measured: size of the market (up to{" "}
          {RISK_WEIGHTS.depth.under1m}), how easily you can leave (up to {RISK_WEIGHTS.exit.idleUnder5}), how long the yield has been
          measured, yields far above what the activity usually pays (up to {RISK_WEIGHTS.outlier.stableOver15}) and how the product is built.
          Every point is explained on the card. Smart-contract audits and hack history are not in the score yet.
        </p>
      </div>

      <Disclaimer />
    </section>
  );
}
