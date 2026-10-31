/**
 * Live on-chain treasury & creator-fee snapshot for the /revenue page and /revenue.json.
 * Reads directly from Solana Mainnet RPC and Base Mainnet RPC (read-only JSON-RPC calls,
 * cached for 60s) so every balance and creator-reward claim shown on /revenue is verifiable
 * on Solscan and Basescan. A failed read is null, so the page shows no number rather than a wrong one.
 */

import { PublicKey } from "@solana/web3.js";
import { referralVaultAddress } from "@/lib/jupiter/referral";
import { DEPLOYER_WALLET, PAY_TO_BASE, REFERRAL_ACCOUNT, REFERRAL_PARTNER } from "@/lib/official";

/** Pump.fun creator-vault PDA for deployer H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4. */
export const PUMP_CREATOR_VAULT_PDA = "9kgnPTRVNfaJvuYKwhq6DyF7PfxVnbM91hQc7tY56r34";

/** Disclosed Base receiving wallet for x402 USDC settlements. */
export const DEFAULT_BASE_TREASURY = PAY_TO_BASE;

const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const VAULT_RENT_EXEMPT_LAMPORTS = 890_880;

export interface CreatorFeeClaim {
  tx: string;
  amountSol: number;
  lamports: number;
  at: number;
  vaultPda: string;
  recipient: string;
}

/** Verified on-chain CollectCreatorFee settlements from Pump.fun creator vault PDA to DEPLOYER_WALLET. */
export const VERIFIED_CREATOR_CLAIMS: CreatorFeeClaim[] = [
  {
    tx: "3LN23qxyutDXXLjTKczRYUzjfazs1BvoL6CHmwXnzaz7ydzixFY1rKQxmFiUuwhYTY6VwWwCxQAhdTVYxR1LrQBo",
    amountSol: 0.021286431,
    lamports: 21_286_431,
    at: 1793393641000,
    vaultPda: PUMP_CREATOR_VAULT_PDA,
    recipient: DEPLOYER_WALLET,
  },
];

export interface RevenueChannelStatus {
  id:
    | "x402"
    | "creator-fees"
    | "guardian"
    | "giveaway"
    | "agent-kit"
    | "apify"
    | "blinks"
    | "sentinel"
    | "yield-spikes";
  name: string;
  model: string;
  status: "live" | "ready";
  verifyHref: string;
}

export const REVENUE_CHANNELS: RevenueChannelStatus[] = [
  {
    id: "x402",
    name: "x402 Paid Agent API (9 Endpoints)",
    model: "$0.001–$0.01 USDC per call on Solana & Base (free for $GL1TCH holders)",
    status: "live",
    verifyHref: "/agents/docs#x402",
  },
  {
    id: "creator-fees",
    name: "Pump.fun Creator Rewards Vault",
    model: "Protocol creator fee share in SOL per trade, claimed on-chain to deployer treasury",
    status: "live",
    verifyHref: `https://solscan.io/account/${PUMP_CREATOR_VAULT_PDA}`,
  },
  {
    id: "guardian",
    name: "GL1TCH Guardian (Telegram Group Protection)",
    model: "Free for every group: 100 auto-scans a day, no token needed. No revenue",
    status: "live",
    verifyHref: "https://t.me/gl1tch_infected_bot?start=guardian",
  },
  {
    id: "giveaway",
    name: "Quantum Giveaway & Verifiable Randomness",
    model: "1 free draw/day · Unlimited for $GL1TCH holders · $0.003 USDC/call via /api/x402/random",
    status: "live",
    verifyHref: "/quantum-core/random",
  },
  {
    id: "agent-kit",
    name: "Solana Agent Kit, ElizaOS & MCP Integrations",
    model: "4 MCP tools at /api/mcp. The agent toolkit is in the repo, not on npm yet",
    status: "live",
    verifyHref: "/agents/docs",
  },
  {
    id: "apify",
    name: "Apify Store Pay-Per-Event Actor",
    model: "Not published yet. Card billing at $0.005 per result, 80% creator share, for token safety and Yield X-Ray",
    status: "ready",
    verifyHref: "/api/agents/integrations",
  },
  {
    id: "blinks",
    name: "Solana Actions & Blinks (Jupiter Safe Swap)",
    model: "Optional scan-gated swaps via Jupiter. A 0.5% GL1TCH fee applies only when the swap screen shows it, before signing. Jupiter keeps 20% of the fee",
    status: "live",
    verifyHref: "/blinks",
  },
  {
    id: "sentinel",
    name: "Rug Radar clean-scan feed (Telegram)",
    model: "Free for everyone. No revenue",
    status: "live",
    verifyHref: "https://t.me/gl1tch_infected_bot",
  },
  {
    id: "yield-spikes",
    name: "DeFi Yield Spikes Feed",
    model: "Free 7-chain APY and risk feed for bots. No revenue yet",
    status: "live",
    verifyHref: "/api/yield/spikes",
  },
];

export interface TreasurySnapshot {
  solanaWallet: string;
  baseWallet: string;
  creatorVaultPda: string;
  solanaSol: number | null;
  solanaUsdc: number | null;
  baseUsdc: number | null;
  totalUsdc: number | null;
  creatorVaultRawSol: number | null;
  creatorVaultClaimableSol: number | null;
  /** Safe Swap's fee vault: wrapped SOL waiting to be claimed, before Jupiter's share. */
  feeVault: string;
  feeVaultOwner: string;
  feeVaultSol: number | null;
  creatorClaimedSol: number;
  creatorClaims: CreatorFeeClaim[];
  channels: RevenueChannelStatus[];
  fetchedAt: number;
}

async function fetchSolanaRpc<T>(method: string, params: unknown[], rpcUrl: string): Promise<T | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function fetchBaseUsdcBalance(wallet: string, baseRpcUrl: string): Promise<number | null> {
  try {
    const clean = wallet.replace(/^0x/i, "").toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(clean)) return null;
    const data = "0x70a08231" + clean.padStart(64, "0");
    const res = await fetch(baseRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: BASE_USDC_CONTRACT, data }, "latest"],
      }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    if (!json.result || json.result === "0x") return null;
    return Number(BigInt(json.result)) / 1e6;
  } catch {
    return null;
  }
}

export function computeClaimableVaultSol(lamports: number): number {
  const claimable = Math.max(0, lamports - VAULT_RENT_EXEMPT_LAMPORTS);
  return claimable / 1e9;
}

export async function getTreasurySnapshot(opts?: {
  solanaWallet?: string;
  baseWallet?: string;
  solanaRpc?: string;
  baseRpc?: string;
}): Promise<TreasurySnapshot> {
  const solanaWallet = opts?.solanaWallet || DEPLOYER_WALLET;
  const baseWallet = opts?.baseWallet || process.env.X402_PAY_TO_BASE || DEFAULT_BASE_TREASURY;
  const solanaRpc = opts?.solanaRpc || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const baseRpc = opts?.baseRpc || "https://mainnet.base.org";

  const feeVault = referralVaultAddress(new PublicKey(REFERRAL_ACCOUNT)).toBase58();

  const [solBal, vaultBal, solUsdcAccs, baseUsdc, feeVaultBal] = await Promise.all([
    fetchSolanaRpc<{ value: number }>("getBalance", [solanaWallet], solanaRpc),
    fetchSolanaRpc<{ value: number }>("getBalance", [PUMP_CREATOR_VAULT_PDA], solanaRpc),
    fetchSolanaRpc<{
      value: Array<{
        account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number } } } } };
      }>;
    }>(
      "getTokenAccountsByOwner",
      [solanaWallet, { mint: SOLANA_USDC_MINT }, { encoding: "jsonParsed" }],
      solanaRpc
    ),
    fetchBaseUsdcBalance(baseWallet, baseRpc),
    fetchSolanaRpc<{ value: { uiAmount: number | null } }>("getTokenAccountBalance", [feeVault], solanaRpc),
  ]);

  const solanaUsdc =
    solUsdcAccs?.value?.reduce(
      (sum, acc) => sum + (acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0),
      0
    ) ?? null;

  const creatorClaimedSol = VERIFIED_CREATOR_CLAIMS.reduce((s, c) => s + c.amountSol, 0);

  return {
    solanaWallet,
    baseWallet,
    creatorVaultPda: PUMP_CREATOR_VAULT_PDA,
    solanaSol: solBal ? solBal.value / 1e9 : null,
    solanaUsdc,
    baseUsdc,
    totalUsdc: solanaUsdc !== null && baseUsdc !== null ? Number((solanaUsdc + baseUsdc).toFixed(6)) : null,
    creatorVaultRawSol: vaultBal ? vaultBal.value / 1e9 : null,
    creatorVaultClaimableSol: vaultBal ? computeClaimableVaultSol(vaultBal.value) : null,
    feeVault,
    feeVaultOwner: REFERRAL_PARTNER,
    feeVaultSol: feeVaultBal?.value.uiAmount ?? null,
    creatorClaimedSol,
    creatorClaims: VERIFIED_CREATOR_CLAIMS,
    channels: REVENUE_CHANNELS,
    fetchedAt: Date.now(),
  };
}

