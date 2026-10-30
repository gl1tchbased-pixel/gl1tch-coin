# `@gl1tch/agent-toolkit`

Drop-in **Solana Agent Kit**, **ElizaOS**, **LangChain / Vercel AI SDK**, and **Coinbase x402** tools for GL1TCH:
- Token Safety & Honeypot Scanner (`gl1tch_scan_token`)
- 7-Chain On-Chain DeFi Yield X-Ray (`gl1tch_yield_xray`) — Ranked **#2 on Coinbase x402 Bazaar** for Solana Yield
- Serial Deployer Reputation (`gl1tch_deployer_reputation`)
- Rug Radar Launch Feed (`gl1tch_rug_radar`)
- Know Your Agent Wallet Trust (`gl1tch_agent_trust`) — Ranked **#2 on Coinbase x402 Bazaar** for Agent Wallet Trust

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

