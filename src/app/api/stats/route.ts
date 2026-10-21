import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

/**
 * Public read of the global scan counter (proxied server-side from the bot).
 * `scanned` = all-time total incl. automation; `user` / `auto` = the split since `splitSince`.
 * When the bot can't be reached this is a 503, never zeros: a 0 would read as "nobody scanned".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getStats();
  if (!s) return NextResponse.json({ error: "counter unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json(s, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } });
}
