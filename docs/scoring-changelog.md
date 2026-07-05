# Scoring Methodology Changelog (public, living doc)

> Phase 1 requirement (PREMIUM-PLAN-v3). Every material change to the scoring/rule engine
> (new rule, changed threshold, weight change) is logged here **in the same PR**, with date +
> rationale. This is the "not a black box, over time" guarantee — when a user asks "why was
> the score X last month and Y now", the answer is here.

## Format
`YYYY-MM-DD — <what changed> — <why> — <PR/commit>`

## Log
- 2026-07-05 — **Proof-of-Signal v0** shipped (PREMIUM-PLAN-v3 Phase 0). A user's Signal
  Reputation XP fuses the hardest-to-fake signals: verified *sustained* holding tier
  (confirmed = 2× provisional; reuses the 7-day anti-gaming) + verified referrals (read live
  from the referral store). Badges Dormant→Signal→Amplifier→Beacon→Beacon Prime. Bot-hosted
  (`bot/src/proof-of-signal/`), exposed via `GET /signal/leaderboard` + `/rep` command +
  `/ranks` leaderboard. Status only, no paid rewards. Scan-attribution XP reserved for v0.1.
- 2026-07-05 — Rank tiers gated on a **7-day sustained (time-weighted average) balance**
  instead of an instant read — anti-gaming so a balance flashed for one block can't unlock a
  tier (PREMIUM-PLAN-v3 Phase 0). Tier is *provisional* until a full 7-day window of holding
  history accrues, then gated on `min(current, 7d-avg)`; a recent dump immediately loses perks.
  Pure logic + tests in `bot/src/verify/sustained.ts`; durable history in `history-store.ts`.
  Brand tier names (Observer/Infected/Signal Bearer/Core/Ghost Node) unchanged — renaming to
  the plan's Scout/Sentinel/Operative is a founder brand decision, deliberately not auto-applied.
- 2026-07-05 — Changelog created (Phase -1/0). Current engine (`src/lib/scan.ts`) weights:
  mint_authority 19 · freeze_authority 17 · lp_lock 15 · liquidity 12 · insiders 9 ·
  concentration 8 · deployer 8 · transfer_tax 5 · metadata_mutable 3 · rugcheck 4.
- 2026-06-28 — RugCheck fetch made resilient (retry + timeout) and low-confidence reads no
  longer poison the CDN cache — fixed $GL1TCH self-verdict fluctuating 78↔67 (`src/lib/scan.ts`,
  `src/app/api/scan/route.ts`).
