import { NextResponse, type NextRequest } from "next/server";
import { yieldHandler } from "@/lib/x402/handlers";
import { clientIp, rateLimit, sweepBuckets } from "@/lib/ratelimit";

/**
 * Free rate-limited JSON endpoint for Yield X-Ray (`/api/yield`), matching `FREE_ALTERNATIVE.yield`.
 * Supports `?chain=`, `?kind=`, `?stable=`, and `?id=`.
 * High-frequency callers (>30 req/min/IP) are directed to `/api/x402/yield` ($0.003 USDC or holder key).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`yield:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded on free /api/yield. Use /api/x402/yield ($0.003 USDC per call or free with x-gl1tch-key for $GL1TCH holders).",
        paidEndpoint: "/api/x402/yield",
      },
      {
        status: 429,
        headers: { "retry-after": String(rl.retryAfter) },
      }
    );
  }
  return yieldHandler(req);
}
