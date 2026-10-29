import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import { IlPlayground } from "@/components/yield/IlPlayground";
import { Disclaimer, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "../yield.module.css";

export const metadata: Metadata = shareMeta({
  title: "Impermanent loss, visualised — Yield X-Ray | GL1TCH",
  description:
    "Drag a token's price and watch a 50/50 liquidity position fall behind simply holding. Why a DEX pool's APY isn't your profit.",
  alternates: { canonical: "/yield/il" },
});

export default function IlPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 960 }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">Yield X-Ray</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>Impermanent loss, visualised</h1>
        <p className={`t-body-lg ${styles.lede}`}>
          The highest APYs on Solana and Base are DEX pools, and they really are paid by traders. What the number leaves out: when one
          token&apos;s price moves against the other, your share of the pool ends up worth less than just holding both.
        </p>
        <YieldSubnav />
      </div>

      <div className={styles.panel}>
        <IlPlayground />
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>How it works</h2>
        <p className={styles.p}>
          A pool keeps its two tokens at equal value. When one token rises, traders buy it from the pool until the pool holds less of
          the winner and more of the loser. Moving either way, the pool ends up behind simply holding. For a classic full-range pool the
          loss is <code>2·√r ÷ (1 + r) − 1</code>, where <code>r</code> is how many times the price ratio moved: about −5.7% when one
          token doubles or halves against the other.
        </p>
        <p className={styles.p}>
          Concentrated-liquidity pools (Orca Whirlpools, Raydium CLMM, Uniswap v3) lose <strong>more</strong> than this for the same move,
          and stop earning fees once the price leaves your range. The playground shows the full-range case, so treat it as the least you
          could lose. The loss is called impermanent because it shrinks if prices return; it becomes permanent when you withdraw.
        </p>
      </div>
      <Disclaimer />
    </section>
  );
}
