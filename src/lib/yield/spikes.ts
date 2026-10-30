import { getYieldSnapshot } from "./client";
import { riskOf } from "./risk";
import type { YieldOpportunity } from "./types";

export interface RebalanceSpread {
  borrowChain: string;
  borrowProtocol: string;
  borrowApy: number;
  supplyChain: string;
  supplyProtocol: string;
  supplyApy: number;
  asset: string;
  netSpreadPct: number;
}

export interface YieldSpikesReport {
  ok: true;
  updatedAt: number;
  count: number;
  topOpportunities: Array<{
    id: string;
    chain: string;
    protocol: string;
    symbol: string;
    apy: number;
    tvlUsd: number;
    riskScore: number;
    riskLevel: string;
  }>;
  rebalanceSpreads: RebalanceSpread[];
  riskAlerts: Array<{
    id: string;
    chain: string;
    symbol: string;
    apy: number;
    warning: string;
  }>;
}

export async function getYieldSpikesReport(): Promise<YieldSpikesReport | null> {
  const snap = await getYieldSnapshot();
  if (!snap || !Array.isArray(snap.opportunities)) return null;

  type ValidOpp = YieldOpportunity & { apy: number };
  const valid = (snap.opportunities.filter(
    (o): o is ValidOpp => typeof o.apy === "number" && o.apy > 0
  ));

  // Top 5 opportunities sorted by risk-adjusted APY
  // Note: in riskOf(), higher score = riskier. Safer pools have (100 - score).
  const top = [...valid]
    .sort((a, b) => {
      const safeA = Math.max(0, 100 - riskOf(a).score);
      const safeB = Math.max(0, 100 - riskOf(b).score);
      return b.apy * (safeB / 100) - a.apy * (safeA / 100);
    })
    .slice(0, 5)
    .map((o) => {
      const r = riskOf(o);
      return {
        id: o.id,
        chain: o.chain,
        protocol: o.protocol,
        symbol: o.symbol,
        apy: Number(o.apy.toFixed(2)),
        tvlUsd: Math.round(o.tvlUsd ?? 0),
        riskScore: r.score,
        riskLevel: r.level,
      };
    });

  // Calculate rebalance spreads for stables (USDC / USDT)
  const spreads: RebalanceSpread[] = [];
  const usdcPools = valid.filter((o) => o.stable && /usdc/i.test(o.symbol));

  const cheapBorrows = usdcPools.filter((o) => o.kind === "lending" && o.apy < 5.0);
  const highSupplies = usdcPools.filter((o) => o.apy > 6.0);

  for (const b of cheapBorrows) {
    for (const s of highSupplies) {
      if (b.chain !== s.chain) {
        const netSpread = Number((s.apy - b.apy).toFixed(2));
        if (netSpread >= 1.5) {
          spreads.push({
            borrowChain: b.chain,
            borrowProtocol: b.protocol,
            borrowApy: Number(b.apy.toFixed(2)),
            supplyChain: s.chain,
            supplyProtocol: s.protocol,
            supplyApy: Number(s.apy.toFixed(2)),
            asset: "USDC",
            netSpreadPct: netSpread,
          });
        }
      }
    }
  }

  // Risk alerts: high APY but high risk (score > 40) or IL risk
  const alerts = valid
    .filter((o) => {
      const r = riskOf(o);
      return r.score > 40 || o.ilRisk === "high";
    })
    .slice(0, 5)
    .map((o) => {
      const r = riskOf(o);
      return {
        id: o.id,
        chain: o.chain,
        symbol: o.symbol,
        apy: Number(o.apy.toFixed(2)),
        warning: r.warnings[0] || r.reasons[0]?.text || "Elevated protocol or impermanent loss risk.",
      };
    });

  return {
    ok: true,
    updatedAt: snap.updatedAt,
    count: valid.length,
    topOpportunities: top,
    rebalanceSpreads: spreads.slice(0, 5),
    riskAlerts: alerts,
  };
}
