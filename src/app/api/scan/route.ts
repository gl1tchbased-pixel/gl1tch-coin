import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/scan-multichain";
import { runScanReport } from "@/lib/scan-report";
import { parseScanInput } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { CONTRACT_ADDRESS } from "@/lib/official";

/**
 * GL1TCH SCANNER API — multi-chain, read-only, free for everyone (no key, no token).
 *   GET /api/scan?q=<name>            → candidate tokens across chains
 *   GET /api/scan?mint=<addr>&chain=  → full safety report (Solana native / EVM via GoPlus)
 * Server-side so the browser stays CORS-clean and RPC/keys stay hidden.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Requests per minute per IP. The same limit for every caller; it only guards against abuse. */
const SCAN_RATE_PER_MIN = 40;

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`scan:${clientIp(req)}`, SCAN_RATE_PER_MIN, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `rate limited — ${SCAN_RATE_PER_MIN} scans/min per IP. Integrating GL1TCH and need more? Ask at founder@gl1tchbased.xyz (free).` },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } }
    );
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
  // The public counter reports people's scans apart from automation. Our own automated callers
  // (Watchtower re-scans, link previews, embedded badges) tag themselves, and scans of $GL1TCH's
  // own contract are our pages' live self-checks (/proof, the trust badge, /token), not people.
  const kind = req.headers.has("x-gl1tch-source") || mint === CONTRACT_ADDRESS ? "auto" : "user";

  const report = await runScanReport(mint, parsed.chain, kind);
  if (report.status !== 200) return NextResponse.json(report.body, { status: report.status });
  // A transient source timeout drops checks to "unknown" and degrades the verdict.
  // Don't let such a low-confidence read stick in the CDN cache for a full minute —
  // cache it briefly so the next request re-scans and heals.
  const confidence = report.body.confidence;
  const cache =
    typeof confidence === "number" && confidence < 75
      ? "public, s-maxage=10, stale-while-revalidate=30"
      : "public, s-maxage=60, stale-while-revalidate=120";
  return NextResponse.json(report.body, { headers: { "cache-control": cache } });
}
