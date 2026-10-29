import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { swapGate } from "@/lib/swap/gate";
import { SOL_MINT, SOL_DECIMALS, getOrder, readSwapFee, tokenDecimals, isSolanaAddress } from "@/lib/swap/jupiter";
import { toAtomic } from "@/lib/swap/amount";
import { cachedScan } from "@/lib/x402/handlers";

/**
 * SAFE SWAP — quote + unsigned transaction for a Solana swap through Jupiter.
 *   GET /api/swap/order?side=buy|sell&mint=<token>&amount=<decimal>&taker=<wallet>[&ack=1]
 * A buy (SOL → token) re-checks the token and runs the safety gate first (src/lib/swap/gate.ts);
 * a sell (token → SOL) is never blocked. The answer carries Jupiter's transaction for the taker's
 * own wallet to sign; GL1TCH never holds a key.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_RATE_PER_MIN = 20;
/** Largest buy the site routes, in SOL: a guard against a mistyped amount. */
const MAX_BUY_SOL = 100;
const NO_STORE = { "cache-control": "no-store" };

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`swap:${clientIp(req)}`, ORDER_RATE_PER_MIN, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many quotes. Wait a moment and try again." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  }
  const sp = req.nextUrl.searchParams;
  const side = sp.get("side");
  const mint = sp.get("mint");
  const taker = sp.get("taker");
  if ((side !== "buy" && side !== "sell") || !isSolanaAddress(mint) || !isSolanaAddress(taker) || mint === SOL_MINT) {
    return NextResponse.json({ error: "invalid input: provide side=buy|sell, a Solana ?mint and the ?taker wallet" }, { status: 400 });
  }

  let decimals: number;
  try {
    decimals = await tokenDecimals(mint);
  } catch {
    return NextResponse.json({ error: "Couldn't read this token's mint just now. Try again." }, { status: 502 });
  }
  const inDecimals = side === "buy" ? SOL_DECIMALS : decimals;
  const amount = toAtomic(sp.get("amount") ?? "", inDecimals);
  if (!amount) return NextResponse.json({ error: "Enter a positive amount." }, { status: 400 });
  if (side === "buy" && BigInt(amount) > BigInt(MAX_BUY_SOL) * BigInt(10) ** BigInt(SOL_DECIMALS)) {
    return NextResponse.json({ error: `Safe Swap routes buys up to ${MAX_BUY_SOL} SOL.` }, { status: 400 });
  }

  let verdict: string | null = null;
  let score: number | null = null;
  let warning: string | null = null;
  if (side === "buy") {
    const scan = await cachedScan(mint, "solana");
    if ("status" in scan) {
      return NextResponse.json({ error: "Couldn't re-check this token just now, so no buy is routed. Try again shortly." }, { status: 503 });
    }
    verdict = typeof scan.body.verdict === "string" ? scan.body.verdict : "UNKNOWN";
    score = typeof scan.body.score === "number" ? scan.body.score : null;
    const confidence = typeof scan.body.confidence === "number" ? scan.body.confidence : null;
    const gate = swapGate("buy", verdict, confidence, sp.get("ack") === "1");
    if (!gate.ok) {
      return NextResponse.json({ blocked: true, needsAck: gate.needsAck, reason: gate.reason, verdict, score }, { status: 403, headers: NO_STORE });
    }
    warning = gate.warning;
  }

  const fee = readSwapFee(process.env);
  const order = await getOrder(
    { inputMint: side === "buy" ? SOL_MINT : mint, outputMint: side === "buy" ? mint : SOL_MINT, amount, taker },
    fee,
    process.env,
  ).catch(() => ({ status: 502, quote: null, error: "Couldn't reach Jupiter" }));
  if (!order.quote) {
    const busy = order.status === 429;
    return NextResponse.json(
      { error: busy ? "Jupiter is busy. Try again in a few seconds." : order.error ?? "No route for this swap right now." },
      { status: busy ? 429 : 502 },
    );
  }
  return NextResponse.json(
    {
      side,
      mint,
      verdict,
      score,
      warning,
      decimals: { in: inDecimals, out: side === "buy" ? decimals : SOL_DECIMALS },
      quote: order.quote,
      gl1tchFeeBps: fee?.bps ?? 0,
    },
    { headers: NO_STORE },
  );
}
