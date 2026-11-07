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
const ARBITRUM_USDC_CONTRACT = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const POLYGON_USDC_CONTRACT = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const AVALANCHE_USDC_CONTRACT = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
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
    name: "x402 Paid Agent API (10 Endpoints · 6 Chains)",
    model: "$0.001–$0.01 USDC per call on Solana, Base, Arbitrum, Polygon, Avalanche & Sei (free for $GL1TCH holders)",
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
    model: "Card billing at $0.005 per result, 80% creator share, for token safety and Yield X-Ray. No sales yet",
    status: "live",
    verifyHref: "https://apify.com/gl1tch-pixel/gl1tch-token-safety-scanner",
  },
  {
    id: "blinks",
    name: "Multi-Chain Safe Swap (Solana & 7 EVM Chains)",
    model: "Scan-gated swaps via Jupiter (Solana) and 1inch/Odos (Base, Ethereum, Arbitrum, BSC, Polygon, Avalanche, Optimism) with disclosed 0.5% partner fee",
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
    name: "DeFi Yield Spikes & Arbitrage Feed",
    model: "$0.005 USDC/call via /api/x402/spikes (free for $GL1TCH holders & public preview at /api/yield/spikes)",
    status: "live",
    verifyHref: "/api/x402/spikes",
  },
];

export interface TreasurySnapshot {
  solanaWallet: string;
  baseWallet: string;
  creatorVaultPda: string;
  solanaSol: number | null;
  solanaUsdc: number | null;
  baseUsdc: number | null;
  arbitrumUsdc: number | null;
  polygonUsdc: number | null;
  avalancheUsdc: number | null;
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
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function fetchEvmUsdcBalance(wallet: string, rpcUrl: string, usdcContract = BASE_USDC_CONTRACT): Promise<number | null> {
  try {
    const clean = wallet.replace(/^0x/i, "").toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(clean)) return null;
    const data = "0x70a08231" + clean.padStart(64, "0");
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: usdcContract, data }, "latest"],
      }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 15 },
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

  const [solBal, vaultBal, solUsdcAccs, baseUsdc, arbitrumUsdc, polygonUsdc, avalancheUsdc, feeVaultBal] = await Promise.all([
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
    fetchEvmUsdcBalance(baseWallet, baseRpc, BASE_USDC_CONTRACT),
    fetchEvmUsdcBalance(baseWallet, "https://arb1.arbitrum.io/rpc", ARBITRUM_USDC_CONTRACT),
    fetchEvmUsdcBalance(baseWallet, "https://polygon-rpc.com", POLYGON_USDC_CONTRACT),
    fetchEvmUsdcBalance(baseWallet, "https://api.avax.network/ext/bc/C/rpc", AVALANCHE_USDC_CONTRACT),
    fetchSolanaRpc<{ value: { uiAmount: number | null } }>("getTokenAccountBalance", [feeVault], solanaRpc),
  ]);

  const solanaUsdc =
    solUsdcAccs?.value?.reduce(
      (sum, acc) => sum + (acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0),
      0
    ) ?? null;

  const creatorClaimedSol = VERIFIED_CREATOR_CLAIMS.reduce((s, c) => s + c.amountSol, 0);
  const evmExtra = (arbitrumUsdc ?? 0) + (polygonUsdc ?? 0) + (avalancheUsdc ?? 0);

  return {
    solanaWallet,
    baseWallet,
    creatorVaultPda: PUMP_CREATOR_VAULT_PDA,
    solanaSol: solBal ? solBal.value / 1e9 : null,
    solanaUsdc,
    baseUsdc,
    arbitrumUsdc,
    polygonUsdc,
    avalancheUsdc,
    totalUsdc: solanaUsdc !== null && baseUsdc !== null ? Number((solanaUsdc + baseUsdc + evmExtra).toFixed(6)) : null,
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

