import { paidRoute } from "@/lib/x402/paid-route";
import { scanHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.scan in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = paidRoute("scan", scanHandler);
export const POST = GET;
