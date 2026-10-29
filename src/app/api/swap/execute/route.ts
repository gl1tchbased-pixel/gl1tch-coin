import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { executeOrder } from "@/lib/swap/jupiter";

/**
 * SAFE SWAP — land a swap the user's wallet signed.
 *   POST /api/swap/execute  { signedTransaction: <base64>, requestId: <from /api/swap/order> }
 * Relays the signed bytes to Jupiter's /execute. GL1TCH can't change a signed transaction, and the
 * request id ties it to the quote Jupiter built.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXECUTE_RATE_PER_MIN = 10;
const MAX_TX_BASE64 = 8192;

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`swap-exec:${clientIp(req)}`, EXECUTE_RATE_PER_MIN, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many swaps at once. Wait a moment." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  }
  const body = (await req.json().catch(() => null)) as { signedTransaction?: unknown; requestId?: unknown } | null;
  const tx = body?.signedTransaction;
  const requestId = body?.requestId;
  if (
    typeof tx !== "string" || tx.length > MAX_TX_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(tx) ||
    typeof requestId !== "string" || !/^[A-Za-z0-9-]{8,100}$/.test(requestId)
  ) {
    return NextResponse.json({ error: "invalid input: provide the signedTransaction (base64) and the requestId" }, { status: 400 });
  }
  const r = await executeOrder(tx, requestId, process.env).catch(() => ({ status: 502, result: null, error: "Couldn't reach Jupiter" }));
  if (!r.result) return NextResponse.json({ error: r.error ?? "The swap couldn't be sent." }, { status: r.status === 429 ? 429 : 502 });
  console.info(`[swap] ${r.result.status} ${r.result.signature ?? "-"}`);
  return NextResponse.json(r.result, { headers: { "cache-control": "no-store" } });
}
