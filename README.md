# GL1TCH — Know Your Agent (KYA)

**The trust layer for the AI-agent economy.** Autonomous agents now hold wallets and transact
on-chain — but nobody can verify one is legit, reputable, or safe to let near funds. GL1TCH
answers that, free, in one call: **identity + on-chain provenance & reputation** for any agent
wallet.

It grew from a free multi-chain token **rug scanner** with a proprietary **Signal Graph**
(cross-scan deployer memory). We pointed the same primitives — verify (identity), Signal Graph
(reputation), scanner (guardrail) — at AI agents.

- 🌐 Site: https://coin-three-mu.vercel.app
- 🪪 Know Your Agent: https://coin-three-mu.vercel.app/agents
- 📖 Developer docs: https://coin-three-mu.vercel.app/agents/docs
- 🤖 Machine-readable (for AI agents): https://coin-three-mu.vercel.app/llms.txt
- 💬 Telegram: https://t.me/gl1tch_infected

## Integrate the guardrail in one call

Free. No key, no auth, no SDK required.

```js
// Before you let an agent transact, check it:
const r = await fetch(
  `https://coin-three-mu.vercel.app/api/agent/check?address=${agentWallet}&chain=solana`
);
const trust = await r.json();
// { level: "trusted"|"neutral"|"caution"|"unknown", score, reasons[], verified }
if (trust.level === "caution") block(trust.reasons[0]);
```

Embed a live trust badge anywhere:

```html
<a href="https://coin-three-mu.vercel.app/agents/solana-<wallet>">
  <img src="https://coin-three-mu.vercel.app/api/agent/badge?address=<wallet>&chain=solana"
       alt="GL1TCH Agent Trust" width="360" height="84" />
</a>
```

Agents self-register by signing a message with their own keypair (proves ownership, moves
nothing) — see [/agents/docs](https://coin-three-mu.vercel.app/agents/docs).

## What's in here

- `src/` — Next.js (App Router) site: the scanner, Rug Radar, Signal Graph, Agent Trust Layer.
- `bot/` — grammY Telegram bot + the durable Signal Graph, Proof-of-Signal, agent registry.
- `remotion/` — brand video pipeline.

## Honest positioning

GL1TCH is a **reputation & provenance signal**, not key custody or a hardware wallet. It never
touches an agent's keys or yours. A verdict is a risk signal, not a guarantee — and never
financial advice. Scanning is free and never gated behind holding the token.

$GL1TCH — Solana · `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump` · 0% tax · mint & freeze revoked.
