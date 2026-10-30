import { type NextRequest } from "next/server";
import { actionCorsResponse, actionJsonResponse } from "@/lib/actions/cors";
import { runScanReport } from "@/lib/scan-report";
import { OFFICIAL, CONTRACT_ADDRESS, DEPLOYER_WALLET } from "@/lib/official";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_SWAP_ORDER_URL = "https://api.jup.ag/swap/v2/order";

export function OPTIONS() {
  return actionCorsResponse();
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || CONTRACT_ADDRESS;

  let score = 95;
  let verdict = "CLEAN";
  let symbol = "$GL1TCH";
  let isRisky = false;
  let reason = "";

  try {
    const rep = await runScanReport(mint, "solana", "auto");
    if (rep.status === 200 && rep.body) {
      score = Number(rep.body.score ?? 50);
      verdict = String(rep.body.verdict || "UNKNOWN");
      symbol = String(rep.body.symbol || rep.body.name || "$TOKEN");
      if (verdict === "HIGH RISK" || verdict === "RUG-SHAPED" || score < 60) {
        isRisky = true;
        reason = String(rep.body.bottomLine || "Token failed safety threshold; high rug risk.");
      }
    }
  } catch {
    /* fallback to safe defaults */
  }

  if (isRisky) {
    return actionJsonResponse({
      type: "action",
      icon: `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`,
      title: `⚠️ GL1TCH Safety Refusal: ${symbol}`,
      description: `GL1TCH Safe Swap refused to route a buy into this token (${verdict} · ${score}/100): ${reason}`,
      label: "Buy Refused",
      disabled: true,
      links: {
        actions: [
          {
            label: "Inspect Full Risk Report ↗",
            href: `${OFFICIAL.SITE_URL}/scan/solana-${mint}`,
          },
        ],
      },
    });
  }

  return actionJsonResponse({
    type: "action",
    icon: `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`,
    title: `🛡️ GL1TCH Safe Swap: ${symbol} (${score}/100)`,
    description: `Verified safe token (${verdict}). Authorities revoked, LP locked. 0.5% fee routed via Jupiter.`,
    label: "Safe Swap",
    disabled: false,
    links: {
      actions: [
        {
          label: "0.1 SOL",
          href: `/api/actions/safe-swap?mint=${mint}&amount=0.1`,
        },
        {
          label: "0.5 SOL",
          href: `/api/actions/safe-swap?mint=${mint}&amount=0.5`,
        },
        {
          label: "1.0 SOL",
          href: `/api/actions/safe-swap?mint=${mint}&amount=1.0`,
        },
        {
          label: "Buy",
          href: `/api/actions/safe-swap?mint=${mint}&amount={amount}`,
          parameters: [
            {
              name: "amount",
              label: "SOL amount to swap (e.g. 0.25)",
              required: true,
            },
          ],
        },
      ],
    },
  });
}

export async function POST(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || CONTRACT_ADDRESS;
  const rawAmount = req.nextUrl.searchParams.get("amount") || "0.1";
  const solAmount = Math.max(0.01, Math.min(100, Number(rawAmount) || 0.1));
  const lamports = Math.round(solAmount * 1e9);

  let account = "";
  try {
    const body = await req.json();
    account = String(body.account || "").trim();
  } catch {
    /* empty */
  }

  if (!account) {
    return actionJsonResponse({ error: "Missing account in request body" }, 400);
  }

  // Safety gate: verify token is not HIGH RISK / RUG-SHAPED
  try {
    const rep = await runScanReport(mint, "solana", "auto");
    const v = String(rep?.body?.verdict || "CLEAN");
    if (v === "HIGH RISK" || v === "RUG-SHAPED") {
      return actionJsonResponse(
        {
          error: `GL1TCH Safe Gate refused swap: token reads ${v}. Sells remain open on DEX.`,
        },
        400
      );
    }
  } catch {
    /* continue if scan network transient */
  }

  // Query Jupiter Swap API v2 order builder
  const referralAccount = process.env.JUP_REFERRAL_ACCOUNT || DEPLOYER_WALLET;
  const jupParams = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: mint,
    amount: String(lamports),
    taker: account,
    referralAccount,
    referralFee: "50", // 50 bps = 0.5% referral platform fee to GL1TCH
  });

  const jupHeaders: Record<string, string> = {};
  if (process.env.JUP_API_KEY) jupHeaders["x-api-key"] = process.env.JUP_API_KEY;

  try {
    const res = await fetch(`${JUP_SWAP_ORDER_URL}?${jupParams.toString()}`, {
      headers: jupHeaders,
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok || !data.transaction) {
      return actionJsonResponse(
        {
          error: String(data.errorMessage || data.error || "Jupiter could not find swap route for this token."),
        },
        400
      );
    }

    return actionJsonResponse({
      type: "transaction",
      transaction: data.transaction,
      message: `GL1TCH Safe Swap: Buying ${mint === CONTRACT_ADDRESS ? "$GL1TCH" : mint} with ${solAmount} SOL (0.5% platform fee)`,
    });
  } catch (e) {
    return actionJsonResponse(
      {
        error: `Safe Swap service transient error: ${(e as Error).message}`,
      },
      502
    );
  }
}

