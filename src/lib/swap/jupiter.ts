/**
 * Safe Swap: Solana swaps routed through Jupiter's Swap API V2 (GET /order, POST /execute).
 * Non-custodial: Jupiter builds the transaction, the user's own wallet signs it, and GL1TCH only
 * relays the signed bytes to Jupiter. GL1TCH earns a fee only when a Jupiter referral account is
 * configured (JUP_REFERRAL_ACCOUNT, owned by the founder's wallet); until then the swap carries
 * Jupiter's own platform fee and nothing for GL1TCH. With a referral fee set, Jupiter keeps 20% of
 * it and charges no separate platform fee.
 */

import { solanaRpc } from "@/lib/scan";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_DECIMALS = 9;
export const JUP_SWAP_BASE = "https://api.jup.ag/swap/v2";
/** Jupiter's accepted referral fee range, in basis points. */
export const FEE_MIN_BPS = 50;
export const FEE_MAX_BPS = 255;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isSolanaAddress = (s: string | null | undefined): s is string => !!s && BASE58.test(s);

export interface SwapFee {
  account: string;
  bps: number;
}

type Env = Record<string, string | undefined>;

/** The GL1TCH referral fee, or null when none is configured (the swap then carries no GL1TCH fee). */
export function readSwapFee(env: Env): SwapFee | null {
  const account = env.JUP_REFERRAL_ACCOUNT?.trim();
  if (!isSolanaAddress(account)) return null;
  const raw = Number(env.JUP_REFERRAL_FEE_BPS ?? FEE_MIN_BPS);
  const bps = Number.isFinite(raw) ? Math.min(FEE_MAX_BPS, Math.max(FEE_MIN_BPS, Math.round(raw))) : FEE_MIN_BPS;
  return { account, bps };
}

/** Optional Jupiter API key (free from the Jupiter developer portal) for more than the keyless 0.5 RPS. */
export function jupHeaders(env: Env): Record<string, string> {
  const key = env.JUP_API_KEY?.trim();
  return key ? { "x-api-key": key } : {};
}

export interface OrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
}

export function orderUrl(p: OrderParams, fee: SwapFee | null): string {
  const q = new URLSearchParams({ inputMint: p.inputMint, outputMint: p.outputMint, amount: p.amount, taker: p.taker });
  if (fee) {
    q.set("referralAccount", fee.account);
    q.set("referralFee", String(fee.bps));
  }
  return `${JUP_SWAP_BASE}/order?${q}`;
}

export interface SwapQuote {
  requestId: string;
  /** Base64 transaction for the taker to sign; null when Jupiter couldn't build one (see error). */
  transaction: string | null;
  inAmount: string;
  outAmount: string;
  inUsdValue: number | null;
  outUsdValue: number | null;
  priceImpactPct: number | null;
  /** Total fee rate on the swap, Jupiter's and GL1TCH's together. */
  feeBps: number;
  feeMint: string | null;
  router: string | null;
  error: string | null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** The fields of a Jupiter /order answer the site uses, or null when it isn't one. */
export function pickQuote(raw: unknown): SwapQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const requestId = str(r.requestId);
  const inAmount = str(r.inAmount);
  const outAmount = str(r.outAmount);
  if (!requestId || !inAmount || !outAmount) return null;
  const impact = num(r.priceImpactPct);
  return {
    requestId,
    transaction: str(r.transaction),
    inAmount,
    outAmount,
    inUsdValue: num(r.inUsdValue),
    outUsdValue: num(r.outUsdValue),
    priceImpactPct: impact == null ? null : impact * 100,
    feeBps: num(r.feeBps) ?? 0,
    feeMint: str(r.feeMint),
    router: str(r.router),
    error: str(r.errorMessage) ?? str(r.error),
  };
}

export async function getOrder(p: OrderParams, fee: SwapFee | null, env: Env): Promise<{ status: number; quote: SwapQuote | null; error?: string }> {
  const res = await fetch(orderUrl(p, fee), { headers: jupHeaders(env), signal: AbortSignal.timeout(12_000), cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body && typeof body === "object" ? str((body as Record<string, unknown>).error) : null;
    return { status: res.status, quote: null, error: msg ?? `Jupiter answered ${res.status}` };
  }
  const quote = pickQuote(body);
  return quote ? { status: 200, quote } : { status: 502, quote: null, error: "Jupiter sent an unexpected answer" };
}

export interface ExecuteResult {
  status: "Success" | "Failed";
  signature: string | null;
  error: string | null;
}

export async function executeOrder(signedTransaction: string, requestId: string, env: Env): Promise<{ status: number; result: ExecuteResult | null; error?: string }> {
  const res = await fetch(`${JUP_SWAP_BASE}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json", ...jupHeaders(env) },
    body: JSON.stringify({ signedTransaction, requestId }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body) return { status: res.ok ? 502 : res.status, result: null, error: (body && str(body.error)) ?? `Jupiter answered ${res.status}` };
  return {
    status: 200,
    result: { status: body.status === "Success" ? "Success" : "Failed", signature: str(body.signature), error: str(body.error) },
  };
}

/** A Solana token's decimals, read from its mint. */
export async function tokenDecimals(mint: string): Promise<number> {
  if (mint === SOL_MINT) return SOL_DECIMALS;
  const r = await solanaRpc<{ value?: { decimals?: number } }>("getTokenSupply", [mint]);
  const d = r?.value?.decimals;
  if (typeof d !== "number" || !Number.isInteger(d)) throw new Error("token decimals unavailable");
  return d;
}
