import { paidRoute } from "@/lib/x402/paid-route";
import { deployerHandler } from "@/lib/x402/handlers";

/** Paid agent API (x402): see PAID_ROUTES.deployer in src/lib/x402/config.ts for the price. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = paidRoute("deployer", deployerHandler);
