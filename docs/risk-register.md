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
