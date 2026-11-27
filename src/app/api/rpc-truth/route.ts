import { NextResponse, type NextRequest } from "next/server";
import { getTruth } from "@/lib/rpc-truth/client";
import { truthApiResponse } from "@/lib/rpc-truth/api";
import { clientIp, rateLimit, sweepBuckets } from "@/lib/ratelimit";

/**
 * Free RPC Truth JSON (`/api/rpc-truth`). With `?chain=` it returns the endpoints worth using on that chain
 * (never one with a silent failure in the last 7 days), filtered by `?depth=1h|1d|7d|30d` and `?minSpan=<blocks>`;
 * without it, the whole latest measurement. 60 requests/min per IP.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`rpc-truth:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded (60/min). The data only changes every 6 hours: cache it." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  }
  const view = await getTruth();
  const { status, body } = truthApiResponse(view, req.nextUrl.searchParams);
  return NextResponse.json(body, {
    status,
    headers: status === 200 ? { "cache-control": "public, max-age=300, stale-while-revalidate=600", "access-control-allow-origin": "*" } : { "cache-control": "no-store" },
  });
}
