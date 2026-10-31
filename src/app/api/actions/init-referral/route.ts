import { type NextRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { actionCorsResponse, actionJsonResponse } from "@/lib/actions/cors";
import { OFFICIAL } from "@/lib/official";
import {
  DEFAULT_REFERRAL_NAME,
  buildCompleteReferralSetupTransaction,
  checkReferralStatus,
  getReferralAccountPda,
} from "@/lib/jupiter/referral";
import { SOLANA_RPC } from "@/lib/wallet/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ICON = `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`;
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function OPTIONS() {
  return actionCorsResponse();
}

export async function GET() {
  const [pda] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);

  return actionJsonResponse({
    type: "action",
    icon: ICON,
    title: "Initialize GL1TCH Jupiter Referral",
    description: `Activate the on-chain Jupiter Referral Account (${pda.toBase58().slice(0, 4)}…${pda.toBase58().slice(-4)}) and WSOL/USDC Fee Vaults for GL1TCH Safe Swap platform fees (0.5%).`,
    label: "Initialize Referral",
    disabled: false,
    links: {
      actions: [
        {
          type: "transaction",
          label: "🚀 Initialize (Approve in Wallet)",
          href: "/api/actions/init-referral",
        },
      ],
    },
  });
}

export async function POST(req: NextRequest) {
  let account = "";
  try {
    const body = await req.json();
    account = String(body.account || "").trim();
  } catch {
    /* handled below */
  }

  if (!BASE58_REGEX.test(account)) {
    return actionJsonResponse({ error: "Missing or invalid wallet account." }, 400);
  }

  const conn = new Connection(SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
  const payer = new PublicKey(account);

  try {
    const status = await checkReferralStatus(conn, DEFAULT_REFERRAL_NAME);

    if (status.referralInitialized && status.wsolInitialized && status.usdcInitialized) {
      return actionJsonResponse(
        {
          error: `Referral account ${status.referralPda} and token vaults are already initialized and active on Solana mainnet!`,
        },
        400
      );
    }

    const { versionedTx, missingCount } = await buildCompleteReferralSetupTransaction({
      conn,
      payer,
      name: DEFAULT_REFERRAL_NAME,
      microLamports: 50000,
    });

    if (missingCount === 0) {
      return actionJsonResponse(
        {
          error: "All required accounts are already initialized.",
        },
        400
      );
    }

    const serialized = versionedTx.serialize();
    const b64 = Buffer.from(serialized).toString("base64");

    return actionJsonResponse({
      type: "transaction",
      transaction: b64,
      message: `Initialize GL1TCH Jupiter Referral (${missingCount} accounts: Base PDA + Fee Vaults). Please approve in your wallet.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return actionJsonResponse({ error: `Failed to construct transaction: ${msg}` }, 500);
  }
}
