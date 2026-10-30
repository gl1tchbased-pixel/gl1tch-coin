---
name: gl1tch-token-safety
description: "Check a Solana or EVM token for rug-pull and honeypot risk with GL1TCH before buying, swapping into, listing or recommending it; screen new Solana launches (Rug Radar); look up who deployed a token and what else they launched; check an AI-agent wallet's trust; X-Ray DeFi yield pools (real yield vs emissions). Free endpoints need no key; pay-per-call x402 endpoints (USDC on Solana or Base) skip the shared rate limit. Use when the user asks whether a token or DeFi yield pool is safe, a rug, a honeypot, or who launched it."
---

# GL1TCH token safety

GL1TCH scans a token's contract and market and returns a verdict: CLEAN, LOW RISK, CAUTION,
HIGH RISK, RUG-SHAPED (or UNKNOWN when too little could be read), with a 0-100 safety score and
the checks behind it. Chains: Solana, Ethereum, Base, BSC, Arbitrum, Polygon.

A verdict is a risk signal, not financial advice. CLEAN means no rug-pull flags were found; it
does not mean a token is a good buy. Say that when you report a result.

## Validate input first

- Solana address: base58, 32-44 characters (`^[1-9A-HJ-NP-Za-km-z]{32,44}$`).
- EVM address: `^0x[0-9a-fA-F]{40}$`.
- Chain, when given: one of `solana`, `ethereum`, `base`, `bsc`, `arbitrum`, `polygon`.

Reject anything else before building a URL. Never put unvalidated text into a shell command.

## Free (no key, rate-limited per IP)

```bash
# Full token report
curl -s "https://gl1tchbased.xyz/api/scan?mint=<address>&chain=solana"

# Rug Radar: the riskiest new Solana launches of the latest sweep
curl -s "https://gl1tchbased.xyz/api/radar"

# Trust check for an agent wallet
curl -s "https://gl1tchbased.xyz/api/agent/check?address=<wallet>&chain=solana"

# Yield X-Ray: real yield vs emissions across top DeFi pools
curl -s "https://gl1tchbased.xyz/api/yield"
```

## Pay per call (x402, no signup)

The same checks without the shared rate limit, paid in USDC on Solana or Base. A call that
fails or can't read its sources returns an error and costs nothing.

| Endpoint | Price | Returns |
| --- | --- | --- |
| `/api/x402/quick?mint=<address>` | $0.001 | verdict, score, failed/warned checks, liquidity, LP lock, top holder |
| `/api/x402/scan?mint=<address>` | $0.005 | the full report, every check explained |
| `/api/x402/batch?mints=<a>,<b>,…` | $0.008 | up to 10 tokens, each as a quick check |
| `/api/x402/verdict?mint=<address>` | $0.01 | short card for chats and feeds: grade, top 3 reasons, card image |
| `/api/x402/radar?since=<cursor>` | $0.002 | new Solana launches ranked riskiest first; pass back `cursor` as `since` |
| `/api/x402/deployer?address=<wallet>` | $0.003 | a creator wallet's launches and how many scanned as high risk |
| `/api/x402/agent?address=<wallet>` | $0.01 | Know Your Agent trust score for a wallet |
| `/api/x402/yield?chain=solana` | $0.003 | DeFi Yield X-Ray: real yield vs emissions, sustainability score & risk flags |
| `/api/x402/random?min=1&max=100` | $0.003 | verifiable random integers seeded by a future drand threshold-BLS round |

With the Coinbase agentic wallet (`awal`), cap the payment with `--max-amount` (USDC atomic
units, 1000 = $0.001):

```bash
npx awal@2.12.1 x402 pay "https://gl1tchbased.xyz/api/x402/quick?mint=<address>" --max-amount 1000 --json
```

Any other x402 client works too: the first request answers `402 Payment Required` with the
price; the client pays and retries.

## Reading the result

- Lead with the verdict and score, then the failed checks (`status: "fail"`), then warnings.
- `mint_authority` / `freeze_authority` ACTIVE: the creator can still mint more or freeze holders.
- `lp_lock` low: the liquidity can be pulled.
- `sell_tax` / `honeypot` (EVM): selling may be blocked or taxed.
- A token less than a day old is never graded CLEAN.
- Full docs: https://gl1tchbased.xyz/agents/docs · machine-readable summary: https://gl1tchbased.xyz/llms.txt
