import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

/** Public read of the global scan counter (proxied server-side from the bot). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = (await getStats()) ?? { scanned: 0, flagged: 0 };
  return NextResponse.json(s, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } });
}
