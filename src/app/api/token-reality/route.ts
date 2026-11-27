import { NextResponse, type NextRequest } from "next/server";
import { getReality } from "@/lib/token-reality/client";
import { realityApiResponse } from "@/lib/token-reality/view";
import { clientIp, rateLimit, sweepBuckets } from "@/lib/ratelimit";

/** Free New Token Reality JSON (`/api/token-reality[?chain=]`). Numbers only appear once enough launches are measured. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`token-reality:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded (60/min). The data changes hourly: cache it." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const { status, body } = realityApiResponse(await getReality(), req.nextUrl.searchParams);
  return NextResponse.json(body, {
    status,
    headers: status === 200 ? { "cache-control": "public, max-age=600, stale-while-revalidate=1200", "access-control-allow-origin": "*" } : { "cache-control": "no-store" },
  });
}
