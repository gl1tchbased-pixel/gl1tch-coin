import { paidRoute } from "@/lib/x402/paid-route";
import { radarHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.radar in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A cold instance may wait up to 25 s for its first sweep (see radarHandler). */
export const maxDuration = 60;

export const GET = paidRoute("radar", radarHandler);
