# GL1TCH — Threat Model (living doc)

> Phase -1 requirement (PREMIUM-PLAN-v3). A short "worst case" list, reviewed before every
> major phase (esp. Phase 2 wallet-connect, Phase 4 extension, Phase 6 API). Not a full audit.

## Who attacks
- **Rival project / griefer** — wants to get a competitor falsely flagged, or DoS the scanner.
- **Sybil user** — many wallets/accounts to game Proof-of-Signal ranks or tier incentives.
- **Drainer operator** — clones the site ("just sign") to trick users into signing a fund-transfer tx.
- **Script kiddie / scraper** — hammers public endpoints to run up cost or scrape data.
- **Supply-chain attacker** — compromises a dependency, the CI/deploy pipeline, or (Phase 4) the extension update channel.

## Valuable assets
- **User trust** — lost permanently on a single security failure.
- **Score integrity** — a "clean" verdict on a real rug (or vice-versa) destroys credibility.
- **User data** — connected wallet addresses, notification prefs (Phase 2+).
- **Admin/scoring control** — anyone who can change the scoring rules or read user data.
- **Bot / deploy credentials** — a hijacked bot posts phishing from our own channel.

## Entry points (current)
- `/api/scan`, `/api/radar`, `/api/stats`, `/api/badge`, `/api/market` — public, unauthenticated.
- Telegram bot (grammY) + its `/verify`, `/stats` HTTP endpoints (Railway).
- The site itself (XSS via any user-reflected value → CSP is the mitigation).

## Core invariants (never violated)
1. **No component ever requests a fund/approval signature** — only ownership-proving message signatures (SIWE-style nonce). Enforced by a CI forbidden-function check.
2. **Secrets never in code** — env/secret-manager only; gitleaks in CI.
3. **Every public endpoint: central input validation + rate limiting.**
4. **Scoring is free + wall-separated from any paid tier** (Phase 6).
5. **Language is probabilistic, never accusatory** (legal/defamation).

## Reviewed
- 2026-07-05 — initial model (Phase -1 kickoff). Next review before Phase 2 (wallet-connect).
