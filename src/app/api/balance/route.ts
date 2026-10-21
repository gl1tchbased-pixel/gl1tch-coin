import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { solanaRpc } from "@/lib/scan";
import { isSolAddress } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * GET /api/balance?owner=<wallet> — the wallet's $GL1TCH balance, for the rank checker.
 * Read server-side so the keyed RPC (SCAN_RPC) never reaches the browser; key-less public RPCs
 * refuse getTokenAccountsByOwner from browsers. Only the $GL1TCH mint, so this can't be used as a
 * general proxy onto our RPC credits.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Accounts = { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } } } }> };

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`balance:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const owner = (req.nextUrl.searchParams.get("owner") ?? "").trim();
  if (!isSolAddress(owner)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  if (!CONTRACT_ADDRESS) return NextResponse.json({ error: "token not live" }, { status: 404 });

  try {
    const accts = await solanaRpc<Accounts>(
      "getTokenAccountsByOwner",
      [owner, { mint: CONTRACT_ADDRESS }, { encoding: "jsonParsed" }],
      AbortSignal.timeout(6000),
    );
    const balance = (accts.value ?? []).reduce((s, a) => s + Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
    return NextResponse.json({ balance }, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=40" } });
  } catch {
    return NextResponse.json({ error: "chain unavailable" }, { status: 503 });
  }
}
