# GL1TCH — First-Adoption & First-Revenue Outreach Kit

> Founder-executed BD packet. The goal ladder is honest: **usage first → integrations → paid depth
> → revenue → buyback/value-accrual** (the buyback runbook + audit kit are already prepared). From a
> $2.4K / 2-holder / $0-volume start, the first win is not a sale — it's real USAGE by someone who
> isn't us, which creates the funnel, the API-key demand, and the case for paid tiers. Prepared 2026-07-12.

## The pitch in one line (per audience)

- **Projects doing a mint/whitelist/raffle:** "Run a provably-fair draw with a shareable proof — free.
  End the 'was it rigged?' FUD before it starts." → /quantum-core/random
- **Wallets / dapps / trading bots:** "One free API call to rug-check any token before a swap." → /api/scan
- **AI-agent builders / frameworks:** "Know Your Agent — one call to trust-check an agent wallet
  (ERC-8004 compatible)." → /api/agent/check
- **Security / alpha communities:** "Embed a live 'Scanned by GL1TCH' badge; give your members a free
  scanner." → /embed

## Who to reach (segments + why they'd care)

| Segment | Why they adopt | Our asset | Where to find them |
| --- | --- | --- | --- |
| NFT / token projects mid-launch | provably-fair mint order / allocation kills insider FUD | Randomness + Allocation + shareable proof | X search "mint", "whitelist", "allocation"; Solana NFT Discords |
| Giveaway / raffle runners (X + Discord) | a proof link nobody can dispute | /quantum-core/random + badge | X search "giveaway winner", "raffle"; community mods |
| Solana launchpads / mint tools | verifiable randomness as infra for their users | Randomness API (holder-gated) | launchpad teams, mint-tool builders |
| Wallets / dapps / swap bots | rug-check before a swap = safer users | /api/scan (free tier + keyed depth) | dev communities, Solana builder chats |
| AI-agent frameworks / agent projects | agent trust/guardrail is unsolved + on-narrative | KYA /api/agent/check + ERC-8004 file | agent/AI-x-crypto builders, ERC-8004 circles |
| Security researchers / rug-alert accounts | free tool + shared mission (verify, don't trust) | scanner + Signal Graph + badge | the accounts our reply engine already targets |

## Message templates (short, value-first — never spammy)

**A. Provably-fair draw (to a project running a mint/giveaway):**
```
Saw you're running a <mint/whitelist/giveaway>. If you want to kill the "was it rigged?" doubt
up front: we built a FREE tool that draws winners from a quantum-grade public beacon and gives
everyone a proof link they can verify themselves (no trust in you or us). 2-min to run:
coin-three-mu.vercel.app/quantum-core/random — happy to help you set it up.
```

**B. Scanner API (to a wallet/dapp/bot builder):**
```
If you ever want a rug-check before a swap, ours is one free call:
GET coin-three-mu.vercel.app/api/scan?mint=<addr>&chain=solana → { verdict, score, reasons }
Free per-IP; higher throughput is token-gated but the endpoint's open to try. No SDK, no auth.
```

**C. Know Your Agent (to an agent/AI-crypto builder):**
```
Building agents that transact on-chain? Before you let one near funds, one call trust-checks it
(identity + on-chain reputation), ERC-8004-compatible:
GET coin-three-mu.vercel.app/api/agent/check?address=<wallet>&chain=solana
Free, non-custodial. Would love feedback if you try it.
```

**D. Badge / embed (to a security or alpha community):**
```
We run a free, non-custodial multi-chain rug scanner + a cross-scan deployer-reputation graph.
You can drop a live "Scanned by GL1TCH" badge in your group or docs, and members get free scans:
coin-three-mu.vercel.app/embed — open to a collab.
```

## Rules of engagement (protect the brand)

- Value-first, personalized, ONE ask. Never mass-DM identical text. Never lead with the token.
- Lead with the FREE tool that solves their problem; the token comes up only if they ask about depth.
- No fake urgency, no "financial opportunity" framing, no paid-shill asks.
- Track replies; follow up ONCE. A "no" is fine — you're planting integrations, not begging.

## Simple pipeline to track (copy into a sheet)

| Date | Who (handle) | Segment | Asset pitched | Sent | Reply | Outcome (tried / integrated / paid / no) |
| --- | --- | --- | --- | --- | --- | --- |

## Success ladder (what "working" looks like, in order)

1. **First non-us usage** — someone runs a scan / a draw / an agent check that isn't us. (Funnel is real.)
2. **First integration** — a project embeds the badge, or uses a draw for a real giveaway with the proof link. (Backlink + distribution.)
3. **First holder from utility** — someone mints an API key (needs sustained balance) → real token demand.
4. **First paid depth / revenue** — a team pays for higher API throughput or a dedicated integration.
5. **Value accrual turns on** — sustained revenue → buyback→burn (runbook ready) + audit (kit ready).

> This is how a tiny-but-real product becomes a valuable token honestly: usage → demand → revenue →
> engineered accrual. No shortcuts, no fake numbers.
