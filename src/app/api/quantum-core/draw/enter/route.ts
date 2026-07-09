import { NextRequest, NextResponse } from "next/server";
import { forwardEntry } from "@/lib/quantum/client";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * QUANTUM CORE — POST /api/quantum-core/draw/enter
 * Forwards a wallet-signed draw entry to the bot (which verifies the ed25519
 * signature + a sustained Infected+ balance before adding the participant).
 * Server-side forward keeps the bot CORS-clean and adds an IP rate limit.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`qenter:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const address = typeof b.address === "string" ? b.address : "";
  const drawId = typeof b.drawId === "string" ? b.drawId : "";
  const issued = typeof b.issued === "number" ? b.issued : 0;
  const signature = typeof b.signature === "string" ? b.signature : "";
  if (!address || !drawId || !issued || !signature) {
    return NextResponse.json({ ok: false, error: "malformed" }, { status: 400 });
  }

  const out = await forwardEntry({ address, drawId, issued, signature });
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
