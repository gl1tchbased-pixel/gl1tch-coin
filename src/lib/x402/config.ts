/**
 * Paid agent API (x402) — prices, networks and who gets paid. Pure: no @x402 imports, so it is
 * cheap to test and safe to read from any route. Money goes straight to a founder-owned wallet
 * (payTo); the facilitator broadcasts the payer's own signed USDC transfer, so GL1TCH never
 * holds a key or funds.
 */

import { ATTESTER_WALLET } from "@/lib/official";

/** CAIP-2 chain id, the form x402 uses for networks. */
export type Caip2 = `${string}:${string}`;

export const SOLANA_MAINNET: Caip2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const BASE_MAINNET: Caip2 = "eip155:8453";

export type PaidRouteId = "scan" | "agent" | "deployer" | "verdict" | "radar" | "random";

/** Catalogs keep only the first few tags (the Coinbase Bazaar keeps five), so the most specific come first. */
export const PAID_ROUTES: Record<PaidRouteId, { path: string; price: string; priceMicro: number; description: string; tags: string[] }> = {
  scan: {
    path: "/api/x402/scan",
    price: "$0.005",
    priceMicro: 5_000,
    description:
      "Pre-trade token safety check for Solana and EVM (Ethereum, Base, BSC, Arbitrum, Polygon): rug-pull and honeypot risk verdict with a 0-100 score, mint/freeze authority, LP lock, buy/sell tax, holder concentration, deployer history, bot-volume and linked-wallet flags. One call; not charged on failure.",
    tags: ["crypto", "security", "token-safety", "rug-check", "honeypot", "pre-trade", "solana", "base", "agents"],
  },
  agent: {
    path: "/api/x402/agent",
    price: "$0.01",
    priceMicro: 10_000,
    description:
      "Know Your Agent: trust score and level for an AI-agent wallet (or any wallet) before you transact with it: signature-verified identity plus its on-chain track record in GL1TCH scans. Not charged on failure.",
    tags: ["know-your-agent", "agents", "wallet", "trust", "security", "solana", "base"],
  },
  deployer: {
    path: "/api/x402/deployer",
    price: "$0.003",
    priceMicro: 3_000,
    description:
      "Token deployer reputation (serial rugger check) from the GL1TCH Signal Graph: how many tokens this wallet launched and how many scanned as high risk or rug-shaped. Not charged on failure.",
    tags: ["deployer", "rug-check", "token-safety", "crypto", "security", "solana", "base"],
  },
  verdict: {
    path: "/api/x402/verdict",
    price: "$0.01",
    priceMicro: 10_000,
    description:
      "Token verdict card for Solana and EVM tokens (Ethereum, Base, BSC, Arbitrum, Polygon): grade from CLEAN to RUG-SHAPED, 0-100 safety score, a one-line summary, the top three risk reasons and a shareable verdict card image. Built for agents that post token checks to chats and social feeds. Not charged on failure.",
    tags: ["token-verdict", "rug-check", "token-safety", "crypto", "social", "solana", "base", "agents"],
  },
  radar: {
    path: "/api/x402/radar",
    price: "$0.005",
    priceMicro: 5_000,
    description:
      "Rug Radar feed: the latest sweep of freshly listed and promoted Solana tokens (new pump.fun mints, DexScreener profiles and boosts), each scanned for rug-pull and honeypot risk and ranked riskiest first, with verdict, 0-100 score and the main red flag. Refreshed about every 10 minutes. Not charged on failure.",
    tags: ["new-launches", "memecoin", "rug-check", "solana", "feed", "token-safety", "crypto"],
  },
  random: {
    path: "/api/x402/random",
    price: "$0.003",
    priceMicro: 3_000,
    description:
      "Verifiable random integers in your range, seeded by a future drand quicknet round (League of Entropy threshold-BLS beacon) that neither the caller nor the server can know at request time. Returned with the round signature and the commitment, so anyone can recompute and check the result. For raffles, giveaways, allocation and games. Not charged on failure.",
    tags: ["randomness", "verifiable", "drand", "provably-fair", "raffle", "games"],
  },
};

export interface PaymentOption {
  scheme: "exact";
  price: string;
  network: Caip2;
  payTo: string;
  maxTimeoutSeconds: number;
}

const SOLANA_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;

type Env = Record<string, string | undefined>;

/** Read the receiving wallets. A set-but-invalid value is reported in `rejected` and never used.
 *  The attester wallet is refused: its key sits in CI secrets to sign memos, and revenue must never land
 *  in a wallet whose key lives there. */
export function readPayTo(env: Env): { solana?: string; base?: string; rejected: string[] } {
  const out: { solana?: string; base?: string; rejected: string[] } = { rejected: [] };
  const sol = (env.X402_PAY_TO_SOLANA ?? "").trim();
  const base = (env.X402_PAY_TO_BASE ?? "").trim();
  if (sol) {
    if (SOLANA_ADDR.test(sol) && sol !== ATTESTER_WALLET) out.solana = sol;
    else out.rejected.push("X402_PAY_TO_SOLANA");
  }
  if (base) {
    if (EVM_ADDR.test(base)) out.base = base;
    else out.rejected.push("X402_PAY_TO_BASE");
  }
  return out;
}

/** One exact-USDC payment option per configured network, Solana first. Empty when none is set. */
export function buildAccepts(price: string, payTo: { solana?: string; base?: string }): PaymentOption[] {
  const accepts: PaymentOption[] = [];
  if (payTo.solana) accepts.push({ scheme: "exact", price, network: SOLANA_MAINNET, payTo: payTo.solana, maxTimeoutSeconds: 60 });
  if (payTo.base) accepts.push({ scheme: "exact", price, network: BASE_MAINNET, payTo: payTo.base, maxTimeoutSeconds: 60 });
  return accepts;
}

/** Our own test wallets. Their payments are recorded as self-tests and never counted as revenue. */
export function readSelfPayers(env: Env): Set<string> {
  return new Set(
    (env.X402_SELF_PAYERS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Which paid route a resource URL belongs to (pathname only). */
export function routeIdFromUrl(url: string): PaidRouteId | null {
  let pathname: string;
  try {
    pathname = new URL(url, "https://gl1tchbased.xyz").pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
  for (const id of Object.keys(PAID_ROUTES) as PaidRouteId[]) {
    if (PAID_ROUTES[id].path === pathname) return id;
  }
  return null;
}
