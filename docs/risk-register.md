# Risk Register (living doc)

> PREMIUM-PLAN-v3 rule #10 + Risk Kaydı: risky / hard-to-reverse decisions and accepted
> risks are logged here. Update after every material architectural decision.

## Dependency advisories

### Fixed (2026-07-05)
- **Next.js** → `16.2.10` — cleared ~10 Next.js CVEs (SSRF, cache poisoning, DoS, etc.).
- **protobufjs** → override `^7.5.3` — cleared the **CRITICAL** prototype-pollution (GHSA-xq3m-2v4x-88gg) + several highs.
- **ws** → override `^8.18.0` — cleared the DoS high (GHSA-96hv-2xvq-fx4p).
- **form-data** — patched via `npm audit fix`.

### Fixed (2026-10-18)
- **Next.js** → `16.4.2` — cleared a **CRITICAL** advisory affecting `<=16.3.7` plus several highs.
- **toml** → override `^4.2.0` — cleared two highs (uncontrolled recursion, prototype pollution); reached only via
  `@trezor/connect` → `@stellar/stellar-sdk`'s stellar.toml resolver, which the site never calls.
- ~25 other transitive highs (axios, fast-uri, image-size, nanoid, brace-expansion, browserslist, …) — patched via
  `npm audit fix` (no `--force`).

### Accepted (transitive, no clean fix — allow-listed in `scripts/audit-gate.mjs`)
The CI gate (`.github/workflows/security.yml`) blocks any NEW high/critical; the below are
explicitly allow-listed and tracked, not silently ignored.

| Advisory | Package | Why accepted | Exit plan |
|---|---|---|---|
| GHSA-3gc7-fjrx-p6mg | bigint-buffer | Buffer overflow; no upstream fix; never called with attacker-controlled length | `@solana/web3.js` v2 migration |
| GHSA-848j-6mx2-7j84 | elliptic | Risky primitive, standard usage inside web3.js, not our code | web3.js v2 migration |
| GHSA-r5fr-rjxr-66jc | lodash | Transitive, no reachable patched version | Remove when the pinning dep updates |
| GHSA-66ff-…, 75px-…, jvwf-…, 685m-…, wcpc-… | protobufjs | Residual highs affecting all 7.x; low real risk (we don't parse untrusted protobuf) | Remove if a patched line ships |
| GHSA-mrhx-c7xc-m3w5 | zod | Memory exhaustion when an array schema validates a huge failing array (all versions < 4.6.6; no 3.x fix). Reaches production through the x402 packages (pinned to `zod ^3`; they break on zod 4, which removed the single-argument `z.record`) and viem's `abitype` (optional zod helpers, not loaded). The only attacker-controlled input x402 parses is the `PAYMENT-SIGNATURE` header, which the platform's request-header limit caps at tens of KB: megabytes of issue objects at most, not an OOM. Facilitator responses come from PayAI (trusted). Allow-listed 2026-10-28 with the founder's approval | Remove when x402 moves to zod ≥ 4.6.6 |
| GHSA-vfj7-8cjw-p6xm | braces | No patched version (all versions affected). Pulled in only by react-native's `metro` bundler via `@solana-mobile/wallet-adapter-mobile`; metro never runs in the web app or API | Remove when braces ships a fix or wallet-adapter drops react-native |

**Review:** re-check on every `@solana/web3.js` / dependency upgrade. Remove from the allow-list
the moment a clean patched version exists.

## Architectural decisions
- 2026-07-05 — Phase -1 shipped: CSP, central input validation, best-effort per-IP rate
  limiting (in-memory; upgrade to Upstash/WAF when traffic warrants), CI security scans.
  Rate limiter is per-serverless-instance — a global limit needs a shared store (documented).
- 2026-10-28 — Paid agent API (x402). Risks taken on, with the response:
  - **Facilitator dependency (PayAI).** If PayAI is down, paid calls fail before settlement (no charge, no
    revenue). Each receiving wallet gets 1,000 free settlements for its lifetime; after that PayAI needs credits
    (~$0.00133 per Solana settlement on 2026-10-27, ~13% of a $0.01 call). Response: watch the count on
    /revenue; buy credits or add the Coinbase CDP facilitator before the free allowance runs out.
  - **Upstream quotas under paid volume.** Every paid scan hits the same Helius / RugCheck / GoPlus / DexScreener
    budget as the free scanner. Response: per-IP limit 120/min on paid routes; upgrade the Helius plan from
    revenue if volume grows.
  - **Hot receiving wallet.** USDC lands in a Phantom account. Response: sweep to the founder's main wallet
    periodically; the receiving account holds nothing else.
- 2026-10-28 — Second facilitator: when `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` are set, Coinbase CDP verifies and
  settles first (settling through it lists the endpoints in the Coinbase Bazaar) and PayAI is the fallback; x402 picks
  the first facilitator that supports a payment kind at startup. Malformed keys fall back to PayAI (live-tested).
  Keys that are valid but lack permissions could be picked and then fail at verify (no charge, no revenue): after
  setting them, make one test payment and check `/revenue`.
