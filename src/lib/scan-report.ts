/**
 * One full token safety report, shared by the free scanner API (/api/scan) and the paid agent API
 * (/api/x402/scan) so both always run the same checks.
 */

import { scanToken, isVerified, applyVerified, rogueAiVerdict } from "@/lib/scan";
import { detectChainMarket, scanEvm, GOPLUS_CHAIN } from "@/lib/scan-multichain";
import { bumpStats } from "@/lib/stats";
import { deployerReputation, observeDeployer } from "@/lib/signal-graph";

const isEvm = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

export interface ScanReport {
  status: number;
  body: Record<string, unknown>;
}

/** Scan `mint` (chain auto-detected when not given). `kind` feeds the public counter's
 *  people/automation split. Failures come back as 422 with `{ error, mint }`. */
export async function runScanReport(mint: string, chain: string | undefined, kind: "user" | "auto"): Promise<ScanReport> {
  try {
    // detect chain if not supplied
    if (!chain) {
      if (isEvm(mint)) {
        const m = await detectChainMarket(mint);
        chain = m.chain || "";
      } else {
        chain = "solana";
      }
    }

    let result;
    if (chain === "solana") {
      result = await scanToken(mint);
    } else if (GOPLUS_CHAIN[chain]) {
      const market = await detectChainMarket(mint, chain);
      result = await scanEvm(chain, mint, { ...market, chain });
    } else if (isEvm(mint)) {
      // EVM address but chain unknown/unsupported
      return { status: 422, body: { error: `unsupported or undetected chain for this address` } };
    } else {
      result = await scanToken(mint); // fallback: treat as Solana
    }

    // Verified blue-chip recognition: re-cast managed-but-established tokens (WBTC,
    // stables, etc.) so their by-design traits don't read as rug risk.
    if (result && isVerified(result.chain, result.mint)) result = applyVerified(result);

    // The rogue-AI's narrative read (after verified re-cast so it matches the verdict).
    if (result) result.aiVerdict = rogueAiVerdict(result);

    // Signal Graph: attach the deployer's cross-scan track record (excluding this token so
    // it never counts itself), then record this scan so the record compounds. Verified
    // blue-chips skip it — their deployer history is irrelevant to a known-good token.
    const deployer = result?.meta?.deployer;
    if (result && deployer && !result.verified) {
      const conf = typeof result.confidence === "number" ? result.confidence : 100;
      result.meta.deployerReputation = await deployerReputation(deployer, result.chain, result.mint);
      // Only feed the graph confident, meaningful reads (a timed-out scan isn't a signal).
      if (conf >= 60) {
        observeDeployer({
          deployer,
          chain: result.chain,
          mint: result.mint,
          verdict: result.verdict,
          score: result.score,
          name: result.name,
          symbol: result.symbol,
        });
      }
    }

    result.scannedAt = Date.now();
    // Feed the global counter (only confident reads count a "rug"), fire-and-forget.
    if (typeof result.confidence !== "number" || result.confidence >= 75) {
      bumpStats({ flagged: result.verdict === "HIGH RISK" || result.verdict === "RUG-SHAPED", kind });
    }
    return { status: 200, body: result as unknown as Record<string, unknown> };
  } catch (e) {
    return { status: 422, body: { error: e instanceof Error ? e.message : "scan failed", mint } };
  }
}

/** Below this confidence a scan lost too many sources to be worth charging for. */
export const X402_MIN_CONFIDENCE = 60;

/** A paid scan is charged only for a usable read. x402 settles only responses under 400, so a
 *  degraded read becomes a 503 and costs the caller nothing. */
export function paidScanOutcome(r: ScanReport): ScanReport {
  if (r.status !== 200) return r;
  const confidence = r.body.confidence;
  if (typeof confidence === "number" && confidence < X402_MIN_CONFIDENCE) {
    return { status: 503, body: { error: "sources degraded — retry; you were not charged", confidence } };
  }
  return r;
}
