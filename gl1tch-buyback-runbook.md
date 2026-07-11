# GL1TCH — Buyback→Burn Runbook (Phase V1)

> **FOUNDER-EXECUTED. Trigger-gated. Nothing here runs autonomously or moves funds.**
> This is the exact procedure for the recommended first value-accrual step (Option 1 in
> `gl1tch-value-accrual-and-audit-readiness.md`, §A.3): manual, published, monthly buyback→burn
> from the operations multisig — **using the project's own revenue, never user funds.**
>
> The public ledger page `/buyback` renders every entry you record. Prepared 2026-07-12.

---

## 0. Hard trigger (do NOT start before this)

Do not execute any buyback until ALL of these hold — otherwise it is theatre, not value accrual:

- [ ] A revenue line (risk-API / randomness API / agent-trust API) is **live** and producing
      **verifiable, non-trivial** monthly revenue.
- [ ] That revenue has been sustained for **≥3 months**.
- [ ] The revenue used is **project revenue** held in the ops multisig — never user principal, never
      borrowed, never treasury tokens minted for this (supply is fixed).

Until then `/token` continues to label value-accrual "designed, not live" — which is honest and
correct. **There is currently no revenue; V1 has not started.**

## 1. Non-custodial boundary (unchanged)

- The token contract is untouched: mint + freeze authorities stay revoked, supply fixed.
- No staking contract, no user deposits, no new custody. The multisig spends **its own** revenue.
- Every buy and every burn is a public, on-chain transaction anyone can verify on Solscan.

## 2. Procedure (per cycle, e.g. monthly)

1. **Reconcile revenue.** Confirm the amount available in the ops multisig that is genuinely
   revenue for this period. Record the figure and the source.
2. **Buy on the open market.** From the ops multisig, market-buy $GL1TCH on a public venue
   (Jupiter / Raydium). No private OTC, no self-dealing. Record the buy tx signature(s) and the
   $GL1TCH amount received.
3. **Burn.** Send the bought $GL1TCH to the burn address (see §3). Record the burn tx signature.
4. **Publish.** Add the entry to the public ledger (§4) and announce with the tx links. State
   plainly: a buyback is *demand*, not a dividend — no yield is promised.
5. **Verify.** Confirm on Solscan that the burn reduced circulating supply and the tokens are
   unrecoverable.

## 3. Burn address

Use the canonical Solana incinerator (tokens sent here are provably unrecoverable):

```
1nc1nerator11111111111111111111111111111111
```

Alternatively burn via the SPL burn instruction from the multisig-held token account. Either way,
publish the tx signature; the ledger links it to Solscan.

## 4. Recording an entry (populates the public ledger)

The public page `/buyback` reads `src/content/buybacks.ts`. To record a completed cycle, append an
entry (this is the ONLY change that ever makes the ledger show data — it is a record of a real,
already-executed on-chain event, not a promise):

```ts
// src/content/buybacks.ts — append to BUYBACKS (newest first)
{
  date: "2026-08-15",            // ISO date of the burn
  revenueUsd: 0,                 // revenue that funded this cycle (honest figure)
  glitchBurned: 0,               // $GL1TCH amount burned
  buyTx: "<solscan buy sig>",    // public buy transaction signature
  burnTx: "<solscan burn sig>",  // public burn transaction signature
  note: "",                      // optional
}
```

Commit + deploy. The page computes totals and links every signature to Solscan. If the array is
empty (the current state), the page honestly shows "no buybacks yet — activates on real revenue."

## 5. What autonomous work may / may not do

- **May:** maintain the ledger page + this runbook; render whatever real entries you record.
- **May NOT:** execute a buy, execute a burn, move any funds, sign any multisig transaction, invent
  a revenue or burn figure, or add a ledger entry for an event that did not actually happen
  on-chain. All of §2 is founder-executed.

## 6. Honesty rules (non-negotiable)

- Never announce a buyback cadence you won't sustain.
- Never buy from yourself or a related wallet (it's not a real buyback).
- Never present buybacks as a promised return — they are structural demand, nothing more.
- Every figure on the ledger must trace to a public on-chain signature.
