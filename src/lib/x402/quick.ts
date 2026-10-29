/**
 * The compact token check behind the paid /api/x402/quick and /api/x402/batch: a full scan condensed
 * to the verdict, the score, the checks that failed or warned, and the market readings an agent filters
 * on. Scans are kept per instance for a few minutes so a quick re-check of the same token costs no
 * upstream reads; `cached` says when a result came from that store.
 */

import type { ScanCheck } from "@/lib/scan";

/** Most tokens one batch call scans. */
export const BATCH_MAX = 10;

export interface QuickCheck {
  mint: string;
  chain: string;
  symbol: string | null;
  verdict: string;
  score: number;
  confidence: number | null;
  flags: { key: string; status: "fail" | "warn"; value: string }[];
  liquidityUsd: number | null;
  lpLockedPct: number | null;
  topHolderPct: number | null;
  holderCount: number | null;
  ageDays: number | null;
  scannedAt: number | null;
  cached: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Condense a successful scan report body. Failures come before warnings, in scan order. */
export function quickCheck(body: Record<string, unknown>, cached: boolean): QuickCheck {
  const checks = (Array.isArray(body.checks) ? body.checks : []) as ScanCheck[];
  const flags = [...checks.filter((c) => c.status === "fail"), ...checks.filter((c) => c.status === "warn")].map((c) => ({
    key: c.key,
    status: c.status as "fail" | "warn",
    value: c.value,
  }));
  const meta = (body.meta && typeof body.meta === "object" ? body.meta : {}) as Record<string, unknown>;
  return {
    mint: str(body.mint) ?? "",
    chain: str(body.chain) ?? "solana",
    symbol: str(body.symbol),
    verdict: str(body.verdict) ?? "UNKNOWN",
    score: num(body.score) ?? 0,
    confidence: num(body.confidence),
    flags,
    liquidityUsd: num(meta.liquidityUsd),
    lpLockedPct: num(meta.lpLockedPct),
    // The largest holder that is not a liquidity pool, when the sources can tell them apart.
    topHolderPct: num(meta.topRealHolderPct) ?? num(meta.topHolderPct),
    holderCount: num(meta.holderCount),
    ageDays: num(meta.ageDays),
    scannedAt: num(body.scannedAt),
    cached,
  };
}

/** A small per-instance store of recent successful scans, keyed by chain (or "auto") and address. */
export class ScanCache {
  private readonly m = new Map<string, { body: Record<string, unknown>; at: number }>();
  constructor(private readonly ttlMs: number, private readonly max: number) {}

  get(key: string, now = Date.now()): Record<string, unknown> | null {
    const hit = this.m.get(key);
    if (!hit) return null;
    if (now - hit.at > this.ttlMs) {
      this.m.delete(key);
      return null;
    }
    return hit.body;
  }

  set(key: string, body: Record<string, unknown>, now = Date.now()): void {
    this.m.delete(key);
    this.m.set(key, { body, at: now });
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
}
