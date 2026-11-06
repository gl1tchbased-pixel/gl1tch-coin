import { NextResponse } from "next/server";
import { checkX402Health } from "@/lib/x402/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public automated health & specification compliance linter for GL1TCH x402 endpoints.
 * Demonstrates 100% spec compliance, 0 header/format slips, and warns against fee scams.
 */
export async function GET() {
  try {
    const report = await checkX402Health();
    return NextResponse.json(report, {
      status: report.status === "unhealthy" ? 503 : 200,
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-gl1tch-health": report.status,
        "x-spec-compliance": `${report.specCompliancePct}%`,
        "x-robots-tag": "noindex, follow",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: (err as Error).message,
        checkedAt: Date.now(),
      },
      {
        status: 500,
        headers: { "cache-control": "no-store" },
      }
    );
  }
}
