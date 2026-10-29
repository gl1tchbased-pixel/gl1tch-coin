import type { YieldOpportunity } from "./types";
import { pct } from "./format";

/**
 * Explainable Yield X-Ray risk score: 0–100, HIGHER = RISKIER. Every point comes with the sentence that
 * earned it, and hard warnings stand apart from the score. A signal for reading the card, not advice.
 */

export const RISK_WEIGHTS = {
  depth: { unknown: 15, under1m: 25, under10m: 15, under100m: 5 },
  exit: { idleUnder5: 20, idleUnder15: 8, liquidStaking: 5, vault: 10 },
  maturity: { measuring: 10, oneDay: 8, oneEpoch: 3 },
  outlier: { stableOver15: 25, otherOver20: 20 },
  structure: { vault: 10, liquidStaking: 5, lending: 5, dex: 10 },
  impermanentLoss: { high: 20, low: 5 },
  youngChain: 5,
  stale: 10,
} as const;

export type RiskLevel = "low" | "moderate" | "elevated" | "high";
export interface Risk {
  score: number;
  level: RiskLevel;
  reasons: { points: number; text: string }[];
  warnings: string[];
}

const W = RISK_WEIGHTS;

export function riskOf(o: YieldOpportunity): Risk {
  const reasons: Risk["reasons"] = [];
  const add = (points: number, text: string) => {
    if (points > 0) reasons.push({ points, text });
  };

  // How much money sits here (thin markets move fast and are easier to distort).
  if (o.tvlUsd == null) add(W.depth.unknown, "Size unknown: the deposits couldn't be priced.");
  else if (o.tvlUsd < 1e6) add(W.depth.under1m, "Under $1M deposited: a thin market.");
  else if (o.tvlUsd < 1e7) add(W.depth.under10m, "Under $10M deposited.");
  else if (o.tvlUsd < 1e8) add(W.depth.under100m, "Under $100M deposited.");

  // How you get out.
  if (o.kind === "lending" && o.idleShare != null) {
    if (o.idleShare < 0.05) add(W.exit.idleUnder5, `Only ${pct(o.idleShare, 1)} of deposits can be withdrawn right now; the rest is lent out.`);
    else if (o.idleShare < 0.15) add(W.exit.idleUnder15, `${pct(o.idleShare, 1)} of deposits can be withdrawn right now; the rest is lent out.`);
  }
  if (o.kind === "liquid-staking") add(W.exit.liquidStaking, "An instant exit means swapping at market price; unstaking directly takes time.");
  if (o.kind === "vault") add(W.exit.vault, "Withdrawals depend on free liquidity in the markets the vault lends to.");

  // How much of the yield GL1TCH has actually measured.
  if (o.apy == null) add(W.maturity.measuring, "Still measuring: GL1TCH needs at least a day of its own snapshots.");
  else if (o.window === "24h") add(W.maturity.oneDay, "Only one day measured so far.");
  else if (o.window === "epoch") add(W.maturity.oneEpoch, "Measured over one Solana epoch.");

  // Yields far above what the activity usually pays need a payer you can name.
  if (o.apy != null && o.stable && o.apy > 0.15) add(W.outlier.stableOver15, "Far above what lending stablecoins usually pays: find out who pays it.");
  else if (o.apy != null && !o.stable && o.apy > 0.2 && o.kind !== "dex-lp") add(W.outlier.otherOver20, "Far above typical staking or lending yields: find out who pays it.");

  // What can go wrong by construction.
  if (o.kind === "vault") add(W.structure.vault, "A curator decides where the money goes; their choices are part of the risk.");
  if (o.kind === "liquid-staking") add(W.structure.liquidStaking, "Smart-contract risk, and the token can trade below its backing.");
  if (o.kind === "lending") add(W.structure.lending, "Smart-contract and bad-debt risk if borrowers' collateral crashes.");
  if (o.kind === "dex-lp") add(W.structure.dex, "Fee income depends on your range: a concentrated position earns more while the price stays in it and nothing outside it.");
  if (o.ilRisk === "high") add(W.impermanentLoss.high, "The two tokens' prices move independently: impermanent loss can exceed the fees.");
  if (o.ilRisk === "low") add(W.impermanentLoss.low, "The two tokens track each other, so impermanent loss stays small unless one breaks its link.");

  if (o.chain === "robinhood") add(W.youngChain, "Young chain with a short track record.");
  if (o.stale) add(W.stale, "This row is from an earlier reading: the latest read failed.");

  const warnings: string[] = [];
  if (o.apy != null && o.apy > 1) warnings.push("Over 100% APY");
  if (o.apy != null && o.apy < 0) warnings.push("Value went down over the measured window");
  if (o.tvlUsd != null && o.tvlUsd < 100_000) warnings.push("Under $100K deposited");
  if (o.kind === "lending" && o.idleShare != null && o.idleShare < 0.02) warnings.push("Almost nothing can be withdrawn right now");

  const score = Math.min(100, reasons.reduce((a, r) => a + r.points, 0));
  const level: RiskLevel = score <= 20 ? "low" : score <= 40 ? "moderate" : score <= 60 ? "elevated" : "high";
  return { score, level, reasons, warnings };
}
