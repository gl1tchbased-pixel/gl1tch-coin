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
- Telegram bot (grammY) + its HTTP server on an Oracle Cloud VM behind Caddy (`/verify`, `/stats`, `/signal/*`, `/attest/*`, …) — reachable directly, not only through the site.
- The attester runner (GitHub Actions, `attester` environment) — the only holder of a signing key.
- `/api/x402/scan`, `/api/x402/agent`, `/api/x402/deployer` — the paid agent API (x402). Public; the handler runs only after the facilitator verifies a payment (or for a valid `x-gl1tch-key`).
- The site itself (XSS via any user-reflected value → CSP is the mitigation).

## Core invariants (never violated)
1. **No token approvals, and no fund-moving transaction except a Safe Swap the user starts** (enforced by `scripts/money-guard.mjs` before every build, not only in CI): Jupiter builds it and the user signs it in their own wallet through Solana Actions. Otherwise only ownership-proving message signatures (SIWE-style nonce). Our code never signs for users; a CI forbidden-function check guards this.
2. **Secrets never in code** — env/secret-manager only; gitleaks in CI.
3. **Every public endpoint: central input validation + rate limiting.**
4. **Scoring is free + wall-separated from any paid tier** (Phase 6).
5. **Language is probabilistic, never accusatory** (legal/defamation).

## GL1TCH's own revenue (fee vault, x402 receipts)
Full map and incident steps: `docs/security/treasury-runbook.md`.
- **Destinations are pinned in code** (`src/lib/official.ts`). Env can switch a flow off, never point it elsewhere: `readPayTo` rejects any other wallet and `swapFee` ignores any other account.
- **The fee is conditional on chain state.** Before asking Jupiter for a fee, the site reads the referral account. Owner not the pinned wallet, owner is the attester, lowered share, no vault, or a failed read: no fee, and the swap still runs.
- **Jupiter's answer isn't trusted blindly.** `swapTxProblem` reads the transaction before it reaches a wallet: the taker is the only signer, top-level programs are on a list, no top-level approve, authority change or token transfer, SOL moved and priority fee are capped. It doesn't look inside Jupiter's own programs.
- **Money watch** (`bot/src/money-watch`) reads the chain and the live site every 5 minutes from outside Vercel and messages the admins. It holds no key.
- **Owner moved off CI:** the referral accounts belong to a cold wallet (`REFERRAL_PARTNER`) whose key is on no server. They used to belong to the attester. Fees can't be redirected without that wallet's signature; the program has no accept step, so the watch also alerts on any owner change.
- **Accepted trust:** Jupiter can upgrade the referral program and change our share, so accumulated fees should be claimed regularly. A hijacked Vercel account can ship any code; the watch detects it but can't stop it.

## Abuse limits in force
- **Site** — per-IP sliding-window limits on every public API route (per instance; `src/lib/ratelimit.ts`). Badges answer a limited caller with the generic badge instead of an error, so embeds never break.
- **`/api/radar`** — a sweep scans up to 40 tokens (env-capped at 80), so it can't be forced on demand: any query string 308-redirects to the one CDN-cached URL, an instance reuses its last sweep for 10 min, concurrent callers share the running sweep, and the per-IP limit is 6/min.
- **Bot HTTP** — every request except `/health` is limited per client IP (reads 240/min, writes 20/min). The IP is `X-Real-IP`, else the last `X-Forwarded-For` hop, so a forged first hop can't rotate identities. The limiter prunes idle keys, evicts least-recently-used keys past its cap, and keeps at most limit+1 timestamps per key, so neither a spray of IPs nor one hammering IP can exhaust memory or CPU. The site's own calls carry a shared token and are exempt.
- **Shared tokens** — every token check is constant-time (`timingSafeEqual`) and fails closed when the token isn't configured.

## Attester key (A3 verdict anchoring)
The one place we sign a transaction. It signs **our own** SPL Memo transactions, never a user's, and never moves anyone's funds. Rules:
- Dedicated wallet holding only fee money (~0.05 SOL). The signer is pinned in code (`PINNED_ATTESTER`, equal to the site's `ATTESTER_WALLET`; a test keeps them equal), so on mainnet pointing the job at another wallet takes a reviewed commit, not a changed setting. The runner refuses a wallet under the fee floor or over 2 SOL and warns above 0.25 SOL. It doesn't read token accounts: anyone can open one for any address or send it dust, so judging them would hand strangers a cheap halt, and nothing in a token account can affect a memo-only signer.
- Strangers can mention the attester in their own transactions and copy its memo text. The runner pages back over the window, verifies at most 120 transactions a run (each once; a 429 counts as unknown instead of being slept through) and 3 copies per root (past that it seals again, one extra fee, rather than let copies block a sweep). If the last 24 h can't be fully read or counted, the run seals two sweeps; two runs an hour give 96 a day, enough to keep up with sweeps (at most one per run) and under the 100-a-day cap. A flood that starts mid-window can push one day past the cap by at most that degraded allowance (5,000 lamports an anchor). A test pins the cron arithmetic; manual dispatches and re-runs aren't counted by it.
- Linking doesn't depend on the history: right after an anchor is confirmed, the runner reports {root, sig} to the bot's public POST /attest/link, signed with the attester key (a domain-separated text, not a transaction). The bot checks that signature locally and queues the report on it alone, so a report costs no RPC call and only the attester can make one; a replay is answered from the queue. At each tick the bot fetches the transaction at finalized and links it only if the attester signed that root's memo; one shown not to be ours is dropped and never fetched again. The history scan stays as a fallback, capped at 40 checks a tick and 3 per root. On mainnet the bot links from the pinned attester only, whatever its env says. CI fails on message signing outside bot/src/attest (tests excepted).
- Key from env only, never logged, and never on the bot's host: the runner is a scheduled GitHub Actions job whose secret lives in the protected `attester` environment and reaches only the run step (installs run with scripts disabled, actions pinned by SHA).
- The RPC must prove its cluster by genesis hash, so a devnet setup can't sign on mainnet.
- Every transaction is checked against an allowlist on the compiled message (one Memo instruction, attester-paid, no other accounts, memo = `gl1tch:radar:v1:<root>:<count>:<sweepMs>`). The fee is capped, and the exact signed bytes are simulated with a balance-change cap before those same bytes are sent.
- The runner re-validates every record and recomputes the root, trusting nothing the bot sends.
- Caps: 20 per run (GitHub often starts the schedule only every 4-6 hours, so one run must clear a backlog), 100 per rolling 24 h (env can only tighten them; tightening the daily cap below 96 breaks the degraded-mode arithmetic above). A circuit breaker halts after 3 consecutive failures. Every decision, sent or refused, is audit-logged.
- A memo's text proves nothing (anyone can copy it into a transaction that mentions the attester), so anchors count only after the transaction's signer is checked. That holds for the bot's linker, the runner's skip-if-sealed check and its daily count at the cap.
- CI fails if code outside `bot/src/attest/` can sign, or if the attester builds anything but a memo.
- The public verifier checks the signer against the published attester address and accepts only finalized transactions, so a stolen key can be revoked by publishing a new address and the old roots stay checkable. Spec: `docs/verdict-anchoring.md`.

## Paid agent API (x402)
Agents pay per call in USDC. We hold no key: `payTo` is a founder-owned receive address, and the facilitator (PayAI) broadcasts the payer's own signed transfer. Invariant 4 holds: the paid routes return the same scoring as the free ones; payment buys access, not a different verdict. Rules:
- Settlement only for a handler response under 400 (`withX402`). Rate limit (429) and an unconfigured route (503) are answered before any payment is requested. Bad input is answered by the handler (400), after the challenge, because discovery probes call without parameters; a 400 is never settled. A scan with confidence < 60 becomes a 503, so a degraded read is never charged.
- Paid responses are `cache-control: private, no-store`, so a CDN can't hand a paid body to an unpaid caller.
- `payTo` is checked on every request and fails closed: if any set address is invalid, or is the attester (its key lives in CI secrets), every paid route answers 503 and the error is logged, so a typo can't quietly drop a network.
- The revenue ledger is written by the site with the shared stats token. A leaked token could add fake rows; every row links to its on-chain transaction, so a fake one is checkable, and the fix is rotating the token. A faulty facilitator could likewise report a settlement that didn't happen; the same tx link exposes it.
- Our own test payments are recorded as self-tests and never counted as revenue: the test client sends `x-gl1tch-self-test: 1`, and payers listed in `X402_SELF_PAYERS` count as self-tests too. Anyone can send that header, but all it does is keep their own payment out of the total.

## Reviewed
- 2026-07-05 — initial model (Phase -1 kickoff). Next review before Phase 2 (wallet-connect).
- 2026-10-22 — per-IP limits on every public route and the bot server, constant-time token checks, radar sweep made non-triggerable; attester-key rules written before A3 step 2.
- 2026-10-22 — A3 step 2 built to those rules (runner, linker, proof endpoints, CI confinement); the review added the genesis-hash check and signer verification on every memo hint.
- 2026-10-28 — paid agent API (x402) added: entry points, no-charge-on-failure, private caching, payTo guard, ledger token risk.
- 2026-10-31 — referral accounts moved from the attester to a cold wallet; Safe Swap fee switched on behind the on-chain check.
- 2026-10-28 — attester griefing hardened over two security reviews: signer pinned in code (runner and linker); token accounts no longer read (a dust or token-account gift can't halt sealing); SOL refuses only above 2 SOL; history paged with a per-run verify budget (120, 3 per root) and a two-anchor mode that keeps up when the last 24 h can't be read or counted; the runner reports each anchor to the bot, which verifies and links it directly, so copied memos can't hold a sweep unlinked. Halting sealing now takes gifting the attester more than 2 SOL, or controlling the attester's RPC or GitHub environment.
