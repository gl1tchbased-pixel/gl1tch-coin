/**
 * Quantum Vault — quantum-readiness score (pure, spec §6, §18B.1).
 *
 * Honesty (spec §2): this measures PREPAREDNESS / cryptographic hygiene, not a
 * live attack probability. Five signals, each 0–20, summed to 0–100. Inputs are
 * derived from the existing scanner output — no new chain reads.
 */

export interface VaultSignals {
  /** Mint AND freeze authority both renounced (null). */
  authoritiesRenounced: boolean;
  /** Liquidity locked or burned. */
  liquiditySecured: boolean;
  /** Top-holder concentration, 0..1 (lower is better); undefined = unknown. */
  topHolderConcentration?: number;
  /** Deployer track record from the Signal Graph: "clean" | "unknown" | "flagged" | "serial". */
  deployerReputation?: "clean" | "unknown" | "flagged" | "serial";
  /** Contract/source verified (EVM) or metadata immutable (Solana). */
  verifiedContract: boolean;
  /** Public socials / site / self-scan available (transparency). */
  transparency: boolean;
}

export type VaultLevel = "caution" | "neutral" | "ready" | "hardened";

export interface VaultScore {
  score: number; // 0..100
  level: VaultLevel;
  factors: { key: string; points: number; max: number; note: string }[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function vaultScore(s: VaultSignals): VaultScore {
  const factors: VaultScore["factors"] = [];

  // 1. Authority hygiene (0–20)
  factors.push({
    key: "authority",
    points: s.authoritiesRenounced ? 20 : 0,
    max: 20,
    note: s.authoritiesRenounced ? "mint + freeze renounced" : "active mint/freeze authority",
  });

  // 2. Custody: liquidity + holder distribution (0–20)
  let custody = s.liquiditySecured ? 12 : 0;
  if (typeof s.topHolderConcentration === "number") {
    custody += Math.round(clamp(1 - s.topHolderConcentration, 0, 1) * 8);
  }
  factors.push({
    key: "custody",
    points: clamp(custody, 0, 20),
    max: 20,
    note:
      (s.liquiditySecured ? "liquidity secured" : "liquidity not locked/burned") +
      (typeof s.topHolderConcentration === "number"
        ? `, top-holder ${(s.topHolderConcentration * 100).toFixed(0)}%`
        : ", holder spread unknown"),
  });

  // 3. Operational: deployer reputation from the Signal Graph (0–20)
  const repMap: Record<NonNullable<VaultSignals["deployerReputation"]>, number> = {
    clean: 20,
    unknown: 10,
    flagged: 3,
    serial: 0,
  };
  const rep = s.deployerReputation ?? "unknown";
  factors.push({ key: "operational", points: repMap[rep], max: 20, note: `deployer: ${rep}` });

  // 4. Hygiene: verified contract / immutable metadata (0–20)
  factors.push({
    key: "hygiene",
    points: s.verifiedContract ? 20 : 8,
    max: 20,
    note: s.verifiedContract ? "verified/immutable" : "unverified",
  });

  // 5. Transparency (0–20)
  factors.push({
    key: "transparency",
    points: s.transparency ? 20 : 6,
    max: 20,
    note: s.transparency ? "public socials/site" : "limited public footprint",
  });

  const score = clamp(
    factors.reduce((sum, f) => sum + f.points, 0),
    0,
    100
  );
  const level: VaultLevel = score >= 90 ? "hardened" : score >= 70 ? "ready" : score >= 40 ? "neutral" : "caution";
  return { score, level, factors };
}

/** Minimal shape of a GL1TCH scan result (from /api/scan) that Vault reads. */
export interface ScanLike {
  chain?: string;
  checks?: { key: string; status: string }[];
  meta?: {
    topHolderPct?: number | null;
    lpLockedPct?: number | null;
    mutableMetadata?: boolean | null;
    liquidityUsd?: number | null;
    deployerReputation?: { level?: string; flaggedCount?: number } | null;
  };
}

const checkStatus = (checks: { key: string; status: string }[], key: string): string | undefined =>
  checks.find((c) => c.key === key)?.status;

/**
 * Derive Vault readiness signals from an existing GL1TCH token scan — so the Vault
 * score reuses the same on-chain intelligence the scanner already gathered. Honest:
 * these are DERIVED signals, not a fresh measurement.
 */
export function vaultSignalsFromScan(scan: ScanLike): VaultSignals {
  const checks = scan.checks ?? [];
  const meta = scan.meta ?? {};

  // Authority hygiene: renounced when the relevant authority checks pass and none fail.
  const authKeys = ["mint_authority", "freeze_authority", "mintable", "ownership", "renounced"];
  const authChecks = checks.filter((c) => authKeys.includes(c.key));
  const authoritiesRenounced = authChecks.length > 0 && authChecks.every((c) => c.status === "pass");

  const liqStatus = checkStatus(checks, "liquidity");
  const liquiditySecured = liqStatus === "pass" || (typeof meta.lpLockedPct === "number" && meta.lpLockedPct >= 50);

  const topHolderConcentration = typeof meta.topHolderPct === "number" ? Math.max(0, Math.min(1, meta.topHolderPct / 100)) : undefined;

  const repLevel = (meta.deployerReputation?.level ?? "").toLowerCase();
  const flagged = meta.deployerReputation?.flaggedCount ?? 0;
  const deployerReputation: VaultSignals["deployerReputation"] = repLevel.includes("serial")
    ? "serial"
    : flagged > 0 || repLevel.includes("flag")
    ? "flagged"
    : repLevel.includes("clean") || repLevel.includes("trust")
    ? "clean"
    : "unknown";

  const verifiedContract =
    meta.mutableMetadata === false || checks.some((c) => /verif|source/.test(c.key) && c.status === "pass");

  const transparency = typeof meta.liquidityUsd === "number" && meta.liquidityUsd > 0;

  return { authoritiesRenounced, liquiditySecured, topHolderConcentration, deployerReputation, verifiedContract, transparency };
}
