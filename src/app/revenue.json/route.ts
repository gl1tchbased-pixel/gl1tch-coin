import { getRevenue } from "@/lib/revenue";
import { getTreasurySnapshot } from "@/lib/treasury-revenue";

/**
 * The paid agent API's ledger + live on-chain treasury snapshot as JSON on our own domain:
 * settled payments with their on-chain transactions (our own tests counted apart as `self`),
 * how many unpaid 402 quotes each route answered, and live Solana/Base treasury + creator fee balances.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const [summary, treasury] = await Promise.all([getRevenue(), getTreasurySnapshot()]);
  if (!summary) {
    return Response.json(
      { ok: false, error: "ledger unavailable, retry", treasury },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
  return Response.json(
    { ...summary, treasury },
    {
      headers: {
        "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
        "access-control-allow-origin": "*",
      },
    }
  );
}
