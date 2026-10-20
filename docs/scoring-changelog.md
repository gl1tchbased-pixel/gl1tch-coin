# Scoring Methodology Changelog (public, living doc)

> Phase 1 requirement (PREMIUM-PLAN-v3). Every material change to the scoring/rule engine
> (new rule, changed threshold, weight change) is logged here **in the same PR**, with date +
> rationale. This is the "not a black box, over time" guarantee — when a user asks "why was
> the score X last month and Y now", the answer is here.

## Format
`YYYY-MM-DD — <what changed> — <why> — <PR/commit>`

## Log
- 2026-10-21 — **Top holder no longer counts the liquidity pool** (Solana). The check scored the largest token
  account, which on Pump.fun / AMM tokens is the pool vault (tokens waiting to be bought), so tokens failed at ~97%.
  It now takes RugCheck’s holder list, drops accounts owned by RugCheck-labelled AMM accounts or by a market’s pool
  address, and scores the largest real holder (shown as “· pool excluded”); without RugCheck data it falls back to
  the raw largest account as before. Thresholds unchanged (≤15% pass, ≤40% warn, else fail). The scan result also
  reports `poolPct` and `topRealHolderPct`. Why: our own self-scan read “Top holder 96.9% FAIL” for an account that
  is the pool. Logic + tests in `src/lib/holders.ts`.
- 2026-10-21 — **New check: Token age** (`token_age`, Solana weight 4, EVM weight 3) and a **verdict cap**: a
  token whose pair is under 24 hours old warns ("no track record yet") and can be LOW RISK at best, never CLEAN;
  the same cap applies when no trading history can be read at all (no DEX pair). Verified blue-chips are unaffected.
  Why: fresh Pump.fun tokens still on the bonding curve passed every structural check and read CLEAN 92–97 minutes
  after launch, while most rugs happen in the first hours. Logic + tests in `src/lib/token-age.ts`.
- 2026-10-20 — **New check: Deployer holdings** (`dev_holdings`, Solana weight 5, EVM weight 4).
  Reads the share of supply the launching wallet holds right now (Solana: live RPC balance of
  the RugCheck-reported creator; EVM: GoPlus `creator_balance / total_supply`). >15% fail
  (dump risk, also counts as an independent serious flag for the RUG-SHAPED cap), 5–15% warn,
  0.01–5% pass, <0.01% warn as "exited" (no stake left). Why: a deployer that sells out is a
  signal holders watch for, and our own self-scan didn't show it. Thresholds + tests in
  `src/lib/deployer-holdings.ts`. Solana weights now: mint_authority 19 · freeze_authority 17 ·
  lp_lock 15 · liquidity 12 · insiders 9 · concentration 8 · deployer 8 · dev_holdings 5 ·
  transfer_tax 5 · rugcheck 4 · metadata_mutable 3.
- 2026-10-20 — Scan counter split: Rug Radar sweeps and Watchtower re-scans are counted as
  `auto`, everything else as `user`, from the first tagged scan on (`splitSince`). The all-time
  `scanned` total still mixes both; earlier public figures (e.g. ~1,950 by mid-July) included
  automated Rug Radar sweeps.
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
