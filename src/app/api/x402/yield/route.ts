import { paidRoute } from "@/lib/x402/paid-route";
import { yieldHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.yield in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const GET = paidRoute("yield", yieldHandler);

