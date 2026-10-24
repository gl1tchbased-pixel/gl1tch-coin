import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * Relays a token's sealed-verdict proofs from the bot (A3). Only transport: /verify-scan recomputes every proof and
 * reads the seal from Solana in the visitor's browser, so nothing here has to be trusted.
 */
export const runtime = "nodejs";

const BOT = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";
const SOLANA_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CHAINS = new Set(["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"]);

export async function GET(req: NextRequest) {
  sweepBuckets();
  if (!rateLimit(`attest-proof:${clientIp(req)}`, 30, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  const chain = req.nextUrl.searchParams.get("chain") ?? "solana";
  const mint = (req.nextUrl.searchParams.get("mint") ?? "").trim();
  if (!CHAINS.has(chain) || !(chain === "solana" ? SOLANA_MINT.test(mint) : EVM_ADDRESS.test(mint))) {
    return NextResponse.json({ ok: false, error: "enter a valid token address" }, { status: 400 });
  }
  try {
    // The shared token exempts this server from the bot's per-IP limit (all visitors arrive from Vercel's IPs);
    // this route's own per-IP limit above is the guard.
    const r = await fetch(`${BOT}/attest/proof?chain=${chain}&mint=${encodeURIComponent(mint)}`, {
      headers: TOKEN ? { "x-stats-token": TOKEN } : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`bot answered ${r.status}`);
    const j = (await r.json()) as { proofs?: unknown };
    return NextResponse.json(
      { ok: true, proofs: Array.isArray(j.proofs) ? j.proofs : [] },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "the proof service isn't reachable right now" }, { status: 502 });
  }
}
