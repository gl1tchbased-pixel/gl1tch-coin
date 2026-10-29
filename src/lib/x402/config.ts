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

export type PaidRouteId = "scan" | "agent" | "deployer" | "verdict" | "radar" | "random" | "quick" | "batch";

/** Catalogs keep only the first few tags (the Coinbase Bazaar keeps five), so the most specific come first. */
export const PAID_ROUTES: Record<PaidRouteId, { path: string; price: string; priceMicro: number; description: string; tags: string[] }> = {
  scan: {
    path: "/api/x402/scan",
    price: "$0.005",
    priceMicro: 5_000,
    description:
      "Token safety and rug check for one Solana or EVM token. Returns a verdict from CLEAN to RUG-SHAPED, a 0-100 safety score, a one-line summary and every check behind it: mint and freeze authority, LP lock, buy and sell tax (honeypot), holder concentration, deployer history, bot volume and linked wallets. Use it before an agent buys, swaps into, lists or recommends an unfamiliar token. Chains: Solana, Ethereum, Base, BSC, Arbitrum, Polygon. Not charged on failure.",
    tags: ["token-safety", "rug-check", "honeypot", "solana", "crypto", "base", "security", "agents"],
  },
  agent: {
    path: "/api/x402/agent",
    price: "$0.01",
    priceMicro: 10_000,
    description:
      "Know Your Agent trust check for an AI-agent wallet, or any wallet, on Solana or EVM chains. Returns a 0-100 trust score, a level (trusted, neutral, caution or unknown), the reasons, and whether the owner proved the wallet with a signature. Built from signature-verified registrations and the wallet's on-chain record in GL1TCH scans. Use it before an agent pays, trades with or accepts work from another agent. Not charged on failure.",
    tags: ["know-your-agent", "agent-trust", "wallet", "security", "agents", "solana", "base"],
  },
  deployer: {
    path: "/api/x402/deployer",
    price: "$0.003",
    priceMicro: 3_000,
    description:
      "Token deployer reputation (serial rugger check) for a creator wallet: how many of its launches GL1TCH has scanned, how many scanned as high risk or rug-shaped, its worst score and its recent launches, from the GL1TCH Signal Graph. Use it to check who created a token before trusting a new launch. Not charged on failure.",
    tags: ["deployer", "rug-check", "token-safety", "solana", "security", "crypto", "base"],
  },
  verdict: {
    path: "/api/x402/verdict",
    price: "$0.01",
    priceMicro: 10_000,
    description:
      "Token verdict card for one Solana or EVM token: a grade from CLEAN to RUG-SHAPED, a 0-100 safety score, a one-line summary, the top three risk reasons, a one-line Glitchy quip, and links to a shareable scan page and card image. Use it when an agent answers a token safety question in a chat, a Telegram group or a social feed and needs a short result it can post. Chains: Solana, Ethereum, Base, BSC, Arbitrum, Polygon. Not charged on failure.",
    tags: ["token-verdict", "rug-check", "token-safety", "social", "solana", "crypto", "base", "agents"],
  },
  radar: {
    path: "/api/x402/radar",
    // Priced for polling: a feed is bought again and again, and per-call prices under half a cent sell best.
    price: "$0.002",
    priceMicro: 2_000,
    description:
      "Rug Radar: new Solana token launches (fresh pump.fun mints, DexScreener profiles and boosts), each scanned for rug-pull and honeypot risk and ranked riskiest first, with a verdict, a 0-100 score, its main red flag and its listing time. Refreshed about every 10 minutes. Pass since=<cursor> from the last answer to get only tokens listed after it. Use it to screen new memecoin launches before a trading or alert agent acts on them. Not charged on failure.",
    tags: ["new-launches", "memecoin", "solana", "rug-check", "feed", "token-safety", "crypto"],
  },
  random: {
    path: "/api/x402/random",
    price: "$0.003",
    priceMicro: 3_000,
    description:
      "Verifiable random numbers: integers in your range from a future drand quicknet round (League of Entropy threshold-BLS beacon), so neither the caller nor the server can know them at request time. Each result carries the round signature and the commitment, so anyone can recompute and check it. Use it for raffles, giveaways, lotteries, fair allocation and games. Not charged on failure.",
    tags: ["randomness", "verifiable-random", "drand", "raffle", "provably-fair", "games"],
  },
  quick: {
    path: "/api/x402/quick",
    price: "$0.001",
    priceMicro: 1_000,
    description:
      "Quick token check: a compact, low-cost token safety and rug check for one Solana or EVM token. Returns the verdict (CLEAN to RUG-SHAPED), the 0-100 safety score, the checks that failed or warned, liquidity, LP lock, top-holder share and token age. A result can come from a scan up to 5 minutes old. Use it to screen tokens cheaply before running the full scan. Chains: Solana, Ethereum, Base, BSC, Arbitrum, Polygon. Not charged on failure.",
    tags: ["token-safety", "rug-check", "quick-check", "solana", "crypto", "base", "agents"],
  },
  batch: {
    path: "/api/x402/batch",
    price: "$0.008",
    priceMicro: 8_000,
    description:
      "Batch token safety check: up to 10 Solana or EVM tokens in one call (mints=a,b,c). Each gets the verdict (CLEAN to RUG-SHAPED), the 0-100 safety score and the checks that failed or warned; a token that cannot be read comes back with an error. Use it to screen a watchlist, a wallet's holdings or a list of new launches with one payment. Charged once per call; not charged when no token can be read.",
    tags: ["token-safety", "batch", "rug-check", "watchlist", "solana", "crypto", "base"],
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
