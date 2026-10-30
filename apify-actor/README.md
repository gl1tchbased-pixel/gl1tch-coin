# GL1TCH — Solana & EVM Token Safety Scanner, Insider Graph & DeFi Yield X-Ray (Apify Actor)

Official Apify Store Actor for [GL1TCH](https://gl1tchbased.xyz).

## Supported Actions (`input.action`)

- **`scan`**: Full safety & rug-pull report for any Solana or EVM token (`mint`, `chain`).
- **`batch`**: Batch safety check for up to 10 token addresses in one run (`mints`).
- **`yield`**: Live on-chain DeFi yields across 7 chains (`solana`, `ethereum`, `base`, `arbitrum`, `bsc`, `tron`, `robinhood`) with APY source, withdrawable idle liquidity, IL risk, and explainable 0–100 risk score.
- **`deployer`**: Serial rugger & token creator reputation from the GL1TCH Signal Graph.
- **`radar`**: Freshly launched Solana tokens pre-screened for rug vectors and ranked riskiest first.

## Pricing Model
Configured for Apify Store **Pay-Per-Event (PPE)** (`gl1tch-query` event = `$0.005` per item, 80% creator payout). `$GL1TCH` token holders can also pass `apiKey` (`gk_...` or `gl1tch_zkap_...`) for direct priority execution.

