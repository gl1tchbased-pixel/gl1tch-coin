# Solana & EVM Token Safety Scanner and DeFi Yield Check

Check a Solana or EVM token for rug-pull risks before you buy it, list it or send it to your users. Each result gives a verdict, a 0–100 safety score and a plain-language reason, in JSON you can use in a workflow.

Use this Actor when you run a trading bot, a token list, a community or an AI agent, and need a safety check as a step in it.

## What it does

| Action | Input | You get |
|---|---|---|
| `scan` | One token address | Verdict, score, confidence, every check and its evidence, market data |
| `batch` | Up to 10 token addresses | The same for each token |
| `radar` | Nothing | Fresh Solana launches, each with a verdict and a reason |
| `yield` | Optional chain and pool type | On-chain yields on 7 chains: where the APY comes from and how risky it is |

The token checks cover mint and freeze authority, LP lock, honeypot and sell tax, holder concentration, insiders and the deployer's history. Tokens can be on Solana, Ethereum, Base, BNB Chain, Arbitrum or Polygon.

## Input examples

```json
{ "action": "scan", "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }
```

```json
{ "action": "batch", "mints": ["DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"] }
```

```json
{ "action": "yield", "chain": "base", "stableOnly": true }
```

## Output example

```json
{
  "action": "scan",
  "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "chain": "solana",
  "symbol": "Bonk",
  "verdict": "CLEAN",
  "score": 95,
  "confidence": 93,
  "bottomLine": "Verified blue-chip — established, audited and deeply liquid. Managed supply/ownership is by design for this asset, not rug risk."
}
```

Scan items also include the full `checks`, `risks`, `sources` and `meta` fields.

## Pricing

You pay per result, for each token, launch or pool returned, at the price shown on this page. You aren't charged for a token that failed, or for a result marked `degraded`, which means too many data sources were unavailable to trust it.

The same scanner is free at [gl1tchbased.xyz/scan](https://gl1tchbased.xyz/scan), with a free public API. This Actor is for when you want it inside Apify: scheduling, datasets, integrations and billing in one place.

## Limits

- A scan reads contract and market risk. It says nothing about the team or the token's prospects.
- A passing result is not a recommendation or financial advice, and it can't rule out losses.
- Tokens under 24 hours old are never rated CLEAN.
- Heavy use from one Apify IP can hit the API's rate limit of 40 scans a minute. A batch run reports affected tokens as errors, without charging.

## Source

MIT licensed: [github.com/gl1tchbased-pixel/gl1tch-coin](https://github.com/gl1tchbased-pixel/gl1tch-coin). Questions: founder@gl1tchbased.xyz.
