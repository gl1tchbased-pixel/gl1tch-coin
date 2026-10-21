# GL1TCH — Threat Model (living doc)

> Phase -1 requirement (PREMIUM-PLAN-v3). A short "worst case" list, reviewed before every
> major phase (esp. Phase 2 wallet-connect, Phase 4 extension, Phase 6 API). Not a full audit.

## Who attacks
- **Rival project / griefer** — wants to get a competitor falsely flagged, or DoS the scanner.
- **Sybil user** — many wallets/accounts to game Proof-of-Signal ranks or tier incentives.
- **Drainer operator** — clones the site ("just sign") to trick users into signing a fund-transfer tx.
- **Script kiddie / scraper** — hammers public endpoints to run up cost or scrape data.
- **Supply-chain attacker** — compromises a dependency, the CI/deploy pipeline, or (Phase 4) the extension update channel.
- **Key thief** — steals the verdict-anchoring (attester) key to publish fake on-chain roots or drain its fee balance.

## Valuable assets
- **User trust** — lost permanently on a single security failure.
- **Score integrity** — a "clean" verdict on a real rug (or vice-versa) destroys credibility.
- **User data** — connected wallet addresses, notification prefs (Phase 2+).
- **Admin/scoring control** — anyone who can change the scoring rules or read user data.
- **Bot / deploy credentials** — a hijacked bot posts phishing from our own channel.
- **Attester key** — signs the on-chain Merkle roots that make past verdicts tamper-evident.

## Entry points (current)
- `/api/scan`, `/api/radar`, `/api/stats`, `/api/badge`, `/api/agent/badge`, `/api/random/badge`, `/api/market`, `/api/market/history` — public, unauthenticated.
- Telegram bot (grammY) + its HTTP server on Railway (`/verify`, `/stats`, `/signal/*`, …) — reachable directly, not only through the site.
- The site itself (XSS via any user-reflected value → CSP is the mitigation).

## Core invariants (never violated)
1. **No component ever requests a fund/approval signature** — only ownership-proving message signatures (SIWE-style nonce). Enforced by a CI forbidden-function check.
2. **Secrets never in code** — env/secret-manager only; gitleaks in CI.
3. **Every public endpoint: central input validation + rate limiting.**
4. **Scoring is free + wall-separated from any paid tier** (Phase 6).
5. **Language is probabilistic, never accusatory** (legal/defamation).

## Abuse limits in force
- **Site** — per-IP sliding-window limits on every public API route (per instance; `src/lib/ratelimit.ts`). Badges answer a limited caller with the generic badge instead of an error, so embeds never break.
- **`/api/radar`** — a sweep scans up to 40 tokens (env-capped at 80), so it can't be forced on demand: any query string 308-redirects to the one CDN-cached URL, an instance reuses its last sweep for 10 min, concurrent callers share the running sweep, and the per-IP limit is 6/min.
- **Bot HTTP** — every request except `/health` is limited per client IP (reads 240/min, writes 20/min). The IP is `X-Real-IP`, else the last `X-Forwarded-For` hop, so a forged first hop can't rotate identities. The limiter prunes idle keys, evicts least-recently-used keys past its cap, and keeps at most limit+1 timestamps per key, so neither a spray of IPs nor one hammering IP can exhaust memory or CPU. The site's own calls carry a shared token and are exempt.
- **Shared tokens** — every token check is constant-time (`timingSafeEqual`) and fails closed when the token isn't configured.

## Attester key (A3 verdict anchoring)
The one place we sign a transaction. It signs **our own** SPL Memo transactions, never a user's, and never moves anyone's funds. Rules:
- Dedicated wallet holding only fee money (≤ 0.05 SOL); never the deployer, treasury, or any wallet holding tokens.
- Key from env only, never logged; not stored on Railway until its 2026-10-21 incident is declared resolved.
- Every transaction is built from an allowlist (Memo program only, memo matches `gl1tch:radar:v1:<root>:<count>:<sweepMs>`), simulated before sending, and refused if the simulated balance change exceeds the fee cap.
- Hard caps per transaction and per day; a circuit breaker halts sending after repeated failures; every attempt (sent or refused) is audit-logged.
- The public verifier checks the signer against the published attester address and accepts only finalized transactions, so a stolen key can be revoked by publishing a new address and the old roots stay checkable.

## Reviewed
- 2026-07-05 — initial model (Phase -1 kickoff). Next review before Phase 2 (wallet-connect).
- 2026-10-22 — per-IP limits on every public route and the bot server, constant-time token checks, radar sweep made non-triggerable; attester-key rules written before A3 step 2.
