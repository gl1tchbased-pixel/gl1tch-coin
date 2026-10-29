import { encodeCall } from "./abi.js";

/**
 * Yield X-Ray's curated list: every opportunity GL1TCH measures, with the contract it reads. Addresses were
 * verified on-chain on 2026-10-29 (Faz 0). Adding an entry here is the whole job of covering a new market.
 */

export type YieldChain = "ethereum" | "base" | "arbitrum" | "bsc" | "robinhood" | "solana";
export type EvmChain = Exclude<YieldChain, "solana">;

/** Public, key-less endpoints, tried in order. */
export const EVM_RPC: Record<EvmChain, string[]> = {
  ethereum: ["https://ethereum-rpc.publicnode.com"],
  base: ["https://base-rpc.publicnode.com"],
  arbitrum: ["https://arbitrum-one-rpc.publicnode.com"],
  bsc: ["https://bsc-rpc.publicnode.com"],
  robinhood: ["https://robinhood-rpc.publicnode.com", "https://rpc.mainnet.chain.robinhood.com"],
};
export const SOLANA_PUBLIC_RPC = "https://solana-rpc.publicnode.com";

export interface AaveAsset {
  symbol: string;
  address: string;
  stable: boolean;
}

/** Aave v3 Pool per chain; the price oracle is discovered on-chain through ADDRESSES_PROVIDER(). BTC/BNB markets are
 *  left out: they are collateral markets paying ~0% to suppliers, not yield. */
export const AAVE: { chain: EvmChain; pool: string; assets: AaveAsset[] }[] = [
  {
    chain: "ethereum",
    pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    assets: [
      { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", stable: true },
      { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", stable: true },
      { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", stable: false },
    ],
  },
  {
    chain: "base",
    pool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    assets: [
      { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", stable: true },
      { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", stable: false },
    ],
  },
  {
    chain: "arbitrum",
    pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    assets: [
      { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", stable: true },
      { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", stable: true },
      { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", stable: false },
    ],
  },
  {
    chain: "bsc",
    pool: "0x6807dc923806fE8Fd134338EABCA509979a7e0cB",
    assets: [
      { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", stable: true },
      { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", stable: true },
    ],
  },
];

/** Solana liquid-staking pools (SPL stake-pool layout; JupSOL/dSOL/hSOL run on Sanctum's forks). */
export const SPL_POOLS: { protocol: string; symbol: string; mint: string; pool: string }[] = [
  { protocol: "jito", symbol: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", pool: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb" },
  { protocol: "binance", symbol: "BNSOL", mint: "BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85", pool: "Hr9pzexrBge3vgmBNRR8u42CNQgBXdHm4UkUN2DH4a7r" },
  { protocol: "jupiter", symbol: "JupSOL", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", pool: "8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr" },
  { protocol: "drift", symbol: "dSOL", mint: "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ", pool: "9mhGNSPArRMHpLDMSmxAvuoizBqtBGqYdT8WGuqgxNdn" },
  { protocol: "helius", symbol: "hSOL", mint: "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A", pool: "3wK2g8ZdzAH8FJ7PKr2RcvGh7V9VYson5hrVsJM5Lmws" },
  { protocol: "blazestake", symbol: "bSOL", mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", pool: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi" },
];

export interface RateAsset {
  chain: EvmChain;
  protocol: string;
  kind: "liquid-staking" | "vault";
  symbol: string;
  /** The receipt token / vault share contract. */
  address: string;
  /** eth_call data returning the exchange rate (underlying per 1 share) as one word. */
  rateCall: string;
  rateDecimals: number;
  tvl: { kind: "supply-x-rate"; base: "ETH" } | { kind: "total-assets"; assetDecimals: number; base: "USD" };
  asset: { symbol: string; address: string; decimals: number };
}

const ONE_SHARE = "0xde0b6b3a7640000"; // 1e18
const MILLION_SHARES = "0xd3c21bcecceda1000000"; // 1e24
const convertToAssets1e18 = encodeCall("0x07a2d13a", ONE_SHARE);
// A 6-decimal asset quotes one share to only 1e-6, too coarse for a daily growth reading; a million shares gives 1e-12.
const convertToAssets1e24 = encodeCall("0x07a2d13a", MILLION_SHARES);
const ETH_NATIVE = { symbol: "ETH", address: "native", decimals: 18 };
const USDG = { symbol: "USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 };
const morphoUsdg = (symbol: string, address: string): RateAsset => ({
  chain: "robinhood",
  protocol: "morpho",
  kind: "vault",
  symbol,
  address,
  rateCall: convertToAssets1e24,
  rateDecimals: 12,
  tvl: { kind: "total-assets", assetDecimals: 6, base: "USD" },
  asset: USDG,
});

/** Yields that show up as a rising exchange rate; the bot measures them from its own hourly snapshots. */
export const RATE_ASSETS: RateAsset[] = [
  { chain: "ethereum", protocol: "lido", kind: "liquid-staking", symbol: "wstETH", address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", rateCall: "0x035faf82", rateDecimals: 18, tvl: { kind: "supply-x-rate", base: "ETH" }, asset: ETH_NATIVE },
  { chain: "ethereum", protocol: "rocket-pool", kind: "liquid-staking", symbol: "rETH", address: "0xae78736Cd615f374D3085123A210448E74Fc6393", rateCall: "0xe6aa216c", rateDecimals: 18, tvl: { kind: "supply-x-rate", base: "ETH" }, asset: ETH_NATIVE },
  { chain: "ethereum", protocol: "coinbase", kind: "liquid-staking", symbol: "cbETH", address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", rateCall: "0x3ba0b9a9", rateDecimals: 18, tvl: { kind: "supply-x-rate", base: "ETH" }, asset: ETH_NATIVE },
  { chain: "ethereum", protocol: "ether-fi", kind: "liquid-staking", symbol: "weETH", address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee", rateCall: "0x679aefce", rateDecimals: 18, tvl: { kind: "supply-x-rate", base: "ETH" }, asset: ETH_NATIVE },
  { chain: "ethereum", protocol: "sky", kind: "vault", symbol: "sUSDS", address: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD", rateCall: convertToAssets1e18, rateDecimals: 18, tvl: { kind: "total-assets", assetDecimals: 18, base: "USD" }, asset: { symbol: "USDS", address: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", decimals: 18 } },
  morphoUsdg("steakUSDG", "0xBeEff033F34C046626B8D0A041844C5d1A5409dd"),
  morphoUsdg("nnUSDG", "0x99347d5F70D3838763f6Bddcf80304C8aa953B57"),
  morphoUsdg("ymvST-USDG", "0x8c258F25fc6fBe3f01ccC828E2C3840A46a4a9A2"),
  morphoUsdg("PurintaUSDG", "0x37788ff0c1d4e45A7FE06BC7e71e0cc00121d0A8"),
];

/** Chainlink USD feeds on Ethereum (8 decimals). */
export const CHAINLINK: Record<"ETH" | "SOL" | "BTC" | "BNB" | "USDC", string> = {
  ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  SOL: "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  BTC: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  BNB: "0x14e613AC84a31f709eadbdF89C6CC390fDc9540A",
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
};

export function opportunityId(chain: YieldChain, protocol: string, symbol: string): string {
  return `${chain}-${protocol}-${symbol}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The public endpoint printed in "verify it yourself" blocks — never the bot's private SOLANA_RPC. */
export function rpcUrlFor(chain: YieldChain): string {
  return chain === "solana" ? SOLANA_PUBLIC_RPC : EVM_RPC[chain][0];
}

export interface DexToken {
  symbol: string;
  address: string;
  decimals: number;
}

/** Concentrated-liquidity pools whose fee APR GL1TCH measures from the pools' own cumulative fee counters.
 *  tokenA/tokenB follow the pool's own order (Orca mint_a/mint_b, Uniswap token0/token1). */
export interface DexPool {
  chain: YieldChain;
  protocol: "orca" | "uniswap-v3";
  symbol: string;
  pool: string;
  tokenA: DexToken;
  tokenB: DexToken;
  /** Which side has a Chainlink USD price. */
  price: { side: "a" | "b"; key: "ETH" | "SOL" | "USDC" };
  /** Tokens that track each other (e.g. an LST and its coin): low impermanent-loss exposure. */
  correlated: boolean;
}

const WSOL = { symbol: "SOL", address: "So11111111111111111111111111111111111111112", decimals: 9 };
export const DEX_POOLS: DexPool[] = [
  { chain: "solana", protocol: "orca", symbol: "JitoSOL-SOL", pool: "Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp", tokenA: WSOL, tokenB: { symbol: "JitoSOL", address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", decimals: 9 }, price: { side: "a", key: "SOL" }, correlated: true },
  { chain: "solana", protocol: "orca", symbol: "SOL-USDC", pool: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE", tokenA: WSOL, tokenB: { symbol: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 }, price: { side: "b", key: "USDC" }, correlated: false },
  { chain: "ethereum", protocol: "uniswap-v3", symbol: "USDC-WETH", pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", tokenA: { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 }, tokenB: { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 }, price: { side: "a", key: "USDC" }, correlated: false },
  { chain: "base", protocol: "uniswap-v3", symbol: "WETH-USDC", pool: "0xd0b53D9277642d899DF5C87A3966A349A798F224", tokenA: { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 }, tokenB: { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 }, price: { side: "b", key: "USDC" }, correlated: false },
];
