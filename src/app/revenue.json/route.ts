import { getRevenue } from "@/lib/revenue";

/**
 * The paid agent API's ledger as JSON on our own domain: every settled payment with its on-chain
 * transaction (our own tests counted apart as `self`), and how many unpaid 402 quotes each route
 * answered. Mirrors the bot's public summary, which the /revenue page renders.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getRevenue();
  if (!summary) return Response.json({ ok: false, error: "ledger unavailable, retry" }, { status: 503, headers: { "cache-control": "no-store" } });
  return Response.json(summary, {
    headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120", "access-control-allow-origin": "*" },
  });
}
