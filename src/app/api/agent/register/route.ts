import { NextRequest, NextResponse } from "next/server";
import { registerAgent } from "@/lib/agent-trust";
import { isAddress, isChain } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * AGENT REGISTRATION API (v1) — POST /api/agent/register
 * Body: { address, chain?, issued (ms), signature (base58 ed25519), label? }
 * An agent signs `agentRegMessage(address, issued)` with its own keypair to prove ownership
 * (moves no funds). Server-side proxy to the bot registry. Signature is the auth.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`agentreg:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 }); }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const chain = typeof body.chain === "string" ? body.chain.trim() : "solana";
  const issued = typeof body.issued === "number" ? body.issued : 0;
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";
  const label = typeof body.label === "string" ? body.label.slice(0, 60) : "";

  if (!isAddress(address)) return NextResponse.json({ ok: false, error: "invalid address" }, { status: 400 });
  if (!isChain(chain)) return NextResponse.json({ ok: false, error: "invalid chain" }, { status: 400 });
  if (!issued || !signature) return NextResponse.json({ ok: false, error: "issued + signature required" }, { status: 400 });

  const out = await registerAgent({ address, chain, issued, signature, label });
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
