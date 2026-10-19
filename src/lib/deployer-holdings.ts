import type { CheckStatus } from "./scan";

/**
 * "Deployer holdings": how much of the supply the wallet that launched a token holds right now.
 * A big bag is dump risk; an empty one means the dev has no stake left (sold out, or never
 * bought). Shared by the Solana (RPC balance) and EVM (GoPlus creator balance) scanners so both
 * chains read the same thresholds.
 */
export interface HoldingRead {
  status: CheckStatus;
  value: string;
  explain: string;
}

/** Below this share the deployer counts as exited: dust left behind after a sell-out. */
export const EXITED_BELOW_PCT = 0.01;

export function formatHoldingPct(pct: number): string {
  if (pct === 0) return "0%";
  if (pct < EXITED_BELOW_PCT) return "<0.01%";
  return pct < 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
}

/** Classify the deployer's current share of supply (0–100). `pct` null = balance unreadable. */
export function deployerHoldingCheck(pct: number | null, deployerKnown: boolean): HoldingRead {
  if (!deployerKnown) {
    return { status: "unknown", value: "—", explain: "Couldn't identify the deployer wallet, so its balance can't be checked." };
  }
  if (pct == null || !Number.isFinite(pct) || pct < 0) {
    return { status: "unknown", value: "—", explain: "Couldn't read the deployer's current balance." };
  }
  const shown = formatHoldingPct(pct);
  if (pct < EXITED_BELOW_PCT) {
    return {
      status: "warn",
      value: `${shown} · exited`,
      explain:
        "The wallet that launched this token holds none of it now (it sold out, or never bought). No dump risk from the dev, but no stake left in the project either. Check the deployer's history before trusting it.",
    };
  }
  if (pct <= 5) {
    return {
      status: "pass",
      value: shown,
      explain: `The deployer still holds ${shown} of the supply: some stake in the project, not enough to crash the price on its own.`,
    };
  }
  if (pct <= 15) {
    return {
      status: "warn",
      value: shown,
      explain: `The deployer holds ${shown} of the supply. A sale that size would hit the price hard, so watch this wallet.`,
    };
  }
  return {
    status: "fail",
    value: shown,
    explain: `The deployer holds ${shown} of the supply and can dump it on buyers at any time.`,
  };
}

/** Share of supply (0–100) from a raw balance; null when either side is unknown or supply is 0. */
export function holdingPct(balance: number | null, supply: number | null): number | null {
  if (balance == null || supply == null || !Number.isFinite(balance) || !Number.isFinite(supply) || supply <= 0) return null;
  return Math.min(100, Math.max(0, (balance / supply) * 100));
}
