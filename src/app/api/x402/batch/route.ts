import { paidRoute } from "@/lib/x402/paid-route";
import { batchHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.batch in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Up to 10 scans, five at a time, each capped at 20 s (see batchHandler). */
export const maxDuration = 60;

export const GET = paidRoute("batch", batchHandler);
