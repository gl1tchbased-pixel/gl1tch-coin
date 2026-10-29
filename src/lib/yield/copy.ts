import type { ApyMethod, YieldChain, YieldKind } from "./types";

/**
 * Words for Yield X-Ray cards: who pays each yield and how you get out. Plain facts about how each protocol
 * works — no "best", no recommendations. Links go to each protocol's own site; GL1TCH never asks for a deposit.
 */

export interface ProtocolCopy {
  name: string;
  url: string;
  income: string;
  exit: string;
  note?: string;
}

const SOL_LST_EXIT =
  "Swap the token back to SOL at market price at any time, or unstake through the pool and wait until the current Solana epoch ends (about a day at today's slot speed).";
const SOL_LST_INCOME =
  "Solana staking rewards: newly issued SOL paid to the validators this pool delegates to, plus any MEV tips they pass on, minus the pool's fee.";
const ETH_LST_EXIT =
  "Swap back to ETH at market price, or request a withdrawal from the protocol and wait in Ethereum's validator exit queue (days to weeks, depending on demand).";
const ETH_LST_INCOME =
  "Ethereum staking rewards: validators earn newly issued ETH for securing the network, plus priority fees and MEV; the protocol keeps a fee.";

export const PROTOCOLS: Record<string, ProtocolCopy> = {
  "aave-v3": {
    name: "Aave v3",
    url: "https://app.aave.com",
    income: "Borrowers pay interest to borrow this asset and suppliers share it. The rate moves with how much of the pool is borrowed.",
    exit: "Withdraw any time while the pool has idle liquidity. When almost everything is borrowed, withdrawals wait until borrowers repay or higher rates pull new deposits in.",
  },
  jito: {
    name: "Jito",
    url: "https://www.jito.network",
    income: "Solana staking rewards plus MEV tips collected by Jito-Solana validators, minus the pool's fee.",
    exit: SOL_LST_EXIT,
  },
  binance: { name: "Binance Staked SOL", url: "https://www.binance.com/en/bnsol", income: SOL_LST_INCOME, exit: SOL_LST_EXIT },
  jupiter: { name: "Jupiter", url: "https://jup.ag", income: SOL_LST_INCOME, exit: SOL_LST_EXIT },
  drift: { name: "Drift", url: "https://www.drift.trade", income: SOL_LST_INCOME, exit: SOL_LST_EXIT },
  helius: { name: "Helius", url: "https://www.helius.dev", income: SOL_LST_INCOME, exit: SOL_LST_EXIT },
  blazestake: { name: "BlazeStake", url: "https://stake.solblaze.org", income: SOL_LST_INCOME, exit: SOL_LST_EXIT },
  lido: { name: "Lido", url: "https://lido.fi", income: ETH_LST_INCOME, exit: ETH_LST_EXIT },
  "rocket-pool": { name: "Rocket Pool", url: "https://rocketpool.net", income: ETH_LST_INCOME, exit: ETH_LST_EXIT },
  coinbase: { name: "Coinbase Wrapped Staked ETH", url: "https://www.coinbase.com/cbeth", income: ETH_LST_INCOME, exit: ETH_LST_EXIT },
  "ether-fi": {
    name: "ether.fi",
    url: "https://www.ether.fi",
    income: ETH_LST_INCOME,
    exit: ETH_LST_EXIT,
    note: "The exchange rate only counts staking rewards. Restaking rewards paid out as other tokens or points are not in this number.",
  },
  sky: {
    name: "Sky (formerly MakerDAO)",
    url: "https://sky.money",
    income: "The Sky Savings Rate: interest set by Sky governance and funded by the protocol's lending and real-world-asset income.",
    exit: "Withdraw to USDS at any time. Governance can change the rate.",
  },
  orca: {
    name: "Orca",
    url: "https://www.orca.so",
    income: "Traders pay a fee on every swap through this pool and liquidity providers share it. The number here is what a full-range position earned in fees, measured from the pool's own fee counter.",
    exit: "Withdraw any time. You get back both tokens in whatever mix the pool holds by then, which is where impermanent loss shows up.",
    note: "Concentrated positions earn more while the price stays in their range and nothing outside it, and they lose more to impermanent loss than a full-range position.",
  },
  "uniswap-v3": {
    name: "Uniswap v3",
    url: "https://app.uniswap.org",
    income: "Traders pay a fee on every swap through this pool and liquidity providers share it (after Uniswap's protocol fee). The number here is what a full-range position earned in fees, measured from the pool's own fee counters.",
    exit: "Withdraw any time. You get back both tokens in whatever mix the pool holds by then, which is where impermanent loss shows up.",
    note: "Concentrated positions earn more while the price stays in their range and nothing outside it, and they lose more to impermanent loss than a full-range position.",
  },
  justlend: {
    name: "JustLend",
    url: "https://justlend.org",
    income: "Borrowers on Tron pay interest to borrow USDT and suppliers share it, minus the market's reserve cut. The rate moves with how much of the pool is borrowed.",
    exit: "Withdraw any time while the market holds idle USDT. When almost everything is borrowed, withdrawals wait for repayments.",
  },
  morpho: {
    name: "Morpho vault",
    url: "https://app.morpho.org",
    income: "A curator lends the vault's money to markets they pick on Morpho. Borrowers pay interest, the curator may take a fee, and the share price rises with what is left.",
    exit: "Withdraw while the vault's markets have free liquidity; if they are fully borrowed, you wait. The curator chooses the markets, so the risk depends on their choices.",
  },
};

/** Curated vault names (the share token's own symbol is terse). */
export const VAULT_NAMES: Record<string, string> = {
  steakUSDG: "Steakhouse USDG",
  nnUSDG: "NetNet Credit",
  "ymvST-USDG": "Yearn Stonk USDG",
  PurintaUSDG: "Purinta USDG",
  sUSDS: "Sky Savings (sUSDS)",
};

export const CHAIN_LABEL: Record<YieldChain, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  bsc: "BNB Chain",
  robinhood: "Robinhood Chain",
  tron: "Tron",
  solana: "Solana",
};

export const KIND_LABEL: Record<YieldKind, string> = {
  lending: "Lending",
  "liquid-staking": "Liquid staking",
  vault: "Vault",
  "dex-lp": "DEX pool",
};

export const METHOD_TEXT: Record<ApyMethod, string> = {
  rate: "Read live from the protocol's own on-chain rate.",
  epoch: "Measured from the pool's growth over the last Solana epoch.",
  growth: "Measured by GL1TCH from the share price's growth between our own hourly snapshots.",
};

/** DEX pools are measured differently from every other kind. */
export const DEX_METHOD_TEXT =
  "Measured by GL1TCH from the pool's own fee counters between our hourly snapshots. The headline is the pool average (all LPs' fees ÷ everything in the pool), the number DEX sites show; the full-range figure is what a set-and-forget position across the whole price range earned.";

export const WINDOW_TEXT: Record<string, string> = {
  live: "live rate",
  epoch: "last epoch",
  "24h": "last 24 h",
  "7d": "last 7 days",
};

export const DISCLAIMER = "Not financial advice. GL1TCH never asks you to sign, deposit or connect anything to read these numbers.";
