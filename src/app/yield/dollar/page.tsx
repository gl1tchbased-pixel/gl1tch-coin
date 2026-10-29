import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getYieldSnapshot } from "@/lib/yield/client";
import { CHAIN_LABEL } from "@/lib/yield/copy";
import { pct, usd } from "@/lib/yield/format";
import { displayName, protocolName } from "@/lib/yield/view";
import type { YieldChain, YieldOpportunity } from "@/lib/yield/types";
import { Disclaimer, Unavailable, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "../yield.module.css";

export const revalidate = 300;

export const metadata: Metadata = shareMeta({
  title: "Where does a dollar earn? Stablecoin yields across chains — Yield X-Ray | GL1TCH",
  description:
    "The same dollar earns very different yields on Ethereum, Base, Arbitrum, BNB Chain and Robinhood Chain. Stablecoin lending and savings rates read from the chain, with who pays each one.",
  alternates: { canonical: "/yield/dollar" },
});

export default async function DollarPage() {
  const snap = await getYieldSnapshot();
  const stables = (snap?.opportunities ?? []).filter((o) => o.stable);
  const max = Math.max(0.0001, ...stables.map((o) => o.apy ?? 0));
  const byChain = new Map<YieldChain, YieldOpportunity[]>();
  for (const o of stables) byChain.set(o.chain, [...(byChain.get(o.chain) ?? []), o]);
  const groups = [...byChain.entries()]
    .map(([chain, rows]) => ({ chain, rows: rows.sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)), tvl: rows.reduce((a, r) => a + (r.tvlUsd ?? 0), 0) }))
    .sort((a, b) => b.tvl - a.tvl);
  const measured = stables.filter((o) => o.apy != null).map((o) => o.apy as number);

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 960 }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">Yield X-Ray</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>Where does a dollar earn?</h1>
        <p className={`t-body-lg ${styles.lede}`}>
          The same dollar earns very different yields depending on the chain and the protocol. Open a row to see who pays it and how you
          get out.
        </p>
        <YieldSubnav />
      </div>

      {!snap ? (
        <Unavailable />
      ) : (
        <>
          {measured.length > 1 && (
            <p className={styles.fresh}>
              Measured stablecoin yields right now range from {pct(Math.min(...measured))} to {pct(Math.max(...measured))}.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.chain} className={styles.group}>
              <div className={styles.groupTitle}>{CHAIN_LABEL[g.chain]} <span className={styles.dim}>· {usd(g.tvl)} deposited</span></div>
              <div className={styles.bars}>
                {g.rows.map((o) => (
                  <div key={o.id} className={styles.barRow}>
                    <Link href={`/yield/${o.id}`}>
                      {displayName(o)} <span className={styles.dim}>· {protocolName(o)}</span>
                    </Link>
                    <div className={styles.barTrack} aria-hidden>
                      <div className={styles.barFill} style={{ width: `${Math.max(0, ((o.apy ?? 0) / max) * 100)}%` }} />
                    </div>
                    <span className={styles.num}>{o.apy == null ? <span className={styles.dim}>measuring</span> : pct(o.apy)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.section}>
            <h2 className={styles.h2}>Why the numbers differ</h2>
            <p className={styles.p}>
              Lending rates follow demand: when many people borrow a stablecoin on one chain, suppliers there earn more. Savings rates
              like Sky&apos;s are set by governance. Vault yields depend on which markets a curator lends to and what fee they take.
            </p>
            <p className={styles.p}>
              A higher number elsewhere isn&apos;t free: moving a stablecoin to another chain takes a bridge or an exchange, each with its
              own cost and risk, and every protocol adds its own smart-contract risk. Stablecoins are counted at the USDC/USD Chainlink
              price, so a stablecoin trading below a dollar would not show here.
            </p>
          </div>
        </>
      )}
      <Disclaimer />
    </section>
  );
}
