import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { verifyZKHolderProof, ZKAP_MIN_HOLDING } from "@/lib/zk/zkap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  sweepBuckets();
  if (!rateLimit(`zk-verify:${clientIp(req)}`, 20, 60_000).ok) {
    return NextResponse.json({ valid: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = (await req.json()) as { proof?: unknown };
    const result = await verifyZKHolderProof(body?.proof, { minThreshold: ZKAP_MIN_HOLDING });
    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({
      valid: true,
      protocol: "gl1tch-zkap-v1",
      nullifier: result.nullifier,
      threshold: result.threshold,
      verifiedAt: Date.now(),
    });
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_json" }, { status: 400 });
  }
}

