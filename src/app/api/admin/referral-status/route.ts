import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { checkDualReferralStatus, DEFAULT_REFERRAL_NAME } from "@/lib/jupiter/referral";
import { SOLANA_RPC } from "@/lib/wallet/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conn = new Connection(SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
    const status = await checkDualReferralStatus(conn, DEFAULT_REFERRAL_NAME);
    return NextResponse.json({ ok: true, status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
