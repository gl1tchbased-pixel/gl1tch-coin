import { actionCorsResponse, actionJsonResponse } from "@/lib/actions/cors";

/**
 * Solana Actions configuration mapping (Blinks root registry).
 * Enables Dialect, Phantom, Backpack, Solflare, and X (Twitter) Blinks.
 */
export const dynamic = "force-static";

export function OPTIONS() {
  return actionCorsResponse();
}

export function GET() {
  return actionJsonResponse({
    rules: [
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
      {
        pathPattern: "/scan/**",
        apiPath: "/api/actions/scan",
      },
      {
        pathPattern: "/swap/**",
        apiPath: "/api/actions/safe-swap",
      },
    ],
  });
}

