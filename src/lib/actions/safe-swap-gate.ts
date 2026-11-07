import { CONTRACT_ADDRESS, PAY_TO_BASE, REFERRAL_ACCOUNT } from "@/lib/official";

/** Who Safe Swap will route a buy into. Fails closed: no scan or a weak scan means no swap. */
const PASSING_VERDICTS = new Set(["CLEAN", "LOW RISK"]);
const MIN_SCORE = 60;
const MIN_CONFIDENCE = 60;

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export const MIN_SWAP_SOL = 0.01;
export const MAX_SWAP_SOL = 100;
const SWAP_FEE_BPS = 50;

/** EVM chains with scan-gated swap links (chainId, native symbol, explorer, DEX names). No GL1TCH fee on these. */
export const EVM_SWAP_CHAINS: Record<
  string,
  { chainId: number; label: string; nativeSymbol: string; explorer: string; dexName: string }
> = {
  base: { chainId: 8453, label: "Base", nativeSymbol: "ETH", explorer: "https://basescan.org", dexName: "Aerodrome / Uniswap" },
  ethereum: { chainId: 1, label: "Ethereum", nativeSymbol: "ETH", explorer: "https://etherscan.io", dexName: "Uniswap" },
  arbitrum: { chainId: 42161, label: "Arbitrum", nativeSymbol: "ETH", explorer: "https://arbiscan.io", dexName: "Uniswap / Camelot" },
  bsc: { chainId: 56, label: "BNB Chain", nativeSymbol: "BNB", explorer: "https://bscscan.com", dexName: "PancakeSwap" },
  polygon: { chainId: 137, label: "Polygon", nativeSymbol: "POL", explorer: "https://polygonscan.com", dexName: "QuickSwap / Uniswap" },
  avalanche: { chainId: 43114, label: "Avalanche", nativeSymbol: "AVAX", explorer: "https://snowtrace.io", dexName: "Trader Joe / Uniswap" },
  optimism: { chainId: 10, label: "Optimism", nativeSymbol: "ETH", explorer: "https://optimistic.etherscan.io", dexName: "Velodrome / Uniswap" },
};

export type ScanBody = {
  verdict?: unknown;
  score?: unknown;
  confidence?: unknown;
  bottomLine?: unknown;
  verified?: unknown;
};

export type GateResult = { ok: true } | { ok: false; reason: string };

export function isSolanaAddress(value: string): boolean {
  return BASE58_ADDRESS.test(value);
}

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}

export function isSupportedEvmSwapChain(chain: string | null | undefined): boolean {
  return Boolean(chain && chain.toLowerCase() in EVM_SWAP_CHAINS);
}

/** Parse a `/safe-swap/[mint]` route segment: either a bare Solana mint, `<chain>-0x...`, or bare `0x...` (with optional ?chain=). */
export function parseSafeSwapTarget(rawSegment: string, queryChain?: string | null): { chain: string; address: string } | null {
  const trimmed = decodeURIComponent(rawSegment).trim();
  if (isSolanaAddress(trimmed)) {
    return { chain: "solana", address: trimmed };
  }
  const dashIdx = trimmed.indexOf("-");
  if (dashIdx > 0) {
    const prefix = trimmed.slice(0, dashIdx).toLowerCase();
    const rest = trimmed.slice(dashIdx + 1);
    if (prefix === "solana" && isSolanaAddress(rest)) {
      return { chain: "solana", address: rest };
    }
    if (isSupportedEvmSwapChain(prefix) && isEvmAddress(rest)) {
      return { chain: prefix, address: rest };
    }
  }
  if (isEvmAddress(trimmed)) {
    const ch = (queryChain ?? "base").toLowerCase();
    if (isSupportedEvmSwapChain(ch)) {
      return { chain: ch, address: trimmed };
    }
  }
  return null;
}

/** Pinned EVM partner fee configuration (50 bps = 0.5% to PAY_TO_BASE). EVM_REFERRAL_FEE=off is the kill switch. */
export function evmSwapFee(env: Record<string, string | undefined> = process.env): { recipient: string; bps: number; pct: number } | null {
  if (env.EVM_REFERRAL_FEE?.trim().toLowerCase() === "off") return null;
  return { recipient: PAY_TO_BASE, bps: SWAP_FEE_BPS, pct: SWAP_FEE_BPS / 100 };
}

export function checkSwapGate(status: number, body: ScanBody | null | undefined): GateResult {
  if (status !== 200 || !body) return { ok: false, reason: "The safety scan is unavailable, so GL1TCH will not route this buy." };

  const verdict = String(body.verdict ?? "UNKNOWN");
  if (!PASSING_VERDICTS.has(verdict)) {
    return { ok: false, reason: `Scan verdict is ${verdict}. ${String(body.bottomLine ?? "")}`.trim() };
  }
  if (typeof body.score !== "number" || body.score < MIN_SCORE) {
    return { ok: false, reason: `Scan score is below ${MIN_SCORE}.` };
  }
  // Verified blue-chips are known independently of the scan sources, so a source outage shouldn't block them.
  if (body.verified !== true && typeof body.confidence === "number" && body.confidence < MIN_CONFIDENCE) {
    return { ok: false, reason: "Too many scan sources were unavailable to trust this result." };
  }
  return { ok: true };
}

/** Returns lamports, or null when the amount is not a number inside the allowed range. Never silently changes it. */
export function parseSwapLamports(raw: string | null): number | null {
  const sol = Number(raw);
  if (!raw || !Number.isFinite(sol) || sol < MIN_SWAP_SOL || sol > MAX_SWAP_SOL) return null;
  return Math.round(sol * 1e9);
}

/** The fee goes to the pinned referral account or nowhere. JUP_REFERRAL_ACCOUNT=off is the kill switch; no setting can
 *  redirect the fee or raise it. Whether it's safe to use right now is referral-check.ts's call. */
export function swapFee(env: Record<string, string | undefined> = process.env): { account: string; bps: number } | null {
  if (env.JUP_REFERRAL_ACCOUNT?.trim().toLowerCase() === "off") return null;
  return { account: REFERRAL_ACCOUNT, bps: SWAP_FEE_BPS };
}

/** No fee on our own token: we shouldn't earn from a buy of what our scanner graded for itself. */
export function swapFeeFor(mint: string, env: Record<string, string | undefined> = process.env) {
  return mint === CONTRACT_ADDRESS ? null : swapFee(env);
}

/** Token names are written by whoever launched the token: keep them out of our wallet prompts unless they're plain. */
export function safeSymbol(raw: unknown): string {
  const symbol = String(raw ?? "");
  return /^[A-Za-z0-9$._-]{1,16}$/.test(symbol) ? symbol : "this token";
}

/** Jupiter returns the order even when it dropped our fee, and reports the rate it really applied. */
export function appliedFeeBps(requestedBps: number, order: { feeBps?: unknown }): number | undefined {
  return typeof order.feeBps === "number" && order.feeBps >= requestedBps ? requestedBps : undefined;
}

export function feeLabel(bps: number | undefined): string {
  return bps ? `${bps / 100}% GL1TCH fee` : "No GL1TCH fee";
}
