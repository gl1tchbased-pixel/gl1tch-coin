import { NextRequest, NextResponse } from "next/server";
import { forwardIssueKey } from "@/lib/apikey";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * POST /api/keys/issue — forwards a wallet-signed request to the bot, which verifies the
 * signature + a sustained Infected+ $GL1TCH balance and mints a rate-tiered API key.
 * Server-side forward keeps the bot CORS-clean and rate-limits issuance.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`keyissue:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const address = typeof b.address === "string" ? b.address : "";
  const issued = typeof b.issued === "number" ? b.issued : 0;
  const signature = typeof b.signature === "string" ? b.signature : "";
  if (!address || !issued || !signature) {
    return NextResponse.json({ ok: false, error: "malformed" }, { status: 400 });
  }

  const out = await forwardIssueKey({ address, issued, signature });
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
