import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getYieldSpikesReport } from "@/lib/yield/spikes";
import { ago, usd } from "@/lib/yield/format";
import { CHAIN_LABEL } from "@/lib/yield/copy";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { Disclaimer, Unavailable, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "../yield.module.css";

export const revalidate = 300;

export const metadata: Metadata = shareMeta({
  title: "DeFi Yield Spikes & Arbitrage Spreads | GL1TCH Yield X-Ray",
  description:
    "Live cross-chain stablecoin (USDC) borrow-vs-supply spreads, top risk-adjusted DeFi yield opportunities, and impermanent-loss risk alerts across 7 chains. Available via x402 API ($0.005/call) or free for $GL1TCH holders.",
  alternates: { canonical: "/yield/spikes" },
});

export default async function YieldSpikesPage() {
  const report = await getYieldSpikesReport();

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 960 }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">Yield X-Ray · Arbitrage &amp; Risk Feed</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Cross-Chain <span style={{ color: "var(--color-signal)" }}>Spreads</span> &amp; Yield Spikes
        </h1>
        <p className={`t-body-lg ${styles.lede}`}>
          Computed from live on-chain protocol reads across 7 chains: stablecoin borrow-vs-supply rate spreads,
          top risk-adjusted APY pools, and pools flagged for elevated impermanent loss or low withdrawable liquidity.
        </p>
        <YieldSubnav />
      </div>

      {!report ? (
        <Unavailable />
      ) : (
        <>
          <p className={styles.fresh}>
            Updated {ago(report.updatedAt)} · {report.count} positive-APY pools evaluated across 7 chains
          </p>

          <div className={styles.section}>
            <h2 className={styles.h2}>1. Cross-Chain USDC Rebalance Spreads (≥ 1.5% Net Spread)</h2>
            <p className={styles.p}>
              Compares lower-rate USDC lending pools (&lt; 5% APY) against higher-rate USDC supply pools (&gt; 6% APY) across different chains.
              Does not include bridge fees or gas; verify exit liquidity on each pool card before moving funds.
            </p>
            {report.rebalanceSpreads.length === 0 ? (
              <div className={styles.panel}>
                <p className={styles.p} style={{ margin: 0 }}>
                  No cross-chain USDC spreads ≥ 1.5% detected in the current hourly snapshot.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Low-Rate Chain / Protocol</th>
                      <th>Low Rate</th>
                      <th>High-Rate Chain / Protocol</th>
                      <th>Supply Rate</th>
                      <th>Net Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rebalanceSpreads.map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{s.asset}</strong></td>
                        <td>{CHAIN_LABEL[s.borrowChain as keyof typeof CHAIN_LABEL] ?? s.borrowChain} · {s.borrowProtocol}</td>
                        <td className={styles.num}>{s.borrowApy.toFixed(2)}%</td>
                        <td>{CHAIN_LABEL[s.supplyChain as keyof typeof CHAIN_LABEL] ?? s.supplyChain} · {s.supplyProtocol}</td>
                        <td className={styles.num} style={{ color: "var(--color-signal)", fontWeight: 700 }}>{s.supplyApy.toFixed(2)}%</td>
                        <td className={styles.num}>
                          <span className={`${styles.pill} ${styles.low}`}>+{s.netSpreadPct.toFixed(2)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.h2}>2. Top 5 Risk-Adjusted Opportunities</h2>
            <p className={styles.p}>
              Ranked by <code>APY × (100 − riskScore) / 100</code> so high-APY pools with poor exit liquidity or extreme IL do not crowd out safer yields.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>Chain</th>
                    <th>APY</th>
                    <th>TVL</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topOpportunities.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/yield/${o.id}`}>{o.protocol} · {o.symbol}</Link>
                      </td>
                      <td>{CHAIN_LABEL[o.chain as keyof typeof CHAIN_LABEL] ?? o.chain}</td>
                      <td className={styles.num} style={{ color: "var(--color-signal)", fontWeight: 700 }}>{o.apy.toFixed(2)}%</td>
                      <td className={styles.num}>{usd(o.tvlUsd)}</td>
                      <td>
                        <span className={`${styles.pill} ${styles[o.riskLevel as keyof typeof styles] ?? styles.low}`}>
                          {o.riskScore}/100 ({o.riskLevel})
                        </span>
                      </td>
                      <td>
                        <Link href={`/yield/${o.id}`}>Inspect card →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {report.riskAlerts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.h2}>3. Elevated Risk &amp; Impermanent Loss Alerts</h2>
              <div className={styles.warnings}>
                {report.riskAlerts.map((a) => (
                  <div key={a.id} className={styles.warning} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span>
                      <strong>[{CHAIN_LABEL[a.chain as keyof typeof CHAIN_LABEL] ?? a.chain}] {a.symbol} ({a.apy.toFixed(2)}% APY):</strong> {a.warning}
                    </span>
                    <Link href={`/yield/${a.id}`} style={{ color: "inherit", textDecoration: "underline", fontSize: "0.85rem" }}>
                      View X-Ray →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={styles.section}>
        <div className={styles.panel}>
          <span className={styles.stepNum}>AGENT &amp; BOT FEED (x402 + $GL1TCH HOLDER KEY)</span>
          <h2 className={styles.h2} style={{ marginTop: 6 }}>Automate this feed in your trading or treasury agent</h2>
          <p className={styles.p}>
            AI agents and rebalancing bots can query <code>/api/x402/spikes</code> for <strong>$0.005 USDC</strong> per call on Solana or Base
            (no signup), or call it <strong>free</strong> with a <code>$GL1TCH</code> holder API key (≥ 100,000 <code>$GL1TCH</code>).
          </p>
          <div className={styles.actions} style={{ marginBottom: 0 }}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/token">
              🔑 Mint Free Holder API Key →
            </Link>
            <a
              className={styles.btn}
              href={`https://jup.ag/swap/SOL-${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              ⚡ Get $GL1TCH on Jupiter (0% GL1TCH fee) ↗
            </a>
            <Link className={styles.btn} href="/agents/docs#x402">
              x402 API Docs →
            </Link>
            <a className={styles.btn} href="/api/yield/spikes" target="_blank" rel="noopener noreferrer">
              Raw JSON ↗
            </a>
          </div>
        </div>
      </div>

      <Disclaimer />
    </section>
  );
}

