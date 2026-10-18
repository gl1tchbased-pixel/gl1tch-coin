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
