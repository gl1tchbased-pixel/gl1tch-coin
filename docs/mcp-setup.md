# GL1TCH MCP Server Setup Guide

> **Endpoint:** `https://gl1tchbased.xyz/api/mcp`  
> **Protocol:** Model Context Protocol (Streamable HTTP / SSE)  
> **Pricing:** Free (rate-limited per IP, 60 req/min). For high volume, see [x402 Paid API](../src/app/agents/docs).

Connect your AI agent, Claude Desktop, or Cursor IDE to GL1TCH's real-time risk intelligence, token scanning, agent verification, deployer reputation, and DeFi yield analysis tools.

---

## 🛠 Available Tools

| Tool Name | Description | Parameters |
|---|---|---|
| `scan_token` | Pre-trade token safety check for Solana & EVM. Returns verdict, 0-100 safety score, LP lock status, mint/freeze authority, and insider flags. | `mint` (required, string), `chain` (optional: solana, ethereum, base, bsc, arbitrum, etc.) |
| `check_agent_wallet` | Know Your Agent (KYA): checks AI-agent wallet identity, signature verification, and on-chain track record. | `address` (required, string), `chain` (optional, default `solana`) |
| `deployer_reputation` | Cross-scan deployer track record from the GL1TCH Signal Graph: flags serial ruggers across tokens. | `address` (required, string), `chain` (optional, default `solana`) |
| `xray_yield` | DeFi yield pool X-Ray across Solana & EVM protocols (Kamino, Marinade, Jito, Aave, Lido, etc.): splits advertised APY into real yield vs token-emission APY, scores sustainability (0–100), and flags incentive cliffs or thin TVL. | `chain` (optional: `all`, `solana`, `ethereum`, `arbitrum`, `base`), `kind` (optional: `all`, `lending`, `liquid-staking`, `dex-lp`, `vault`), `stableOnly` (optional, boolean) |

---

## 💻 Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gl1tch": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://gl1tchbased.xyz/api/mcp"
      ]
    }
  }
}
```

---

## ⚡ Cursor IDE Configuration

In Cursor, navigate to **Settings** → **Features** → **MCP Servers** → **Add New MCP Server**:

* **Name:** `gl1tch`
* **Type:** `command`
* **Command:** `npx -y mcp-remote https://gl1tchbased.xyz/api/mcp`

Or in `.cursor/mcp.json` at your project root:

```json
{
  "mcpServers": {
    "gl1tch": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://gl1tchbased.xyz/api/mcp"]
    }
  }
}
```

---

## 🤖 Direct Agent Frameworks (LangChain, AutoGen, LlamaIndex)

Any MCP-compatible client can connect directly via Streamable HTTP:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(
  new URL("https://gl1tchbased.xyz/api/mcp")
);

const client = new Client(
  { name: "my-trading-agent", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

// List tools
const tools = await client.listTools();

// Call scan_token
const result = await client.callTool({
  name: "scan_token",
  arguments: {
    mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
    chain: "solana"
  }
});

console.log(result.content[0].text);
```

---

## 🛡 Rate Limits & High-Throughput Access

* The public MCP endpoint allows **60 requests/minute per IP address**.
* If your trading bot or agent pipeline requires higher limits, you can use the pay-per-call **x402 endpoints** in USDC on Solana or Base (`/api/x402/scan`, `/api/x402/yield`, etc.), or mint a holder key via `$GL1TCH` holding.
