import { NextRequest, NextResponse } from "next/server";
import { optimizeSubset } from "@/lib/quantum/forge";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * QUANTUM CORE — POST /api/quantum-core/forge
 * Quantum-inspired subset optimizer (holder tool). Body: { scores:number[], maxCount:number, seed? }.
 * Picks up to maxCount items maximizing total score, under the user's own constraint.
 * NOT investment advice — a deterministic constraint solver over user-supplied numbers.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS = 64;

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`qforge:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const b = body as { scores?: unknown; maxCount?: unknown; seed?: unknown };
  const scores = Array.isArray(b.scores) ? b.scores : null;
  if (!scores || scores.length === 0 || scores.length > MAX_ITEMS || !scores.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return NextResponse.json({ error: `scores must be 1..${MAX_ITEMS} finite numbers` }, { status: 400 });
  }
  const maxCount = typeof b.maxCount === "number" && Number.isInteger(b.maxCount) ? b.maxCount : 0;
  if (maxCount < 1 || maxCount > scores.length) {
    return NextResponse.json({ error: "maxCount must be 1..scores.length" }, { status: 400 });
  }
  const seed = typeof b.seed === "number" && Number.isFinite(b.seed) ? b.seed : undefined;

  const { chosen, total } = optimizeSubset({ scores: scores as number[], maxCount, seed });
  return NextResponse.json({ chosen, total, method: "quantum-inspired (simulated annealing / QUBO)" });
}
