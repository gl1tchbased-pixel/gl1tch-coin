# Scoring Methodology Changelog (public, living doc)

> Phase 1 requirement (PREMIUM-PLAN-v3). Every material change to the scoring/rule engine
> (new rule, changed threshold, weight change) is logged here **in the same PR**, with date +
> rationale. This is the "not a black box, over time" guarantee — when a user asks "why was
> the score X last month and Y now", the answer is here.

## Format
`YYYY-MM-DD — <what changed> — <why> — <PR/commit>`

## Log
- 2026-07-05 — Changelog created (Phase -1/0). Current engine (`src/lib/scan.ts`) weights:
  mint_authority 19 · freeze_authority 17 · lp_lock 15 · liquidity 12 · insiders 9 ·
  concentration 8 · deployer 8 · transfer_tax 5 · metadata_mutable 3 · rugcheck 4.
- 2026-06-28 — RugCheck fetch made resilient (retry + timeout) and low-confidence reads no
  longer poison the CDN cache — fixed $GL1TCH self-verdict fluctuating 78↔67 (`src/lib/scan.ts`,
  `src/app/api/scan/route.ts`).
