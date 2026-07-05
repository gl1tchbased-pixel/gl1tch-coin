import { NextRequest, NextResponse } from "next/server";
import { scanToken, isVerified, applyVerified, rogueAiVerdict } from "@/lib/scan";
import { searchTokens, detectChainMarket, scanEvm, GOPLUS_CHAIN } from "@/lib/scan-multichain";
import { bumpStats } from "@/lib/stats";
import { parseScanInput } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * GL1TCH SCANNER API — multi-chain, read-only.
 *   GET /api/scan?q=<name>            → candidate tokens across chains
 *   GET /api/scan?mint=<addr>&chain=  → full safety report (Solana native / EVM via GoPlus)
 * Server-side so the browser stays CORS-clean and RPC/keys stay hidden.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isEvm = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

export async function GET(req: NextRequest) {
  // Rate limit (Phase -1): best-effort per-IP cap on this public endpoint.
  sweepBuckets();
  const rl = rateLimit(`scan:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate limited — slow down" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  }

  // Central input validation (Phase -1): reject malformed input before any RPC/fetch (SSRF guard).
  const sp = req.nextUrl.searchParams;
  const parsed = parseScanInput({ mint: sp.get("mint"), chain: sp.get("chain"), q: sp.get("q") });
  if (!parsed) return NextResponse.json({ error: "invalid input: provide a valid ?mint (Solana/EVM address) or ?q" }, { status: 400 });

  // ---- name/symbol search ----
  if (parsed.kind === "search") {
    try {
      const candidates = await searchTokens(parsed.q);
      return NextResponse.json({ candidates }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "search failed" }, { status: 422 });
    }
  }

  const mint = parsed.mint;
  let chain = parsed.chain;

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
      return NextResponse.json({ error: `unsupported or undetected chain for this address` }, { status: 422 });
    } else {
      result = await scanToken(mint); // fallback: treat as Solana
    }

    // Verified blue-chip recognition: re-cast managed-but-established tokens (WBTC,
    // stables, etc.) so their by-design traits don't read as rug risk.
    if (result && isVerified(result.chain, result.mint)) result = applyVerified(result);

    // The rogue-AI's narrative read (after verified re-cast so it matches the verdict).
    if (result) result.aiVerdict = rogueAiVerdict(result);

    result.scannedAt = Date.now();
    // Feed the global counter (only confident reads count a "rug"), fire-and-forget.
    if (typeof result.confidence !== "number" || result.confidence >= 75) {
      bumpStats({ flagged: result.verdict === "HIGH RISK" || result.verdict === "RUG-SHAPED" });
    }
    // A transient source timeout drops checks to "unknown" and degrades the verdict.
    // Don't let such a low-confidence read stick in the CDN cache for a full minute —
    // cache it briefly so the next request re-scans and heals.
    const cache =
      typeof result.confidence === "number" && result.confidence < 75
        ? "public, s-maxage=10, stale-while-revalidate=30"
        : "public, s-maxage=60, stale-while-revalidate=120";
    return NextResponse.json(result, { headers: { "cache-control": cache } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "scan failed", mint }, { status: 422 });
  }
}
