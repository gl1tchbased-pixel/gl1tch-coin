# Yield X-Ray (Getiri Röntgeni) — Design

**Date:** 2026-10-29 · **Status:** approved by the founder ("tüm kararlar sende") · **Phase:** Faz 1
**Founder-facing plan (Turkish):** `pasif_gelir/GL1TCH-GETIRI-RONTGENI-PLANI.md` in the main checkout (untracked).

## Intent

The scanner answers "is this token a trap?". Yield X-Ray answers the same question for yield: **where does this APY come from, who pays it, and what am I risking?** Every number is computed from on-chain reads that anyone can repeat, and the page shows the exact RPC request to do so.

## Faz 0 findings that shape the design

- **DefiLlama data is off-limits.** Its Terms of Use (effective 24 June 2025, §7–8, §14) license data for personal, non-commercial use only, forbid republishing "in any form without permission", and set liquidated damages up to USD 100,000 per violation. The site never shows DefiLlama data.
- **Free RPCs serve latest state only.** PublicNode refuses archive calls, wide `eth_getLogs` and `getProgramAccounts`; Robinhood's official RPC has no historical state. So yields that come from an exchange rate are measured from **our own hourly snapshots** (the bot keeps the history). Until 24 h of history exist the opportunity says "measuring".
- **Verified sources (29 Oct 2026):** Aave v3 `getReserveData` on Ethereum, Base, Arbitrum and BSC (pool addresses below; oracle discovered via `ADDRESSES_PROVIDER()` → `getPriceOracle()`); SPL stake-pool accounts on Solana (last-epoch fields give an instant per-epoch APY, JitoSOL measured 4.9%); ETH LST rate getters; ERC-4626 `convertToAssets` on Robinhood Chain Morpho V2 vaults; Chainlink price feeds on Ethereum; GoPlus token security on Robinhood (chain id `4663`, DexScreener id `robinhood`).

## Goals (Faz 1)

1. Bot collects ~30 opportunities hourly across 6 chains, keeps 90+ days of history, serves them on the bridge.
2. Site pages: `/yield` (map), `/yield/[id]` (X-Ray card + calculator + verify-it-yourself), `/yield/staking` (SOL vs ETH staking), `/yield/dollar` (stablecoin yield across chains), `/yield/il` (impermanent-loss playground).
3. Explainable 0–100 risk score (higher = riskier) with reasons and hard warnings.
4. Robinhood Chain added to the token scanner (GoPlus `4663`).

## Non-goals (Faz 1)

DEX LP pools, reward-token analysis, Telegram `/yield`, x402 endpoint, OG images, Tron, Marinade mSOL, wallet X-Ray. (Faz 2+.)

## Anti-goals (never)

- No deposit / stake / bridge / swap buttons, no wallet signatures (the CI grep for fund-moving calls must stay green).
- No affiliate links, no paid placement, no "best"/"recommended" wording; default sort is never "highest APY".
- No invented numbers: unknown → `null` → "unknown" on the page; "measuring" until history exists.
- No DefiLlama data, no ML yield predictions.

## Constraints

- Site copy in English (founder rule); code style matches the repo (bot: ESM TypeScript with `.js` specifiers, no new dependencies; site: Next 16.4 App Router, `params: Promise<…>`, `export const revalidate`).
- Bot reads the Solana RPC from `SOLANA_RPC` when set (Oracle has Helius), else PublicNode.
- Store file follows the existing pattern: `YIELD_FILE` env, else `$RAILWAY_VOLUME_MOUNT_PATH/gl1tch-yield.json`, else `/tmp/gl1tch-yield.json`.

## Left to the builder

Visual layout within the existing design tokens (`container`, `t-eyebrow`, `t-h1`, `--space-*`, `--color-signal`, `--color-danger`), table/filter UX, chart drawing (plain SVG).
