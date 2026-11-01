import { paidRoute } from "@/lib/x402/paid-route";
import { randomHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.random in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Waits up to ~6 s for the committed drand round to be published. */
export const maxDuration = 30;

export const GET = paidRoute("random", randomHandler);
export const POST = GET;
