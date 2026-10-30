import { NextResponse } from "next/server";
import { getYieldSpikesReport } from "@/lib/yield/spikes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getYieldSpikesReport();
  if (!report) {
    return NextResponse.json(
      { ok: false, error: "Yield snapshot unavailable, retry in a moment." },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(report, {
    headers: {
      "cache-control": "public, s-maxage=120, stale-while-revalidate=300",
      "access-control-allow-origin": "*",
    },
  });
}

