# GL1TCH — Value-Accrual & Audit-Readiness Package

> **Status: FOUNDER DECISION DOCUMENT. Nothing here is built, deployed, or activated.**
> This is a decision-ready spec for the two remaining, deliberately-gated levers that most
> strengthen the investor case: (A) an engineered value-accrual mechanism, and (B) a
> third-party audit. Both are **founder + audit-gated** and must NOT be built autonomously.
> This document exists so the founder can commission/approve them with full context.
>
> Author: autonomous manager pass, 2026-07-11. Grounded in the current codebase.

---

## 0. Why this document exists

Verified deep-research (see `pump-pack/INVESTOR-WHY-BUY-RESEARCH.json`) established two hard truths:

1. **A useful product ≠ a valuable token.** Value accrual must be *engineered* separately.
2. **"Usage raises the price via fees" is false** unless the fee→holder link is explicitly built.

GL1TCH has now shipped the **required-utility** half (metered API keys, holder-gated
randomness/allocation, Signal Graph depth, sustained-holding tiers — all live). What remains is
the **value-accrual** half and the **anonymous-team trust substitute** (a real audit). Both are
custody-adjacent or high-consequence, so they are gated. This package makes them decision-ready.

The guiding invariant, unchanged: **non-custodial. GL1TCH never takes custody of user funds,
never holds keys, never requests a fund-moving or approval signature.** Any mechanism below that
would violate this is explicitly rejected, not merely deferred.

---

## PART A — Engineered Value Accrual

### A.1 The requirement (what "good" looks like)

Investment-grade value accrual routes **real revenue** into **token demand** through a
**programmatic, verifiable** mechanism. The proven templates:

| Protocol | Mechanism | What it proves |
| --- | --- | --- |
| Chainlink (Payment Abstraction) | service fees → bought back into LINK | fees in any asset → token demand |
| Sky (formerly Maker) "Smart Burn" | surplus → buy & burn (~$1M/day at peak) | buyback removes supply, accrues to holders |
| GMX | stakers receive ~27% of *real* protocol fees ($134M+ distributed) | direct fee-share, no burn needed |

The lesson: pick ONE honest mechanism, drive it from **real** revenue, and make the flow
**auditable on-chain**. Do not invent revenue; do not pre-announce numbers.

### A.2 The revenue that would feed it (must exist first)

Value accrual cannot precede revenue. The candidate revenue lines, in order of realism:

1. **Risk-API / Scanner API** — paid B2B tiers above the free + holder-gated tiers (the CertiK
   SkyInsights model). Highest-realism; the product already exists.
2. **Randomness-as-a-service** — paid throughput above the holder-gated free tier (Chainlink-VRF
   charges per request). Real but small market (~$4–10M/yr sector-wide).
3. **Agent-trust (KYA) API** — reputation lookups for the agent economy. Emerging.

**Trigger condition (hard gate):** no value-accrual mechanism activates until a revenue line is
(a) live, (b) producing verifiable, non-trivial monthly revenue, and (c) sustained for ≥3 months.
Until then, `/token` continues to label this pillar "designed, not live" — which is the current,
honest state.

### A.3 Mechanism options (pick one; all non-custodial-compatible)

Each option below routes revenue held in an **operations multisig** (Squads, 2-of-3, hardware
signers) — revenue the project already controls, NOT user funds. This keeps the *token contract*
untouched and authorities revoked; the mechanism lives entirely in how the multisig spends
**its own** revenue.

**Option 1 — Fee → Buyback → Burn (Sky/Chainlink style). RECOMMENDED as the first step.**
- Flow: revenue accrues to the ops multisig → a published cadence (e.g. monthly) buys $GL1TCH on
  the open market → sends it to a burn address.
- Custody surface: **none new.** No staking contract, no user deposits. The multisig spends its
  own revenue; every buy + burn is a public transaction signature.
- Accrual to holders: supply reduction on a fixed-supply token → each remaining token's share
  rises. Simple, legible, hard to game.
- Downside: the buy is discretionary/manual unless automated; automation adds a keeper contract
  (small audit surface). Start manual + published, automate later if warranted.
- Honesty note: a buyback is demand, not a dividend. Say so.

**Option 2 — Fee → Buyback → Reward pool (GMX-style fee-share), NON-CUSTODIAL variant.**
- Flow: revenue → buy $GL1TCH → distribute to *verified sustained holders* as an **opt-in claim**
  from a distributor contract (Merkle-drop style), gated by the existing 7-day sustained-balance
  Proof-of-Signal.
- Custody surface: a **claim/distributor contract** holds only project-owned reward tokens the
  project already bought (never user principal); users only ever *withdraw*, never *deposit*.
  This is the maximum that can be done while staying non-custodial. It is **audit-mandatory**.
- Accrual to holders: direct, and it rewards the sustained holding the whole system already
  measures — tight thematic fit.
- Downside: highest complexity + the only real new contract surface → must be audited before any
  value flows; "points collapse" risk if framed as farmable (mitigate: reward *sustained* holding,
  not activity).

**Option 3 — REJECTED: staking with lockups / deposit-and-earn.**
- Requires custody of user principal (a deposit). Violates the non-custodial invariant. **Do not
  build.** Option 2's withdraw-only distributor is the non-custodial stand-in for "staking."

### A.4 Recommended phased path

1. **Phase V0 (now):** keep `/token` honest — required-utility live, accrual "designed, not live."
   Ship nothing on-chain. (Current state. ✅)
2. **Phase V1 (on ≥3 months real revenue + founder go):** Option 1, **manual + published**
   monthly buyback→burn from the ops multisig. No new contract, no audit blocker, immediate
   legibility. Publish each tx signature; add a public "buyback ledger" page mirroring the Beacon.
3. **Phase V2 (if revenue scales + audit passes):** automate V1 with a minimal keeper, OR graduate
   to Option 2's withdraw-only distributor for direct fee-share. **Audit is a hard precondition.**

Each phase is independently shippable and independently honest. Never announce V1/V2 numbers before
the revenue is real.

### A.5 What autonomous work may / may not do here

- **May (done):** describe, spec, and label honestly on `/token` + whitepaper.
- **May:** build a *read-only* public "buyback ledger" page IF/WHEN a buyback actually happens
  (it just displays public tx signatures — no custody, like the Beacon).
- **May NOT (founder-gated):** deploy any distributor/keeper/staking contract, move any revenue,
  execute any buyback, or pre-announce a mechanism as "live."

---

## PART B — Audit Readiness

An audit is the anonymous team's trust substitute (LooksRare, samczsun precedent: competence +
verifiability beats doxxing). This section makes commissioning one turnkey.

### B.1 Scope — what should be audited

The base **token** needs no audit (Token-2022 mint, authorities revoked, no transfer hook — nothing
to audit; RugCheck/SolSniffer already cover it). The audit surface is the **off-chain crypto +
non-custodial claims**, plus any Part-A contract if V2 proceeds.

**In scope (crypto correctness + non-custodial invariants):**

| Area | Modules | Claim to verify |
| --- | --- | --- |
| Draw fairness | `src/lib/quantum/draw.ts`, `bot/src/quantum-core/logic.ts` | commit-reveal is unbiasable; winner = `H(pulse‖merkleRoot) mod n`; bot ⇄ site byte-identical |
| Randomness derivation | `src/lib/quantum/random.ts`, `bot/src/random/logic.ts` | unbiased rejection sampling; deterministic; bot ⇄ site parity (locked vectors) |
| drand verification | `src/lib/quantum/drand.ts` | BLS-12-381 verify against the real quicknet pubkey; `randomness == sha256(sig)` |
| CURBy binding | `src/lib/quantum/{curby,verify}.ts` | round-vs-index binding correct; independent recompute holds |
| Allocation binding | `random.ts` `listRoot`/`allocationSalt` | entrant list → Merkle root bound in salt; tamper-evident |
| Hybrid Seal | `src/lib/quantum/seal.ts` | X25519 + ML-KEM-768 → HKDF → AES-256-GCM; client-side decrypt; KEM combiner correctness |
| Beacon integrity | `bot/src/quantum-core/store.ts`, `bot/src/random/store.ts` | hash-chain is append-only + tamper-evident |
| Key issuance | `bot/src/api-keys/*`, `bot/src/verify/*` | ed25519 ownership proof; sustained-balance gate; no fund access |
| Non-custodial invariant | whole repo | **no code path requests a fund-moving/approval signature or holds keys** |

**Out of scope (for now):** the SPL token itself; front-end UX; the marketing site content.

**Conditionally in scope:** any Part-A V2 distributor/keeper contract — **mandatory** if built.

### B.2 Threat model (what the audit should try to break)

1. **Draw/Randomness bias** — can a participant, the bot operator, or a network attacker influence
   the outcome after commit? (Target: no — the seed is a future round; the list is frozen.)
2. **Seed forgery** — can a compromised drand mirror feed a chosen `randomness`? (Target: no — the
   client BLS-verifies; the bot integrity-checks `sha256(sig)==randomness`.)
3. **Replay / cross-draw reuse** — can one pulse decide two draws the same way? (Target: no —
   pulse is hashed with the per-draw root/requestId.)
4. **Beacon tampering** — can a historical entry be altered/removed undetectably? (Target: no —
   hash chain; recomputed client-side.)
5. **Custody creep** — does ANY endpoint or contract ever hold user funds or request a
   fund-moving signature? (Target: no — this is the invariant.)
6. **Key/rate bypass** — can a non-holder obtain holder-gated throughput, or forge an ownership
   proof? (Target: no — ed25519 + sustained-balance, server-side.)
7. **Seal downgrade** — can an attacker force classical-only or PQ-only key agreement? (Target:
   no — hybrid HKDF combiner requires both.)

### B.3 Invariants the audit should certify

- **I1 — Non-custodial:** no fund custody, no key custody, no fund-moving/approval signature, ever.
- **I2 — Verify-don't-trust:** every draw/randomness result is recomputable from public inputs on
  the user's device; the site never has to be trusted.
- **I3 — Bot ⇄ site parity:** the two independent implementations produce byte-identical results
  (enforced by locked test vectors; a divergence breaks I2).
- **I4 — Unbiasable fairness:** outcomes are pure functions of a pre-committed frozen input and a
  post-commit, externally-produced beacon value.
- **I5 — Tamper-evidence:** the Beacon and randomness log are append-only hash chains.
- **I6 — No invented metrics:** every number shown is read from real on-chain/live state.

### B.4 Suggested audit paths (cost-appropriate for a lean/anon team)

1. **Crypto-focused independent review** (fits the actual surface): a cryptographer/security
   engineer reviews the derivation, BLS verification, and KEM combiner against B.2/B.3. Cheapest,
   highest signal for *this* codebase (it's crypto, not DeFi TVL).
2. **Public bug-bounty** (Immunefi-style scope from B.1/B.2) — pairs well with #1 and is on-brand
   ("don't trust — verify"). Fund modestly from the ops multisig.
3. **Full smart-contract audit** — ONLY if Part-A V2 (a distributor/keeper contract) is built.
   Scope it to that contract; the off-chain crypto goes through #1.

### B.5 Pre-audit checklist (make the engagement cheap + fast)

- [ ] Freeze a commit hash for the audited surface (tag it).
- [ ] Provide this document + `gl1tch-quantum-core-spec.md` as the spec of record.
- [ ] Point to the locked parity/verification test vectors (bot + site suites) as the executable
      spec of correctness.
- [ ] Enumerate every wallet-signature call-site and show each is ownership-proof only (I1).
- [ ] Provide the drand/CURBy public keys + the exact verification code path.
- [ ] List trust assumptions explicitly (e.g. "we trust drand's threshold-BLS beacon; we do NOT
      trust the bot for randomness — the client re-verifies").
- [ ] Prepare a one-page non-custodial attestation the auditor can sign off against I1.

### B.6 What autonomous work may / may not do here

- **May (this doc):** produce scope, threat model, invariants, checklist.
- **May:** keep the test vectors green and the two implementations in parity (already enforced).
- **May:** add a public, honest "Audit — planned; scope published" note (the `/token` scorecard +
  `/security` already reflect this).
- **May NOT (founder-gated):** commission/pay an auditor, publish an "audited ✓" claim before an
  audit exists, or represent any of the above as complete.

---

## C. One-page summary for the founder

**Where we are:** required-utility is LIVE and honest; the two remaining investor levers
(value-accrual + audit) are specced here and gated on your decision.

**Cheapest high-impact next moves (your call, not autonomous):**
1. When a revenue line clears ~3 months, greenlight **Phase V1**: manual, published monthly
   **buyback→burn** from the ops multisig. No new contract, no audit blocker, immediately legible.
   Autonomous work can then add the read-only public buyback ledger.
2. Commission a **crypto-focused independent review + a scoped bug bounty** (B.4 #1/#2) — the
   right-sized audit for a crypto (not DeFi-TVL) codebase, and the strongest anon-team trust signal.
3. Only if you later build the Option-2 distributor, add a **full contract audit** scoped to it.

**What stays true no matter what:** non-custodial, no invented numbers, verify-don't-trust,
anonymous-but-accountable. Nothing in this document has been or will be built without your explicit
go-ahead.
