import { paidRoute } from "@/lib/x402/paid-route";
import { quickHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.quick in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = paidRoute("quick", quickHandler);
export const POST = GET;
