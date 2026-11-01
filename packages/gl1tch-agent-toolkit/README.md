# `gl1tch-agent-toolkit` (v1.2.0)

Drop-in **Solana Agent Kit**, **ElizaOS**, **LangChain / Vercel AI SDK**, and **Coinbase x402** tools for GL1TCH:
- **Pre-Trade Safety Firewall & Anti-Honeypot Guard** (`gl1tchPreTradeGuard`)
- **Token Safety & Honeypot Scanner** (`gl1tch_scan_token`, `gl1tch_quick_check`)
- **Verifiable drand Quantum Randomness for Raffles & Games** (`drawProvablyFairWinners`, `rollProvablyFairDice`)
- **VIP Rug Radar Live SSE Stream & Incremental Polling** (`createRadarStreamListener`, `gl1tch_rug_radar`)
- **Know Your Agent (KYA / ERC-8004) Wallet Trust** (`verifyAgentTrust`, `gl1tch_agent_trust`)
- **7-Chain On-Chain DeFi Yield X-Ray** (`gl1tch_yield_xray`)
- **Serial Deployer Reputation** (`gl1tch_deployer_reputation`)

```bash
npm install gl1tch-agent-toolkit
```

---

## 1. ElizaOS (`@elizaos/core`) Pre-Trade Guard & Plugin

Add the full GL1TCH plugin to your character to equip it with actions, safety providers, and trade guard evaluators:

```js
import { gl1tchElizaPlugin, gl1tchPreTradeGuard } from "gl1tch-agent-toolkit";

export const character = {
  name: "SolanaTrader",
  plugins: [
    gl1tchElizaPlugin({
      // Optional: use holder key for free unlimited access
      apiKey: process.env.GL1TCH_API_KEY,
    }),
  ],
};
```

### Direct Pre-Trade Guardrail (Intercept Swaps & Buys)

Halt trade execution if the target token is a honeypot, has LP unlocked, or safety score is below your threshold:

```js
const guard = await gl1tchPreTradeGuard("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", {
  minScore: 70, // 0-100 threshold
  rejectHoneypot: true,
});

if (!guard.approved) {
  console.warn("Trade rejected by GL1TCH:", guard.reason);
} else {
  console.log("Safe to execute:", guard.details.verdict);
}
```

---

## 2. SendAI Solana Agent Kit / LangChain

```js
import { createSolanaAgentKitTools } from "gl1tch-agent-toolkit";

// Mode A: $GL1TCH Holder Key (Free unlimited x402 access)
const tools = createSolanaAgentKitTools({ apiKey: process.env.GL1TCH_API_KEY });

// Mode B: Pay-per-call via Coinbase x402 (@x402/fetch)
import { wrapFetchWithPayment } from "@x402/fetch";
const paidTools = createSolanaAgentKitTools({
  useX402: true,
  fetch: wrapFetchWithPayment(fetch, x402Client),
});
```

---

## 3. Provably Fair drand Quantum Randomness (Giveaways, Raffles & Games)

Deterministically select winners using League of Entropy (drand BLS12-381) threshold beacon:

```js
import { drawProvablyFairWinners, rollProvablyFairDice } from "gl1tch-agent-toolkit";

// Pick 3 winners from 500 giveaway participants
const result = await drawProvablyFairWinners({
  participants: ["alice.sol", "bob.sol", "charlie.sol" /* ... */],
  count: 3,
  salt: "community-giveaway-november-2026",
});

console.log("Winners:", result.winners);
console.log("On-Chain Proof:", result.proofUrl);
console.log("drand Signature:", result.signature);
```

---

## 4. VIP Rug Radar Live SSE Stream

Stream freshly launched Solana tokens in real-time, filtered by minimum safety criteria:

```js
import { createRadarStreamListener } from "gl1tch-agent-toolkit";

const listener = createRadarStreamListener({
  key: process.env.GL1TCH_API_KEY, // VIP rate limit
  filter: { minScore: 60, cleanOnly: false },
  onToken: (token) => {
    console.log("New launch spotted:", token.mint, token.verdict, token.score);
  },
  onError: (err) => console.error("Stream error:", err),
});

// To disconnect:
// listener.close();
```

---

## 5. Know Your Agent (KYA / ERC-8004) Verification

Check another AI agent's trustworthiness before sending funds:

```js
import { verifyAgentTrust } from "gl1tch-agent-toolkit";

const trust = await verifyAgentTrust({
  address: "AgentWalletAddressHere",
  requiredLevel: "neutral", // "trusted" | "neutral" | "caution"
});

if (trust.isTrusted) {
  console.log("Agent verified! Trust score:", trust.score);
}
```

---

## License

MIT © [GL1TCH](https://gl1tchbased.xyz)
