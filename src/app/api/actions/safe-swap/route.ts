import { type NextRequest } from "next/server";
import { actionCorsResponse, actionJsonResponse } from "@/lib/actions/cors";
import {
  appliedFeeBps,
  checkSwapGate,
  feeLabel,
  isSolanaAddress,
  MAX_SWAP_SOL,
  MIN_SWAP_SOL,
  parseSwapLamports,
  safeSymbol,
  swapFee,
} from "@/lib/actions/safe-swap-gate";
import { referralFeeProblem } from "@/lib/actions/referral-check";
import { swapTxProblem } from "@/lib/actions/swap-tx-check";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { runScanReport } from "@/lib/scan-report";
import { OFFICIAL, CONTRACT_ADDRESS } from "@/lib/official";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_SWAP_ORDER_URL = "https://api.jup.ag/swap/v2/order";
const ICON = `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`;
const RATE_PER_MIN = 20;

const limited = (req: NextRequest) =>
  rateLimit(`safe-swap:${clientIp(req)}`, RATE_PER_MIN, 60_000).ok ? null : actionJsonResponse({ error: "Too many requests, try again in a minute." }, 429);

export function OPTIONS() {
  return actionCorsResponse();
}

async function scan(mint: string) {
  try {
    const rep = await runScanReport(mint, "solana", "auto");
    return { status: rep.status, body: rep.body as Record<string, unknown> };
  } catch {
    return { status: 503, body: null };
  }
}

export async function GET(req: NextRequest) {
  const tooMany = limited(req);
  if (tooMany) return tooMany;

  const mint = req.nextUrl.searchParams.get("mint") || req.nextUrl.searchParams.get("outputMint") || CONTRACT_ADDRESS;
  if (!isSolanaAddress(mint)) return actionJsonResponse({ error: "Invalid token address" }, 400);

  const { status, body } = await scan(mint);
  const gate = checkSwapGate(status, body);
  const symbol = safeSymbol(body?.symbol);

  if (!gate.ok) {
    return actionJsonResponse({
      type: "action",
      icon: ICON,
      title: `GL1TCH refused: ${symbol}`,
      description: `Safe Swap will not route a buy here. ${gate.reason}`,
      label: "Buy refused",
      disabled: true,
      links: {
        actions: [{ type: "external-link", label: "Full risk report", href: `${OFFICIAL.SITE_URL}/scan/solana-${mint}` }],
      },
    });
  }

  const href = (amount: string) => `/api/actions/safe-swap?mint=${mint}&amount=${amount}`;
  return actionJsonResponse({
    type: "action",
    icon: ICON,
    title: `GL1TCH Safe Swap: ${symbol}`,
    description: `Scan: ${String(body?.verdict)} (${String(body?.score)}/100). A scan lowers risk but cannot rule out losses. ${feeLabel(swapFee()?.bps)}; check the amounts in your wallet before you sign.`,
    label: "Safe Swap",
    disabled: false,
    links: {
      actions: [
        { type: "transaction", label: "0.1 SOL", href: href("0.1") },
        { type: "transaction", label: "0.5 SOL", href: href("0.5") },
        { type: "transaction", label: "1 SOL", href: href("1") },
        {
          type: "transaction",
          label: "Buy",
          href: href("{amount}"),
          parameters: [{ name: "amount", label: `SOL amount (${MIN_SWAP_SOL} to ${MAX_SWAP_SOL})`, required: true }],
        },
      ],
    },
  });
}

async function jupiterOrder(params: URLSearchParams) {
  const headers: Record<string, string> = {};
  if (process.env.JUP_API_KEY) headers["x-api-key"] = process.env.JUP_API_KEY;
  const res = await fetch(`${JUP_SWAP_ORDER_URL}?${params.toString()}`, { headers, signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  return { ok: res.ok && Boolean(data.transaction), data };
}

export async function POST(req: NextRequest) {
  const tooMany = limited(req);
  if (tooMany) return tooMany;

  const mint = req.nextUrl.searchParams.get("mint") || req.nextUrl.searchParams.get("outputMint") || CONTRACT_ADDRESS;
  if (!isSolanaAddress(mint)) return actionJsonResponse({ error: "Invalid token address" }, 400);

  const lamports = parseSwapLamports(req.nextUrl.searchParams.get("amount"));
  if (lamports === null) return actionJsonResponse({ error: `Amount must be ${MIN_SWAP_SOL} to ${MAX_SWAP_SOL} SOL` }, 400);

  let account = "";
  try {
    const body = await req.json();
    account = String(body.account || "").trim();
  } catch {
    /* handled below */
  }
  if (!isSolanaAddress(account)) return actionJsonResponse({ error: "Missing or invalid account" }, 400);

  const { status, body } = await scan(mint);
  const gate = checkSwapGate(status, body);
  if (!gate.ok) return actionJsonResponse({ error: `GL1TCH refused this buy. ${gate.reason}` }, 400);

  // JupiterZ adds a market maker's signature only in /execute, which a wallet signing through an Action never reaches.
  const params = new URLSearchParams({ inputMint: SOL_MINT, outputMint: mint, amount: String(lamports), taker: account, excludeRouters: "jupiterz" });
  const configuredFee = swapFee();
  const fee = configuredFee && !(await referralFeeProblem()) ? configuredFee : null;

  try {
    let appliedBps: number | undefined;
    let order = { ok: false, data: {} as Record<string, unknown> };
    if (fee) {
      const withFee = new URLSearchParams(params);
      withFee.set("referralAccount", fee.account);
      withFee.set("referralFee", String(fee.bps));
      order = await jupiterOrder(withFee);
      if (order.ok) appliedBps = appliedFeeBps(fee.bps, order.data);
    }
    // A referral setup problem must not break the user's swap: run it without our fee, and say so.
    if (!order.ok) order = await jupiterOrder(params);
    if (!order.ok) {
      return actionJsonResponse(
        { error: String(order.data.errorMessage || order.data.error || "Jupiter found no route for this token.") },
        400
      );
    }

    const problem = swapTxProblem(String(order.data.transaction), { taker: account, lamports });
    if (problem) {
      console.error(`[safe-swap] refused Jupiter's transaction: ${problem}`);
      return actionJsonResponse({ error: "GL1TCH could not verify this route, so it was not sent to your wallet. Try another amount." }, 502);
    }

    return actionJsonResponse({
      type: "transaction",
      transaction: order.data.transaction,
      message: `Safe Swap via Jupiter: ${lamports / 1e9} SOL to ${safeSymbol(body?.symbol)}. ${feeLabel(appliedBps)}.`,
    });
  } catch {
    return actionJsonResponse({ error: "Could not reach Jupiter. Nothing was signed; try again." }, 502);
  }
}
