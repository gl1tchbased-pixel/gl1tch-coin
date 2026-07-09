import { NextRequest, NextResponse } from "next/server";
import { vaultScore, type VaultSignals } from "@/lib/quantum/vault";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * QUANTUM CORE — POST /api/quantum-core/vault
 * Quantum-readiness score (0–100) from cryptographic-hygiene signals. Measures
 * PREPAREDNESS, not live attack probability (spec §2). Body = VaultSignals.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`qvault:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const b = body as Partial<VaultSignals>;
  const conc = typeof b.topHolderConcentration === "number" ? Math.max(0, Math.min(1, b.topHolderConcentration)) : undefined;
  const rep = ["clean", "unknown", "flagged", "serial"].includes(b.deployerReputation as string)
    ? b.deployerReputation
    : undefined;

  const signals: VaultSignals = {
    authoritiesRenounced: !!b.authoritiesRenounced,
    liquiditySecured: !!b.liquiditySecured,
    topHolderConcentration: conc,
    deployerReputation: rep,
    verifiedContract: !!b.verifiedContract,
    transparency: !!b.transparency,
  };
  return NextResponse.json(vaultScore(signals));
}
