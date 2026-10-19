import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

/**
 * Public read of the global scan counter (proxied server-side from the bot).
 * `scanned` = all-time total incl. automation; `user` / `auto` = the split since `splitSince`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = (await getStats()) ?? { scanned: 0, flagged: 0, user: 0, auto: 0, splitSince: null };
  return NextResponse.json(s, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } });
}
