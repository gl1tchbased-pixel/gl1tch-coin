/**
 * Alias route for Solana Actions Safe Swap (/api/actions/swap -> /api/actions/safe-swap)
 * Ensures full compatibility with both /swap and /safe-swap path standards.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET, POST, OPTIONS } from "../safe-swap/route";
