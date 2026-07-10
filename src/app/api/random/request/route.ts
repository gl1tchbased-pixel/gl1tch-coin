import { NextRequest, NextResponse } from "next/server";
import { forwardRandomRequest } from "@/lib/random-service";
import { checkApiKey } from "@/lib/apikey";
import { rateLimit, sweepBuckets } from "@/lib/ratelimit";

/**
 * POST /api/random/request — holder-gated verifiable randomness.
 * Requires a $GL1TCH API key (x-gl1tch-key). Commits the request to a FUTURE drand
 * round on the bot; the result is revealed + proved once that round finalizes. The key
 * gates rate/access only — non-custodial, no funds, no prizes. This is another lane of
 * the token's required utility (usage demand → token demand).
 *
 * Body: { spec, salt? } where spec is one of:
 *   { kind: "ints", min, max, count }   — count independent ints in [min,max]
 *   { kind: "shuffle", n }              — a uniform permutation of [0, n)
 *   { kind: "pick", n, k }              — k distinct indices from [0, n)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Randomness is heavier than a scan → a tighter per-tier ceiling than the scan API.
const RANDOM_RATE: Record<number, number> = { 2: 30, 3: 80, 4: 200, 5: 500 };

export async function POST(req: NextRequest) {
  sweepBuckets();
  const key = req.headers.get("x-gl1tch-key") ?? "";
  const keyInfo = key ? await checkApiKey(key) : null;
  if (!keyInfo) {
    return NextResponse.json(
      { ok: false, error: "a $GL1TCH API key is required — mint one at coin-three-mu.vercel.app/token" },
      { status: 401 }
    );
  }
  const limit = RANDOM_RATE[keyInfo.tier] ?? 30;
  const rl = rateLimit(`random:${key}`, limit, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate limited — your tier's randomness ceiling; hold more $GL1TCH for a higher tier" },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  // Forward whichever shape the caller used: { spec, salt } or allocation { labels, winners, salt }.
  const payload = Array.isArray(b.labels)
    ? { labels: b.labels, winners: b.winners, salt: b.salt }
    : { spec: b.spec, salt: b.salt };
  const out = await forwardRandomRequest(key, payload);
  return NextResponse.json(out.body, { status: out.status });
}
