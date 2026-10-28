/**
 * Discovery metadata for the paid agent API, so x402 catalogs can find and list it:
 *  - `bazaarDiscovery` → the bazaar extension inside each 402 challenge (input schema + example),
 *  - `buildOpenApi`    → /openapi.json (x402scan's preferred discovery, paid operations only),
 *  - `wellKnownX402`   → /.well-known/x402 (compatibility fan-out).
 * One table of parameters feeds all three so they can't drift apart.
 */

import { PAID_ROUTES, type PaidRouteId } from "./config";

interface Param { name: string; required: boolean; description: string; example: string }

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const SAMPLE_WALLET = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";

const PARAMS: Record<PaidRouteId, Param[]> = {
  scan: [
    { name: "mint", required: true, description: "Token address (Solana mint, or EVM contract)", example: BONK },
    { name: "chain", required: false, description: "solana, ethereum, base, bsc, arbitrum, polygon, … (auto-detected when omitted)", example: "solana" },
  ],
  agent: [
    { name: "address", required: true, description: "The agent's wallet address", example: SAMPLE_WALLET },
    { name: "chain", required: false, description: "Chain of the wallet (default solana)", example: "solana" },
  ],
  deployer: [
    { name: "address", required: true, description: "The deployer wallet address", example: SAMPLE_WALLET },
    { name: "chain", required: false, description: "Chain of the wallet (default solana)", example: "solana" },
  ],
};

const OUTPUT_EXAMPLES: Record<PaidRouteId, unknown> = {
  scan: {
    mint: BONK,
    chain: "solana",
    name: "Bonk",
    symbol: "Bonk",
    verdict: "CLEAN",
    score: 95,
    confidence: 93,
    // Values from a real BONK scan (2026-10-28).
    bottomLine: "Verified blue-chip — established, audited and deeply liquid. Managed supply/ownership is by design for this asset, not rug risk.",
    risks: [],
    checks: [{ key: "mint_authority", label: "Mint authority", status: "pass", value: "REVOKED", explain: "No one can mint more. Supply is fixed — the way it should be." }],
    meta: { deployer: "…", deployerReputation: { level: "clean", tokensSeen: 1, flaggedCount: 0 } },
  },
  // The sample wallet is GL1TCH's own attester, so its examples state only what is true of it.
  agent: { address: SAMPLE_WALLET, chain: "solana", score: 30, level: "unknown", reasons: ["Not registered; no on-chain track record in GL1TCH scans"], registered: false, verified: false },
  deployer: {
    address: SAMPLE_WALLET,
    chain: "solana",
    reputation: { deployer: SAMPLE_WALLET, chain: "solana", tokensSeen: 0, flaggedCount: 0, worstScore: null, level: "unknown", note: "No tokens from this wallet in GL1TCH scans", recent: [] },
  },
};

export interface BazaarQueryDiscovery {
  input: Record<string, string>;
  inputSchema: { type: "object"; properties: Record<string, { type: "string"; description: string }>; required: string[] };
  output: { example: unknown };
}

/** The bazaar discovery hints for one route (passed to `declareDiscoveryExtension`). */
export function bazaarDiscovery(id: PaidRouteId): BazaarQueryDiscovery {
  const params = PARAMS[id];
  return {
    input: Object.fromEntries(params.filter((p) => p.required).map((p) => [p.name, p.example])),
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(params.map((p) => [p.name, { type: "string" as const, description: p.description }])),
      required: params.filter((p) => p.required).map((p) => p.name),
    },
    output: { example: OUTPUT_EXAMPLES[id] },
  };
}

const priceAmount = (price: string) => price.replace(/^\$/, "");

export function buildOpenApi(origin: string): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  for (const id of Object.keys(PAID_ROUTES) as PaidRouteId[]) {
    const r = PAID_ROUTES[id];
    paths[r.path] = {
      get: {
        operationId: `x402_${id}`,
        summary: r.description,
        parameters: PARAMS[id].map((p) => ({
          name: p.name,
          in: "query",
          required: p.required,
          description: p.description,
          schema: { type: "string", example: p.example },
        })),
        "x-payment-info": { protocols: ["x402"], price: { mode: "fixed", currency: "USD", amount: priceAmount(r.price) } },
        responses: {
          "200": { description: "Success (the payment settles only now)", content: { "application/json": { example: OUTPUT_EXAMPLES[id] } } },
          "400": { description: "Invalid input (not charged)" },
          "402": { description: "Payment Required (x402 challenge in the PAYMENT-REQUIRED header)" },
          "503": { description: "Sources degraded or route not configured (not charged)" },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "GL1TCH paid agent API (x402)",
      version: "1.0.0",
      contact: { name: "GL1TCH", email: "founder@gl1tchbased.xyz", url: "https://gl1tchbased.xyz" },
      description:
        "Token rug-risk scans, Know Your Agent checks and deployer reputation, paid per call in USDC (Solana or Base). Free versions of the same checks: /api/scan and /api/agent/check. Docs: /agents/docs#x402",
    },
    servers: [{ url: origin }],
    paths,
  };
}

export function wellKnownX402(origin: string): { version: 1; resources: string[] } {
  return { version: 1, resources: (Object.keys(PAID_ROUTES) as PaidRouteId[]).map((id) => `${origin}${PAID_ROUTES[id].path}`) };
}
