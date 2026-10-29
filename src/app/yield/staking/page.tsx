import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getYieldSnapshot } from "@/lib/yield/client";
import { pct, usd } from "@/lib/yield/format";
import { displayName, protocolName } from "@/lib/yield/view";
import type { YieldOpportunity } from "@/lib/yield/types";
import { Disclaimer, Unavailable, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "../yield.module.css";

export const revalidate = 300;

export const metadata: Metadata = shareMeta({
  title: "SOL vs ETH staking, measured on-chain — Yield X-Ray | GL1TCH",
  description:
    "Liquid staking yields for Solana (JitoSOL, JupSOL, BNSOL, dSOL, hSOL, bSOL) and Ethereum (wstETH, rETH, cbETH, weETH), read from the chain, with pool fees and how much of the reward is just new supply.",
  alternates: { canonical: "/yield/staking" },
});

function StakingTable({ rows }: { rows: YieldOpportunity[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">APY</th>
            <th scope="col">Staked</th>
            <th scope="col">Pool fee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/yield/${o.id}`}>{displayName(o)}</Link>
                {o.stale && <span className={styles.stale}>stale</span>}
                <div className={styles.dim}>{protocolName(o)}</div>
              </td>
              <td className={styles.num}>
                {o.apy == null ? <span className={styles.dim}>measuring…</span> : pct(o.apy)}
                {o.apy != null && o.window && <div className={styles.dim}>{o.window}</div>}
              </td>
              <td className={styles.num}>{usd(o.tvlUsd)}</td>
              <td className={styles.num}>{o.feePct == null ? <span className={styles.dim}>—</span> : pct(o.feePct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StakingPage() {
  const snap = await getYieldSnapshot();
  const lst = (chain: string) =>
    (snap?.opportunities ?? []).filter((o) => o.kind === "liquid-staking" && o.chain === chain).sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
  const sol = lst("solana");
  const eth = lst("ethereum");
  const n = snap?.network;
  const solBase = n?.solanaInflation != null && n.solanaStakedShare ? n.solanaInflation / n.solanaStakedShare : null;

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 960 }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">Yield X-Ray</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>SOL vs ETH staking</h1>
        <p className={`t-body-lg ${styles.lede}`}>
          Liquid staking tokens, measured from the chain. Where the reward comes from, what the pool keeps, and how much of it is
          simply new supply.
        </p>
        <YieldSubnav />
      </div>

      {!snap ? (
        <Unavailable />
      ) : (
        <>
          <div className={styles.section}>
            <h2 className={styles.h2}>Solana</h2>
            {solBase != null && n?.solanaInflation != null && n.solanaStakedShare != null && (
              <p className={styles.p}>
                Solana issues new SOL at <strong>{pct(n.solanaInflation)}</strong> a year and <strong>{pct(n.solanaStakedShare, 1)}</strong> of the
                supply is staked, so stakers share roughly <strong>{pct(solBase)}</strong> before validator commission (MEV tips come on top).
                Most of that is new SOL: anyone who doesn&apos;t stake gets diluted by about {pct(n.solanaInflation)} a year, so the part that
                actually grows your share of the network is closer to the APY minus inflation.
              </p>
            )}
            <StakingTable rows={sol} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.h2}>Ethereum</h2>
            <p className={styles.p}>
              Ethereum issues far less new ETH relative to what is staked, so its staking reward is lower, and part of it comes from fees
              and MEV, which move with network activity. These tokens show &ldquo;measuring&rdquo; until GL1TCH has a day of its own
              exchange-rate history; after a week they switch to a 7-day window.
            </p>
            <StakingTable rows={eth} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.h2}>Before you compare</h2>
            <p className={styles.p}>
              A higher staking APY doesn&apos;t mean a better outcome in dollars: rewards are paid in SOL or ETH, so they move with its price.
              Liquid staking tokens can also trade below the stake behind them when many people exit at once. Open any row for the exit path,
              the risk points and the on-chain request behind the number.
            </p>
          </div>
        </>
      )}
      <Disclaimer />
    </section>
  );
}
