/**
 * Alias route for Solana Actions Safe Swap (/api/actions/swap -> /api/actions/safe-swap)
 * Ensures full compatibility with both /swap and /safe-swap path standards.
 */
export { GET, POST, OPTIONS, dynamic, runtime } from "../safe-swap/route";
