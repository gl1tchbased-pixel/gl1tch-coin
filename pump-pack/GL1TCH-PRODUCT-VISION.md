# GL1TCH — Product Vision: The Non-Custodial AI Safety Layer for Solana

**One line:** *GL1TCH doesn't trade for you. It makes sure you don't get rugged.*
Non-custodial · read-only · never asks for your keys. The rogue AI on your side.

## Why this wins (market gap, June 2026)
- Every big Solana bot (Trojan, GMGN, BONKbot, Maestro, Bloom) does **execution/custody** → that's exactly where 2026's **$45M+ in AI-agent hacks / wallet drains** happened.
- Best-practice consensus: *AI for context & alerts (agentic OK), execution tightly constrained, never grant withdrawals.*
- **Nobody owns the pure safety/intelligence lane.** GL1TCH does — and it matches the brand 1:1 (rug-proof, "memorized every rug"). We can't be hacked for funds we never hold.
- Bonus: read-only = **free to build** (no custody, no trading infra, no liability).

## Strategic options (pick the lane; A recommended)

### ▶ Option A — Intelligence & Safety Layer  ⭐ RECOMMENDED
The non-custodial scanner + watchtower + explainer suite. Differentiated, safe, on-brand, free, gives the token real utility + a viral content loop.

### Option B — Social Alpha Engine
GL1TCH reads CT/social + on-chain to surface trending tokens, sentiment, KOL moves ("the rogue AI that reads the timeline"). Feasible but noisier, API-heavy, less defensible. → layer on later.

### Option C — Gamified On-Chain Identity
Rank NFTs, leaderboards, "infection" mechanics, quests, holder badges. Retention/stickiness play, lower real utility. → layer on later for community depth.

---

## Option A — Modules (all read-only, free to build)

1. **SCANNER** — paste any Solana token → full safety verdict: mint/freeze authority, LP burned/locked, transfer tax, top-holder concentration, RugCheck score, age/liquidity. Web `/scan` + Telegram `/scan <mint>`. Rogue-AI voiced VERDICT (CLEAN / SUS / RUG-SHAPED).

2. **EXPLAINER** (the real differentiator) — plain-language *why*. Not "the AI decided" — GL1TCH explains each red/green flag like a friend who's seen every rug. Solves the market's #1 complaint (opaque AI).

3. **WATCHTOWER** — watch a token/wallet; GL1TCH DMs you on key events: LP pulled, authority changed, top holder dumps, abnormal sells. Non-custodial, read-only alerts. (The "whale/smart-money" angle, framed as *safety*.)

4. **DEGEN VERDICT card** — every scan generates a shareable branded result image (auto, via the Remotion/OG pipeline we already built) → users share their scans → **viral loop that brings non-holders to the brand.** Content engine + product fused.

5. **HOLDER-GATED tiers** (gives $GL1TCH real demand — this is the utility flywheel):
   - **Observer (0):** 3 scans/day.
   - **Infected (100K):** unlimited scans + 3 watchlist slots.
   - **Signal Bearer (1M):** wallet tracking + real-time alerts.
   - **Core Node (5M):** batch scans + priority alerts.
   - **Ghost Node (10M):** full alpha feed + API access.
   → Holding $GL1TCH = unlocking a genuinely useful safety tool. *Reason to buy that isn't "number go up."*

## Tech feasibility (honest)
- **Data (free):** Solana RPC (Helius/publicnode) + RugCheck API + DexScreener/GeckoTerminal + Helius DAS for holders. All read-only, public.
- **Web:** Next API route `/api/scan?mint=` (server-side aggregation, CORS-clean — same pattern as `/api/market`) + a `/scan` page (extend the existing interactive SecurityScan UI to any address).
- **Telegram:** `/scan` command in the existing bot (Railway-hosted). Watchtower = a poller in the same bot (we already run crons there).
- **Gating:** reuse the existing holder-verification (the bot already reads balances → maps to rank). Wire rank → feature access.
- **Limits:** free-tier API rate limits are fine at our scale; keys/cost only become relevant if it actually gets traffic (a good problem). No custody = no security liability.

## Phased roadmap
- **Phase 1 (build now, free):** `/api/scan` + `/scan` web tool + Telegram `/scan` + auto VERDICT card. Public, ungated — the top-of-funnel magnet.
- **Phase 2:** holder-gated limits/features (wire rank → access). Watchtower alerts for Signal Bearer+.
- **Phase 3:** wallet tracking, alpha feed, shareable leaderboards. Optional Option B/C layers.

## Positioning & narrative
- "The market gave you 10 bots that can drain your wallet. We built one that can't — because it never holds it."
- Ties the lore (*it memorized every rug*) to a working product. Press-worthy, shareable, genuinely useful.

## Honest expectation
This does **not** fix the $1.8k liquidity problem or guarantee buyers. What it does: give GL1TCH a real reason to exist, a tool that pulls in users (some convert to holders), genuine differentiation, and a viral content loop — the **strongest free move available.** It turns "another meme" into "a real product with a meme front."
