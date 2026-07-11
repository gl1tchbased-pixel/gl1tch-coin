# GL1TCH — Audit Outreach Kit

> **Ready-to-send materials for commissioning a third-party review. FOUNDER ACTION to send.**
> Nothing here commissions, pays, or claims an audit. It is the turnkey packet so the founder can
> reach out with one copy-paste. Companion to `gl1tch-value-accrual-and-audit-readiness.md` (the
> full scope/threat-model/invariants) — send that as the technical annex.
>
> Prepared 2026-07-12.

---

## 0. Why a review (and which kind)

The base **token** needs no audit (Token-2022, authorities revoked, no transfer hook — RugCheck +
SolSniffer already cover it). The right-sized engagement for GL1TCH is a **cryptography /
application-security review** of the off-chain crypto + non-custodial claims, NOT a DeFi/TVL
smart-contract audit (there is no fund-holding contract today). An audit is the anonymous team's
trust substitute; scoping it correctly makes it cheap and high-signal.

**Recommended combo (cost-appropriate for a lean/anon team):**
1. **A crypto-focused independent review** (one cryptographer/appsec engineer, fixed scope below).
2. **A public bug bounty** with the same scope — on-brand ("don't trust, verify"), pay only on
   valid findings.
3. *(Only if the value-accrual V2 distributor contract is ever built)* a full contract audit
   scoped to that single contract.

---

## 1. Scope one-pager (paste into the RFQ)

**Project:** GL1TCH — a free, non-custodial crypto risk-intelligence platform on Solana with a
required-utility token. Open source: `https://github.com/gl1tchbased-pixel/gl1tch-coin`.

**What to review (off-chain crypto + non-custodial invariants):**

| Area | Files |
| --- | --- |
| Verifiable-randomness derivation (unbiased rejection sampling; determinism) | `src/lib/quantum/random.ts`, `bot/src/random/logic.ts` |
| Provably-fair Draw (commit-reveal, `winner = H(pulse‖merkleRoot) mod n`) | `src/lib/quantum/draw.ts`, `bot/src/quantum-core/logic.ts` |
| drand verification (BLS-12-381 vs quicknet pubkey; `randomness == sha256(sig)`) | `src/lib/quantum/drand.ts`, `bot/src/random/drand.ts` |
| CURBy binding (round-vs-index; independent recompute) | `src/lib/quantum/{curby,verify}.ts` |
| Allocation binding (entrant list → Merkle root → salt) | `src/lib/quantum/random.ts` |
| Hybrid Seal (X25519 + ML-KEM-768 → HKDF → AES-256-GCM; AAD binding) | `src/lib/quantum/seal.ts` |
| Beacon integrity (append-only hash chain) | `bot/src/quantum-core/store.ts`, `bot/src/random/store.ts` |
| Key issuance (ed25519 ownership proof; sustained-balance gate; no fund access) | `bot/src/api-keys/*`, `bot/src/verify/*` |
| **Non-custodial invariant** (no path requests a fund-moving/approval signature or holds keys) | whole repo |

**Invariants to certify (I1–I6):** non-custodial; verify-don't-trust (client-recomputable);
bot⇄site byte-parity; unbiasable fairness; tamper-evidence; no invented metrics. Full definitions +
threat model in the audit-readiness annex, §B.2–B.3.

**Executable spec of correctness:** the two independent implementations are held byte-identical by
locked test vectors, and I1/I4/I5 are enforced as tests
(`src/lib/quantum/*.test.ts`, `bot/src/**/*.test.ts`, `bot/src/non-custodial.test.ts`). Point the
reviewer here first.

**Out of scope:** the SPL token itself; front-end UX; marketing content.

**Deliverable requested:** findings by severity + a one-line **non-custodial attestation** the
reviewer can sign against I1.

---

## 2. Candidate reviewers / firms (evaluate — not endorsements)

Pick by fit for *cryptography + Solana/app-sec*, not DeFi-TVL. Get quotes from 2–3.

**Cryptography-strong firms:**
- Trail of Bits (crypto + appsec) · Zellic · OtterSec (Solana-native) · Sec3 (Solana) ·
  NCC Group – Cryptography Services · Cure53 (appsec/web) · Halborn.

**Independent / contest platforms (cheaper, on-brand):**
- Cantina, Code4rena, Sherlock — scoped competitive reviews.
- Individual cryptographers via referrals; zkSecurity for the BLS/KEM parts.

**Bug bounty hosting:**
- Immunefi (crypto-native) or a self-hosted scope with a public reward table (below).

> Do your own diligence on availability, price, and Solana/crypto specialization before engaging.

---

## 3. Cover message templates

**Short DM / email (RFQ):**

```
Subject: Fixed-scope crypto/appsec review — GL1TCH (open-source, Solana)

Hi <name/team>,

We're GL1TCH — a free, non-custodial crypto risk-intelligence platform on Solana. We'd like a
FIXED-SCOPE cryptography + application-security review (not a DeFi/TVL audit — we hold no user
funds and have no fund-holding contract).

Scope: off-chain verifiable-randomness derivation, provably-fair draw, drand BLS verification,
hybrid X25519+ML-KEM-768 sealing, hash-chained beacon, and our non-custodial invariant. Full
scope + threat model + invariants attached; the two implementations are held byte-identical by
locked test vectors we can point you to as the executable spec.

Repo: https://github.com/gl1tchbased-pixel/gl1tch-coin
Could you share availability and a fixed-scope quote?

Thanks,
GL1TCH
```

**Bug-bounty announcement (once live):**

```
GL1TCH bug bounty is live. Scope: verifiable randomness, provably-fair draw, drand/CURBy
verification, hybrid post-quantum seal, beacon integrity, and — above all — our NON-CUSTODIAL
invariant. Break the fairness or find a custody path, get paid. Don't trust — verify (and profit).
Scope + rules: <link>
```

---

## 4. Bug-bounty program draft (self-hosted or Immunefi)

**In scope:** the modules in §1. **Out of scope:** the SPL token, UX, marketing, spam/DoS, and
anything requiring a compromised drand *threshold* (we trust the beacon itself).

**What we most want broken (highest rewards):**
1. A path that takes custody of user funds or induces a fund-moving/approval signature (breaks I1).
2. A way to bias or predict a draw/randomness outcome after commit (breaks I4).
3. Forging a result that passes in-browser verification (breaks I2).
4. Silently altering/deleting a Beacon entry (breaks I5).

**Suggested reward table (fund modestly from the ops multisig — no user funds):**

| Severity | Example | Reward (USD-equiv, illustrative) |
| --- | --- | --- |
| Critical | Custody path / fund-moving signature; predictable draw | 2,000–5,000 |
| High | Verification bypass; parity divergence exploit | 750–2,000 |
| Medium | DoS of a holder-gated endpoint; info leak | 200–750 |
| Low / Info | Hardening, docs, spec gaps | 50–200 |

> Reward figures are illustrative placeholders — set them to what the treasury can honestly honor,
> and never advertise a bounty you can't pay.

---

## 5. Founder checklist

- [ ] Send §3 RFQ to 2–3 candidates from §2; attach the audit-readiness annex + this kit.
- [ ] Pick one; freeze a commit hash + tag for the reviewed surface.
- [ ] (Parallel) stand up the bounty with §4 scope + a reward table the treasury can honor.
- [ ] On completion: publish the report + the signed non-custodial attestation. ONLY THEN may the
      site show an "audited" state (update `/security` + the `/token` scorecard).
- [ ] Nothing claims "audited" until a real report exists — this is a hard rule.
