# $GL1TCH X Growth System

Autonomous X (Twitter) growth for **@gl1tchbased**, built on Playwright because the X API
write tier is paywalled (`402 no-credits`). Uses the cached login in `.profiles/x`.

## Pieces

| File | What it does |
|---|---|
| `x-content.mjs` | Curated calendar of investor-grade posts (one/day, rotates through all features). |
| `x-daily.mjs` | Posts today's tweet. Idempotent — won't double-post the same day. |
| `x-reply.mjs` | Finds people **asking** about token safety/rugs and replies with the free scanner. Rate-limited + de-duped. |
| `x-scheduler.mjs` | Supervisor loop: daily post + replies every few hours. Start once, leave running. |
| `x-lib.mjs` | Shared Playwright primitives (login, post, reply, search). |
| `x-post.mjs` | One-off thread + video poster (used for the launch announcement). |

## Run it

**Simplest — the supervisor loop** (leave the window running):
```
NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-scheduler.mjs
```
It posts today's tweet immediately, runs the reply engine, then repeats every
`REPLY_INTERVAL_HOURS` (default **3**). Ctrl-C to stop.

**Manually, one at a time:**
```
# preview today's post without posting
DRY=1 node e2e/social/x-daily.mjs
# post today's tweet
NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-daily.mjs
# find reply targets WITHOUT replying (safe to inspect first)
DRY=1 NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-reply.mjs
# actually reply (max 3/run by default)
NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-reply.mjs
```

## Knobs (env)

- `REPLY_INTERVAL_HOURS` — cycle gap for the scheduler (default 3).
- `MAX` — replies per reply-run (default 3). Keep it low.
- `MIN_DAYS_PER_USER` — don't reply to the same user more than once per N days (default 7).
- `HANDLES="alice,bob"` — also scan these specific accounts' recent tweets for reply targets.
- `DRY=1` — do everything except actually post/reply.
- `FORCE=1` — let `x-daily` post again the same day.

## Account-safety notes (read this)

Aggressive automated replying is the fastest way to get a followed account **suspended**.
This system is deliberately conservative:
- It only replies to tweets that read like a genuine **question** (regex-gated).
- Replies are **helpful** (offer the free scanner), not cashtag shilling.
- Hard caps: `MAX` per run, one reply per user per `MIN_DAYS_PER_USER`, already-replied ids
  tracked in `out/x-reply-state.json`, natural 20s+ gaps between replies.
- **Default cycle is 3h, not hourly.** Hourly is riskier — raise the cadence only if the
  account stays healthy. Watch for reply-throttling / shadow-ban signs and back off.

State lives in `out/x-daily-state.json` and `out/x-reply-state.json` (delete to reset).
