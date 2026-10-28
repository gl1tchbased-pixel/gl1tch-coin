# Verdict anchoring (v1)

GL1TCH seals every Rug Radar sweep on Solana. Afterwards anyone can prove that a verdict ("token X was
RUG-SHAPED, score 22") existed at that time and hasn't been edited since, without trusting GL1TCH's servers.

**Status:** live on Solana mainnet since 25 October 2026. The attester is
`BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o`, a fee-only wallet that holds no tokens. Its address is pinned in
`src/lib/official.ts` and published at `/attest/info` and on [/proof](https://gl1tchbased.xyz/proof).

## What gets sealed

Each sweep is a list of records:

```json
{"v":1,"chain":"solana","mint":"<address>","verdict":"RUG-SHAPED","score":22,"scannedAt":1792540803000,"engine":"gl1tch-scan-v1"}
```

The key order above is the canonical encoding (JSON, no whitespace). `score` is an integer 0–100, `scannedAt` is
in ms. Verdicts: `CLEAN`, `LOW RISK`, `CAUTION`, `HIGH RISK`, `RUG-SHAPED`, `UNKNOWN`.

```
leaf = sha256(0x00 || canonical JSON)
node = sha256(0x01 || left || right)     an odd node at the end of a level is carried up unchanged
```

The Merkle root goes on-chain in one SPL Memo transaction:

```
gl1tch:radar:v1:<root hex>:<record count>:<sweep start ms>
```

Two independent implementations, `bot/src/attest/merkle.ts` (node:crypto) and `src/lib/attest/merkle.ts`
(@noble/hashes, runs in the browser), are held identical by the same locked test vectors.

## How to verify a verdict yourself

The easy way: [gl1tchbased.xyz/verify-scan](https://gl1tchbased.xyz/verify-scan). Your browser does every step
below on your own device, reading the seal from a Solana RPC you can choose. It can also check a downloaded proof
file, so a proof stays checkable even if GL1TCH goes offline. By hand:

1. Get its proof: `GET https://bot.gl1tchbased.xyz/attest/proof?chain=solana&mint=<address>`.
   Each entry has the `record`, its Merkle `proof`, the `root`, `count`, `sweepMs` and, once sealed, the `anchor`
   transaction.
2. Recompute the leaf from the record and fold the proof up to the root. It must equal `root`. (Or fetch the
   whole sweep with `GET /attest/batch?root=<root>` and rebuild the tree.)
3. Fetch the anchor transaction from any Solana RPC at `finalized` commitment and check that:
   - its fee payer and only signer is the attester address published at `/attest/info`;
   - it holds exactly one instruction, to the Memo program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`;
   - the memo is `gl1tch:radar:v1:<root>:<count>:<sweepMs>` with the same values.

The block time of that transaction is when the verdict was sealed. `scannedAt` is when the scan ran.

## Who signs, and how it's kept safe

The attester is the only GL1TCH component that signs a transaction. It signs its own memos, never a user's
transaction, and never moves anyone's funds. Every control below refuses on its own:

| Control | What it stops |
|---|---|
| Runs as a scheduled GitHub Actions job in a protected environment, never on the bot's host | a compromised bot host leaking the key |
| RPC genesis hash must match `ATTEST_CLUSTER` | a test setup signing on mainnet, or the reverse |
| Signer pinned in code (`PINNED_ATTESTER`, kept equal to the site's `ATTESTER_WALLET` by a test): on mainnet the run signs with that key only | pointing the attester at a real wallet by changing a setting |
| Wallet balance: refuses below the fee floor or above 2 SOL, warns above 0.25 SOL; token accounts aren't read (anyone can open one or send dust) | an over-funded hot key, without a cheap way for strangers to halt sealing |
| Flood-proof history: pages back over the window; verifies at most 120 transactions a run and 3 copies per root; if the last 24 h can't be read or counted, one anchor that run | strangers burying our anchors or stalling the run with copied memos |
| Re-validates every record and recomputes the root; trusts nothing the bot sends | a compromised bot getting garbage sealed |
| Allowlist on the compiled message: one Memo instruction, attester-paid, no other accounts | anything but a memo being signed |
| Fee cap, then simulation of the exact signed bytes with a balance-change cap | an unexpected spend |
| Caps: 6 per run, 100 per rolling 24 h (two per run when the last 24 h can't be read or counted) | a runaway loop |
| The runner reports each anchor to the bot (POST /attest/link); the bot verifies it on-chain and links it once finalized | copied memos holding a sweep unlinked |
| Circuit breaker: 3 consecutive failures halt the run (the job fails, so it's noticed) | repeated faults |
| Idempotent: skips a sweep already sealed on-chain (checks up to 3 copies of its memo; past that it seals again rather than skip) | double sealing, without letting copies block a sweep |
| Every decision is audit-logged (the job log); the key is never logged | silent failures |
| CI fails if any code outside `bot/src/attest/` can sign, or if the attester builds anything but a memo | the rules eroding over time |

The memo text alone proves nothing. Anyone can attach the same text to a transaction that mentions the attester.
So the bot links an anchor, and the runner treats a sweep as sealed, only after fetching the transaction and
checking its signer. If the key is ever stolen, the address is rotated and the new one is published. Roots sealed
before the rotation stay checkable against the old address.

## Moving parts

- **Site** (`src/app/api/radar`): after each sweep, posts all its verdicts to the bot (shared-token auth).
- **Bot** (`bot/src/attest/store.ts`, `linker.ts`): validates and stores sweeps in an append-only file, serves
  proofs, and links finalized anchors by reading the attester's public history. It holds no key.
- **Runner** (`bot/src/attest/run.ts`, `.github/workflows/attest.yml`): fetches pending sweeps, applies the controls
  above, and seals them.
- **Verifier page** (`src/app/verify-scan`, `src/lib/attest/verify.ts`): runs the checks above in the browser.
  The attester address it trusts is pinned in `src/lib/official.ts` (`ATTESTER_WALLET`), so any change shows up
  in git history.
- **Devnet check** (`bot/e2e/attest-devnet.ts`, `npm run attest:e2e` in `bot/`): the whole loop against devnet.
