/**
 * RPC Truth Monitor — the free, keyless public endpoints we measure. Only URLs that providers advertise for
 * open use (provider docs / Chainlist). `provider` groups URLs run by the same operator: agreement between two
 * URLs of one provider never counts as independent confirmation.
 */

export type TruthChain = "solana" | "ethereum" | "base" | "bsc" | "arbitrum" | "polygon";
export type EvmTruthChain = Exclude<TruthChain, "solana">;

export interface Endpoint {
  /** Stable id used in URLs and history: `<chain>:<provider>[-n]`. */
  id: string;
  chain: TruthChain;
  provider: string;
  url: string;
}

export const CHAIN_IDS: Record<EvmTruthChain, number> = { ethereum: 1, base: 8453, bsc: 56, arbitrum: 42161, polygon: 137 };

/** Circle USDC on each chain: transfers every minute on every chain, so any one-minute window has logs. */
export const CANARY_TOKEN: Record<EvmTruthChain, string> = {
  ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  bsc: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  arbitrum: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  polygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
};

export const CHAIN_LABEL: Record<TruthChain, string> = {
  solana: "Solana",
  ethereum: "Ethereum",
  base: "Base",
  bsc: "BNB Chain",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
};

const E = (chain: TruthChain, provider: string, url: string, n = ""): Endpoint => ({ id: `${chain}:${provider}${n}`, chain, provider, url });

export const ENDPOINTS: Endpoint[] = [
  E("solana", "solana-foundation", "https://api.mainnet-beta.solana.com"),
  E("solana", "solana-foundation", "https://api.mainnet.solana.com", "-2"),
  E("solana", "publicnode", "https://solana-rpc.publicnode.com"),

  E("ethereum", "publicnode", "https://ethereum-rpc.publicnode.com"),
  E("ethereum", "tenderly", "https://gateway.tenderly.co/public/mainnet"),
  E("ethereum", "mevblocker", "https://rpc.mevblocker.io"),
  E("ethereum", "flashbots", "https://rpc.flashbots.net"),
  E("ethereum", "drpc", "https://eth.drpc.org"),
  E("ethereum", "1rpc", "https://1rpc.io/eth"),
  E("ethereum", "cloudflare", "https://cloudflare-eth.com"),
  E("ethereum", "blastapi", "https://eth-mainnet.public.blastapi.io"),
  E("ethereum", "meowrpc", "https://eth.meowrpc.com"),
  E("ethereum", "tatum", "https://ethereum-mainnet.gateway.tatum.io"),

  E("base", "base", "https://mainnet.base.org"),
  E("base", "publicnode", "https://base-rpc.publicnode.com"),
  E("base", "tenderly", "https://gateway.tenderly.co/public/base"),
  E("base", "drpc", "https://base.drpc.org"),
  E("base", "1rpc", "https://1rpc.io/base"),
  E("base", "thirdweb", "https://8453.rpc.thirdweb.com"),
  E("base", "blastapi", "https://base-mainnet.public.blastapi.io"),
  E("base", "meowrpc", "https://base.meowrpc.com"),

  E("bsc", "bnbchain", "https://bsc-dataseed.bnbchain.org"),
  E("bsc", "defibit", "https://bsc-dataseed1.defibit.io"),
  E("bsc", "publicnode", "https://bsc-rpc.publicnode.com"),
  E("bsc", "thirdweb", "https://56.rpc.thirdweb.com"),
  E("bsc", "drpc", "https://bsc.drpc.org"),
  E("bsc", "1rpc", "https://1rpc.io/bnb"),
  E("bsc", "blastapi", "https://bsc-mainnet.public.blastapi.io"),
  E("bsc", "meowrpc", "https://bsc.meowrpc.com"),
  E("bsc", "blockrazor", "https://bsc.blockrazor.xyz"),

  E("arbitrum", "arbitrum", "https://arb1.arbitrum.io/rpc"),
  E("arbitrum", "publicnode", "https://arbitrum-one-rpc.publicnode.com"),
  E("arbitrum", "tenderly", "https://gateway.tenderly.co/public/arbitrum"),
  E("arbitrum", "drpc", "https://arbitrum.drpc.org"),
  E("arbitrum", "1rpc", "https://1rpc.io/arb"),
  E("arbitrum", "thirdweb", "https://42161.rpc.thirdweb.com"),
  E("arbitrum", "blastapi", "https://arbitrum-one.public.blastapi.io"),
  E("arbitrum", "meowrpc", "https://arbitrum.meowrpc.com"),

  E("polygon", "publicnode", "https://polygon-bor-rpc.publicnode.com"),
  E("polygon", "tenderly", "https://gateway.tenderly.co/public/polygon"),
  E("polygon", "drpc", "https://polygon.drpc.org"),
  E("polygon", "1rpc", "https://1rpc.io/matic"),
  E("polygon", "thirdweb", "https://137.rpc.thirdweb.com"),
];

export const TRUTH_CHAINS: TruthChain[] = ["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"];

/** How far back each history probe looks. */
export const DEPTHS = [
  { id: "1h", seconds: 3_600 },
  { id: "1d", seconds: 86_400 },
  { id: "7d", seconds: 7 * 86_400 },
  { id: "30d", seconds: 30 * 86_400 },
] as const;
export type DepthId = (typeof DEPTHS)[number]["id"];

/** Block spans tried for the eth_getLogs range limit (with a filter that matches almost nothing). */
export const LOG_SPANS = [1_000, 10_000, 50_000, 100_000] as const;
