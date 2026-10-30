import { type NextRequest } from "next/server";
import { yieldHandler } from "@/lib/x402/handlers";

/**
 * Free rate-limited JSON endpoint for Yield X-Ray (`/api/yield`), matching `FREE_ALTERNATIVE.yield`.
 * Supports `?chain=`, `?kind=`, `?stable=`, and `?id=`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return yieldHandler(req);
}

