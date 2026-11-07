import { paidRoute } from "@/lib/x402/paid-route";
import { spikesHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.spikes in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const GET = paidRoute("spikes", spikesHandler);
export const POST = GET;

