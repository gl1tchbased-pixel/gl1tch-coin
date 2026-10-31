# `@gl1tch/agent-toolkit`

**Not on npm yet.** To use it now, copy this folder into your project.

**Solana Agent Kit**, **ElizaOS**, **LangChain / Vercel AI SDK** and **Coinbase x402** tools for GL1TCH:
- Token Safety & Honeypot Scanner (`gl1tch_scan_token`)
- 7-Chain On-Chain DeFi Yield X-Ray (`gl1tch_yield_xray`)
- Serial Deployer Reputation (`gl1tch_deployer_reputation`, paid or with a holder key)
- Rug Radar Launch Feed (`gl1tch_rug_radar`)
- Know Your Agent Wallet Trust (`gl1tch_agent_trust`)

Without a key or x402 payment, the scan, yield, radar and agent tools use GL1TCH's free public API. Deployer reputation, batch scans and random numbers have no free route, so those calls answer `402 Payment Required`.

## Usage with SendAI Solana Agent Kit / LangChain

```js
import { createSolanaAgentKitTools } from "@gl1tch/agent-toolkit";

// Mode A: $GL1TCH Holder Key (Free unlimited x402 access)
const tools = createSolanaAgentKitTools({ apiKey: process.env.GL1TCH_API_KEY });

// Mode B: Pay-per-call via Coinbase x402 (@x402/fetch)
import { wrapFetchWithPayment } from "@x402/fetch";
const paidTools = createSolanaAgentKitTools({
  useX402: true,
  fetch: wrapFetchWithPayment(fetch, x402Client),
});
```

## Usage with ElizaOS (`@elizaos/core`)

```js
import { gl1tchElizaPlugin } from "@gl1tch/agent-toolkit";

export const character = {
  name: "SolanaTrader",
  plugins: [gl1tchElizaPlugin({ apiKey: process.env.GL1TCH_API_KEY })],
};
```

