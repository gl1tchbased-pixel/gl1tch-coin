/**
 * Standard Solana Actions & Blinks headers and CORS helpers.
 * Specified by Solana Foundation & Dialect (Actions Specification v2.4).
 */

export const ACTION_CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
  "access-control-allow-headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids",
  "access-control-expose-headers": "X-Action-Version, X-Blockchain-Ids",
  "x-action-version": "2.4",
  "x-blockchain-ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};

export function actionCorsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: ACTION_CORS_HEADERS,
  });
}

export function actionJsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      ...ACTION_CORS_HEADERS,
      "content-type": "application/json",
      "cache-control": "public, max-age=60, stale-while-revalidate=120",
    },
  });
}

