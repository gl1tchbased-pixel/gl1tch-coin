# GL1TCH — crypto risk intelligence you can verify yourself

**A free, non-custodial risk-intelligence platform on Solana — with a required-utility token.**
GL1TCH reads every rug, remembers every deployer, scores every AI agent, and runs
provably-fair randomness anyone can verify. The human-facing tools are free; holding **$GL1TCH**
unlocks programmatic depth. Nothing here ever takes custody of your funds or your keys.

The team is anonymous — so we don't ask you to trust us. **Everything is verifiable:** the code is
open, every wallet is public, and every draw, random result, and risk verdict is recomputable on
your own device.

- 🌐 Site: https://coin-three-mu.vercel.app
- 🛡 Free token scanner: https://coin-three-mu.vercel.app/scan
- ⚛️ Quantum Core: https://coin-three-mu.vercel.app/quantum-core
- 🎲 Verifiable randomness: https://coin-three-mu.vercel.app/quantum-core/random
- 🪪 Know Your Agent: https://coin-three-mu.vercel.app/agents
- 💹 Why hold $GL1TCH (honest investment case): https://coin-three-mu.vercel.app/token
- 📄 Whitepaper: https://coin-three-mu.vercel.app/whitepaper
- 💬 Telegram: https://t.me/gl1tch_infected

---

## What GL1TCH ships (all live, all non-custodial)

| Product | What it does |
| --- | --- |
| **Scanner** | Free multi-chain token-safety scanner (web + Telegram): authority/custody checks, liquidity, deployer history, an AI verdict, verified blue-chips, compare, shareable cards + embeddable badge. |
| **Signal Graph** | Proprietary cross-scan deployer-reputation memory — every scan compounds a track record that flags serial ruggers across tokens. |
| **Know Your Agent (KYA)** | Trust layer for the AI-agent economy: identity + on-chain provenance & reputation for any agent wallet, mapped to the ERC-8004 shape. |
| **Quantum Core** | Five working, honestly-labelled components: **Vault** (readiness score), **Draw** (NIST-CURBy verifiable quantum randomness), **Seal** (X25519 + ML-KEM-768 hybrid post-quantum encryption), **Forge** (quantum-inspired optimizer), **Randomness** (below). |
| **Verifiable Randomness + Allocation** | Provably-fair RNG-as-a-service seeded by the drand beacon — commit to a future round, reveal on maturity, verify in your browser. Run provably-fair giveaways/whitelists with a shareable proof. |

## Verify, don't trust

This is the whole point, and the anonymous-team trust substitute:

- **Provably-fair draws.** A winner is a pure function of a *pre-committed* frozen entry list and a
  *future* beacon value nobody can know at commit time: `winner = sha256(pulse ‖ merkleRoot) mod n`.
  Recompute it yourself from public data.
- **Verifiable randomness.** Every result ships with its drand round + BLS signature. The site
  BLS-verifies the seed **and** re-derives the output in *your* browser — zero trust in GL1TCH.
- **Two independent randomness sources.** NIST CURBy (quantum) for reward draws; drand
  (threshold-BLS) for the reward-free Randomness API — fully verified client-side.
- **Tamper-evident Beacon.** Every event is hash-chained; any edit or deletion breaks the chain,
  and the chain is recomputed in your browser.
- **Executable spec of correctness.** The two independent implementations (site + bot) are held
  byte-identical by locked test vectors, and the security invariants (non-custodial, unbiased
  fairness, tamper-evidence) are enforced as tests. See
  [`gl1tch-value-accrual-and-audit-readiness.md`](./gl1tch-value-accrual-and-audit-readiness.md).

## Integrate it — free, one call each

**Check an AI agent before it transacts** (no key, no auth):

```js
const r = await fetch(`https://coin-three-mu.vercel.app/api/agent/check?address=${agentWallet}&chain=solana`);
const trust = await r.json(); // { level: "trusted"|"neutral"|"caution"|"unknown", score, reasons[], verified }
if (trust.level === "caution") block(trust.reasons[0]);
```

**Scan a token** (free per-IP; higher throughput with a $GL1TCH-gated key via `x-gl1tch-key`):

```js
const r = await fetch(`https://coin-three-mu.vercel.app/api/scan?mint=${mint}&chain=solana`);
const report = await r.json(); // { verdict, score, checks[], meta, aiVerdict, ... }
```

**Run provably-fair randomness / a giveaway** (holder-gated — mint a key at `/token`):

```js
// 1) commit
const req = await fetch("https://coin-three-mu.vercel.app/api/random/request", {
  method: "POST",
  headers: { "content-type": "application/json", "x-gl1tch-key": "gk_…" },
  body: JSON.stringify({ labels: ["alice", "bob", "carol"], winners: 1 }), // or { spec: {...} }
}).then((x) => x.json()); // → { id, status:"pending", targetRound, availableInMs }

// 2) reveal (public — anyone can read + verify)
const res = await fetch(`https://coin-three-mu.vercel.app/api/random/${req.id}`).then((x) => x.json());
// → { status:"fulfilled", winners:[…], proof:{ round, randomness, signature } }
```

Embed a live "Provably fair by GL1TCH" badge, or a token-scan badge:

```html
<img src="https://coin-three-mu.vercel.app/api/random/badge?id=<id>" alt="Provably fair by GL1TCH" height="42" />
```

## Repo layout

- `src/` — Next.js (App Router) site: scanner, Rug Radar, Signal Graph, Agent Trust, Quantum Core,
  Verifiable Randomness + Allocation, the investment case (`/token`), whitepaper, learn center.
- `bot/` — grammY Telegram bot + durable stores (Signal Graph, Proof-of-Signal, agent registry,
  Quantum Core Draw executor, Randomness service, metered API keys) on a Railway volume — no DB.
- `remotion/` — brand video pipeline.
- `gl1tch-quantum-core-spec.md`, `gl1tch-value-accrual-and-audit-readiness.md` — specs of record.

## The token — required utility, honest value accrual

$GL1TCH is engineered to be *required*, not decorative: the free human tools are the funnel;
holding unlocks programmatic/bulk API throughput, verifiable randomness + allocation, Signal Graph
history, and sustained-holding rank tiers. A useful product doesn't automatically make a valuable
token — so value accrual is a separate, **engineered and honestly-staged** pillar (route real
revenue to holders via a fee→buyback / fee-share mechanism, activating only on real revenue + a
third-party audit). We never claim "usage magically pumps the price." See
[`/token`](https://coin-three-mu.vercel.app/token) for the radically-honest investment case.

## Honest positioning

GL1TCH is a **reputation, provenance & verifiability layer** — never key custody, never a
fund-moving signature, never invented metrics. Verdicts and scores are risk signals, not
guarantees. Nothing here is financial advice, and $GL1TCH is a high-risk, internet-native asset.

$GL1TCH — Solana · `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump` · Token-2022, 0% tax · mint & freeze revoked · fixed 1B supply.
