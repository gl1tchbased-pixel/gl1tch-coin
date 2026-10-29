/**
 * Discovery metadata for the paid agent API, so x402 catalogs can find and list it:
 *  - `bazaarDiscovery` → the bazaar extension inside each 402 challenge (input schema + example),
 *  - `buildOpenApi`    → /openapi.json (x402scan's preferred discovery, paid operations only),
 *  - `wellKnownX402`   → /.well-known/x402 (compatibility fan-out).
 * One table of parameters feeds all three so they can't drift apart.
 */

import { PAID_ROUTES, type PaidRouteId } from "./config";
import { CHAIN as DRAND_QUICKNET } from "@/lib/quantum/drand-round";

/** `inExample`: an optional parameter that still goes into the catalog's example call. */
interface Param { name: string; required: boolean; description: string; example: string; inExample?: boolean }

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const SAMPLE_WALLET = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";
const BONK_PAGE = `https://gl1tchbased.xyz/scan/solana-${BONK}`;

const TOKEN_PARAMS: Param[] = [
  { name: "mint", required: true, description: "Token address (Solana mint, or EVM contract)", example: BONK },
  { name: "chain", required: false, description: "solana, ethereum, base, bsc, arbitrum, polygon, … (auto-detected when omitted)", example: "solana" },
];

const PARAMS: Record<PaidRouteId, Param[]> = {
  scan: TOKEN_PARAMS,
  verdict: TOKEN_PARAMS,
  radar: [],
  random: [
    { name: "min", required: false, description: "Smallest value (integer, default 1)", example: "1", inExample: true },
    { name: "max", required: false, description: "Largest value (integer, default 100)", example: "100", inExample: true },
    { name: "count", required: false, description: "How many integers, 1-1000 (default 1)", example: "1" },
    { name: "salt", required: false, description: "Your own label, bound into the commitment (1-64 chars of A-Z a-z 0-9 _ . : -)", example: "raffle-42" },
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
    // Values from a real BONK scan (2026-10-28); the prose is kept flat and descriptive. The Coinbase
    // Bazaar screens metadata for text that could steer an agent, and dropped the scan while this
    // example read "Verified blue-chip … not rug risk".
    bottomLine: "Established token. No rug-pull flags in this scan.",
    risks: [],
    checks: [{ key: "mint_authority", label: "Mint authority", status: "pass", value: "REVOKED", explain: "Mint authority is revoked; the supply cannot grow." }],
    meta: { deployer: "…", deployerReputation: { level: "clean", tokensSeen: 1, flaggedCount: 0 } },
  },
  // The sample wallet is GL1TCH's own attester, so its examples state only what is true of it.
  agent: { address: SAMPLE_WALLET, chain: "solana", score: 30, level: "unknown", reasons: ["Not registered; no on-chain track record in GL1TCH scans"], registered: false, verified: false },
  deployer: {
    address: SAMPLE_WALLET,
    chain: "solana",
    reputation: { deployer: SAMPLE_WALLET, chain: "solana", tokensSeen: 0, flaggedCount: 0, worstScore: null, level: "unknown", note: "No tokens from this wallet in GL1TCH scans", recent: [] },
  },
  verdict: {
    mint: BONK,
    chain: "solana",
    name: "Bonk",
    symbol: "Bonk",
    verdict: "CLEAN",
    score: 95,
    confidence: 93,
    verified: true,
    summary: "Established token. No rug-pull flags in this scan.",
    reasons: [],
    card: { page: BONK_PAGE, image: `${BONK_PAGE}/opengraph-image` },
    scannedAt: 1793217679232,
  },
  // The shape of a sweep; the token entry is a placeholder, not a real token.
  radar: {
    scanned: 40,
    flagged: 6,
    updatedAt: 1793217679232,
    ageSeconds: 120,
    tokens: [{ chain: "solana", mint: "<token mint>", name: "<name>", symbol: "<symbol>", verdict: "HIGH RISK", score: 22, reason: "Mint authority: ACTIVE", flagged: true }],
  },
  random: {
    kind: "ints",
    values: [42],
    spec: { kind: "ints", min: 1, max: 100, count: 1 },
    proof: {
      source: "drand-quicknet",
      chainHash: DRAND_QUICKNET,
      round: 18421907,
      randomness: "<sha256 of the round signature>",
      signature: "<drand BLS signature>",
      requestId: "<sha256 of the commitment>",
      commitment: "v=1|keyHash=…|spec=ints:1:100:1|salt=raffle-42|source=drand-quicknet|chainHash=…|targetRound=18421907|committedAt=…",
      verify: "randomness = sha256(signature); …",
    },
  },
};

type Schema = Record<string, unknown>;
const text = (description: string): Schema => ({ type: "string", description });
const textOrNull = (description: string): Schema => ({ type: ["string", "null"], description });
const num = (description: string): Schema => ({ type: "number", description });
const numOrNull = (description: string): Schema => ({ type: ["number", "null"], description });
const int = (description: string): Schema => ({ type: "integer", description });
const bool = (description: string): Schema => ({ type: "boolean", description });
const obj = (properties: Record<string, Schema>, required: string[], description?: string): Schema => ({
  type: "object",
  ...(description ? { description } : {}),
  properties,
  required,
});
const list = (items: Schema, description: string): Schema => ({ type: "array", description, items });

const VERDICTS = ["CLEAN", "LOW RISK", "CAUTION", "HIGH RISK", "RUG-SHAPED", "UNKNOWN"];
const verdictField: Schema = { type: "string", enum: VERDICTS, description: "Overall grade, safest to riskiest: CLEAN, LOW RISK, CAUTION, HIGH RISK, RUG-SHAPED (UNKNOWN when unreadable)" };
const scoreField = num("Safety score, 0 (riskiest) to 100 (safest)");

/**
 * JSON Schema of each 200 body. The Coinbase Bazaar weighs output-schema completeness when it ranks
 * search results, and agents build parsers from it. Loose on purpose (no additionalProperties: false),
 * so a field added later doesn't break a caller. The tests check every example against its schema.
 */
const OUTPUT_SCHEMAS: Record<PaidRouteId, Schema> = {
  scan: obj(
    {
      mint: text("Token address that was scanned"),
      chain: text("Chain of the token (solana, ethereum, base, bsc, arbitrum, polygon, …)"),
      name: textOrNull("Token name"),
      symbol: textOrNull("Token symbol"),
      verdict: verdictField,
      score: scoreField,
      confidence: num("How much of the checklist could be verified, 0-100"),
      verified: bool("True for a known canonical token, not an impostor clone"),
      bottomLine: text("One-line plain-language summary"),
      checks: list(
        obj(
          {
            key: text("Stable id of the check, e.g. mint_authority"),
            label: text("Human-readable name of the check"),
            status: { type: "string", enum: ["pass", "warn", "fail", "unknown"], description: "Result of the check" },
            value: text("What was read, e.g. REVOKED"),
            explain: text("One sentence on what the reading means"),
          },
          ["key", "label", "status", "value", "explain"]
        ),
        "Every check behind the verdict: authorities, LP lock, taxes, holders, deployer, trading activity, linked wallets"
      ),
      risks: list({ type: "object" }, "Named risks reported by RugCheck, when available"),
      meta: { type: "object", description: "Readings behind the checks: price, liquidity, holders, LP lock, deployer and its reputation" },
      scannedAt: num("Time of the scan, Unix milliseconds"),
    },
    ["mint", "chain", "verdict", "score", "confidence", "bottomLine", "checks"]
  ),
  verdict: obj(
    {
      mint: text("Token address that was scanned"),
      chain: text("Chain of the token"),
      name: textOrNull("Token name"),
      symbol: textOrNull("Token symbol"),
      verdict: verdictField,
      score: scoreField,
      confidence: numOrNull("How much of the checklist could be verified, 0-100"),
      verified: bool("True for a known canonical token, not an impostor clone"),
      summary: text("One-line plain-language summary"),
      reasons: list(
        obj(
          { label: text("Name of the failed or flagged check"), value: text("What was read"), status: { type: "string", enum: ["fail", "warn"] } },
          ["label", "value", "status"]
        ),
        "Up to three risk reasons, failures first"
      ),
      card: obj({ page: text("Shareable scan page URL"), image: text("Verdict card image URL (PNG)") }, ["page", "image"]),
      scannedAt: numOrNull("Time of the scan, Unix milliseconds"),
    },
    ["mint", "chain", "verdict", "score", "summary", "reasons", "card"]
  ),
  radar: obj(
    {
      scanned: int("Tokens scanned in this sweep"),
      flagged: int("Tokens graded HIGH RISK or RUG-SHAPED"),
      updatedAt: num("Time of the sweep, Unix milliseconds"),
      ageSeconds: int("Seconds since the sweep ran"),
      tokens: list(
        obj(
          {
            chain: text("Chain of the token"),
            mint: text("Token address"),
            name: text("Token name"),
            symbol: text("Token symbol"),
            verdict: verdictField,
            score: scoreField,
            reason: text("The main red flag, or a note that the contract checks passed"),
            flagged: bool("True for HIGH RISK or RUG-SHAPED"),
          },
          ["chain", "mint", "verdict", "score", "reason", "flagged"]
        ),
        "Every token of the sweep, riskiest first"
      ),
    },
    ["scanned", "flagged", "updatedAt", "tokens"]
  ),
  agent: obj(
    {
      address: text("Wallet that was checked"),
      chain: text("Chain of the wallet"),
      score: num("Trust score, 0-100"),
      level: { type: "string", enum: ["trusted", "neutral", "caution", "unknown"], description: "Trust level" },
      reasons: list({ type: "string" }, "Why the wallet got this score"),
      registered: bool("The wallet is registered with GL1TCH Know Your Agent"),
      verified: bool("The owner proved control of the wallet with a signature"),
    },
    ["address", "chain", "score", "level", "reasons", "registered", "verified"]
  ),
  deployer: obj(
    {
      address: text("Creator wallet that was checked"),
      chain: text("Chain of the wallet"),
      reputation: obj(
        {
          deployer: text("Creator wallet"),
          chain: text("Chain of the wallet"),
          tokensSeen: int("Launches by this wallet that GL1TCH has scanned"),
          flaggedCount: int("How many of them scanned as HIGH RISK or RUG-SHAPED"),
          worstScore: numOrNull("Lowest safety score among them"),
          level: { type: "string", enum: ["unknown", "clean", "watch", "serial"], description: "unknown (no record), clean, watch, serial (repeat rug-shaped launches)" },
          note: text("One-line summary of the record"),
          recent: list(
            obj(
              { mint: text("Token address"), verdict: text("Verdict when scanned"), score: numOrNull("Safety score when scanned"), ts: num("When it was seen, Unix milliseconds") },
              ["mint", "verdict", "ts"]
            ),
            "Most recent launches seen"
          ),
        },
        ["deployer", "chain", "tokensSeen", "flaggedCount", "level", "note", "recent"]
      ),
    },
    ["address", "chain", "reputation"]
  ),
  random: obj(
    {
      kind: { type: "string", enum: ["ints"] },
      values: list({ type: "integer" }, "The random integers, in order"),
      spec: obj({ kind: { type: "string", enum: ["ints"] }, min: int("Smallest value"), max: int("Largest value"), count: int("How many values") }, ["kind", "min", "max", "count"]),
      proof: obj(
        {
          source: { type: "string", enum: ["drand-quicknet"] },
          chainHash: text("drand quicknet chain hash"),
          round: int("drand round the values come from"),
          randomness: text("sha256 of the round signature"),
          signature: text("drand BLS signature of the round"),
          requestId: text("sha256 of the commitment"),
          commitment: text("What was committed before the round existed"),
          verify: text("How to recompute and check the values"),
        },
        ["source", "chainHash", "round", "randomness", "signature", "requestId", "commitment", "verify"]
      ),
    },
    ["kind", "values", "spec", "proof"]
  ),
};

export interface BazaarQueryDiscovery {
  input: Record<string, string>;
  inputSchema: { type: "object"; properties: Record<string, { type: "string"; description: string }>; required: string[] };
  output: { example: unknown; schema: Schema };
}

/** The bazaar discovery hints for one route (passed to `declareDiscoveryExtension`). */
export function bazaarDiscovery(id: PaidRouteId): BazaarQueryDiscovery {
  const params = PARAMS[id];
  return {
    input: Object.fromEntries(params.filter((p) => p.required || p.inExample).map((p) => [p.name, p.example])),
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(params.map((p) => [p.name, { type: "string" as const, description: p.description }])),
      required: params.filter((p) => p.required).map((p) => p.name),
    },
    output: { example: OUTPUT_EXAMPLES[id], schema: OUTPUT_SCHEMAS[id] },
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
          "200": {
            description: "Success (the payment settles only now)",
            content: { "application/json": { schema: OUTPUT_SCHEMAS[id], example: OUTPUT_EXAMPLES[id] } },
          },
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
        "Token rug-risk scans and verdict cards, the Rug Radar feed of new Solana launches, Know Your Agent checks, deployer reputation and verifiable random numbers, paid per call in USDC (Solana or Base). Free versions of the checks: /api/scan, /api/radar and /api/agent/check. Docs: /agents/docs#x402",
    },
    servers: [{ url: origin }],
    paths,
  };
}

export function wellKnownX402(origin: string): { version: 1; resources: string[] } {
  return { version: 1, resources: (Object.keys(PAID_ROUTES) as PaidRouteId[]).map((id) => `${origin}${PAID_ROUTES[id].path}`) };
}
