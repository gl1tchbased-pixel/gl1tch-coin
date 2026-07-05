# Risk Register (living doc)

> PREMIUM-PLAN-v3 rule #10 + Risk Kaydı: risky / hard-to-reverse decisions and accepted
> risks are logged here. Update after every material architectural decision.

## Accepted dependency advisories (transitive, tracked)
The CI dependency audit (`.github/workflows/security.yml`) blocks any NEW high/critical
advisory. The two below are **transitive dependencies of `@solana/web3.js@1.x`** with no
clean upstream fix; they are explicitly allow-listed and tracked here, not silently ignored.

| Advisory | Package | Path | Why accepted | Exit plan |
|---|---|---|---|---|
| GHSA-3gc7-fjrx-p6mg | bigint-buffer | @solana/web3.js → @solana/spl-token → … | Buffer overflow via `toBigIntLE()`; no upstream fix; we never call it with attacker-controlled length | Clears on `@solana/web3.js` v2 (`@solana/kit`) migration |
| GHSA-848j-6mx2-7j84 | elliptic | @solana/web3.js internal | Risky crypto primitive; standard ed25519/secp usage inside web3.js, not our code | Same — web3.js v2 migration |

**Review:** re-check each time `@solana/web3.js` is upgraded, and whenever a v2 migration is
scheduled. If a clean patched version becomes available, remove from the allowlist immediately.

## Architectural decisions
- 2026-07-05 — Phase -1 shipped: CSP, central input validation, best-effort per-IP rate
  limiting (in-memory; upgrade to Upstash/WAF when traffic warrants), CI security scans.
  Rate limiter is per-serverless-instance — a global limit needs a shared store (documented).
