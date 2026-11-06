# Solana Honeypot Scanner, DexScreener & Pump.fun Token Safety API

Sub-second, production-grade token safety scanner and honeypot detector for **Solana (SPL / Token-2022 / Pump.fun)** and **EVM chains (Base, Ethereum, BSC, Arbitrum, Polygon)**. 

Designed for **algorithmic trading bots, hedge funds, quants, token listing bots, and autonomous AI agents** needing real-time pre-trade risk evaluation before executing swaps.

---

## 🎯 Use Cases & Alternatives

* **RugCheck API & Birdeye Alternative:** Batch scan token contracts for unlocked LP, mint authority, and freeze authority.
* **DexScreener & Pump.fun Scraper:** Real-time stream of fresh memecoin launches on Solana ranked by rug risk.
* **Algorithmic Trading Bot Pre-Trade Guard:** Reject honeypots, transfer-tax traps, and developer dump risks automatically.
* **Multi-Chain DeFi Yield X-Ray:** Verify on-chain APY, TVL, and impermanent loss risk across 7 blockchains (Aave v3, Morpho, Kamino, Raydium, etc.).

---

## ⚡ What it does

| Action | Input | Output / Features |
|---|---|---|
| `scan` | Single token mint/contract | Safety score (0–100), verdict (CLEAN to RUG-SHAPED), LP lock %, mint/freeze authority, top 10 holder concentration, insider clusters, deployer history. |
| `batch` | Up to 10 token addresses | High-throughput multi-token screening with one API call. |
| `radar` | Optional timestamp cursor | Live Solana Rug Radar: newly launched tokens on pump.fun & Raydium ranked riskiest first. |
| `yield` | Optional chain / pool filter | Deep DeFi Yield audit across 7 chains: APY sources, idle liquidity, smart contract risk. |

---

## 🛠️ Input Examples

### 1. Single Token Honeypot & Rug Check (Solana / EVM)
```json
{
  "action": "scan",
  "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "chain": "solana"
}
```

### 2. High-Throughput Watchlist Batch Scan
```json
{
  "action": "batch",
  "mints": [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
  ]
}
```

### 3. Fresh Solana Launches (Rug Radar Feed)
```json
{
  "action": "radar"
}
```

---

## 📊 Output Schema Example

```json
{
  "action": "scan",
  "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "chain": "solana",
  "symbol": "Bonk",
  "verdict": "CLEAN",
  "score": 95,
  "confidence": 93,
  "bottomLine": "Verified blue-chip — established, audited and deeply liquid. No rug risk.",
  "checks": [
    { "key": "mint_authority", "status": "pass", "value": "REVOKED" },
    { "key": "freeze_authority", "status": "pass", "value": "REVOKED" },
    { "key": "lp_lock", "status": "pass", "value": "100% LOCKED" },
    { "key": "top_holder", "status": "pass", "value": "9.0%" }
  ]
}
```

---

## 🐍 Python & Node.js Integration

### Python (Trading Bot Guard)
```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_APIFY_TOKEN")
run = client.actor("gl1tch-pixel/gl1tch-token-safety-scanner").call(run_input={
    "action": "scan",
    "mint": "BNpRagRShfkNd9hg3QRDWuJADH7j187jViNTnHMvhWL5",
    "chain": "solana"
})

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    if item["verdict"] in ["HIGH RISK", "RUG-SHAPED"]:
        print(f"ABORT TRADE: {item['symbol']} is risky! Reason: {item['bottomLine']}")
    else:
        print(f"SAFE TO TRADE: {item['symbol']} Score: {item['score']}")
```

---

## 💰 Pay-Per-Event Pricing

* Flat **$0.005** per delivered scan result.
* **Zero charge** on network errors or unreadable tokens.
* Public web version and documentation available at [gl1tchbased.xyz](https://gl1tchbased.xyz).
