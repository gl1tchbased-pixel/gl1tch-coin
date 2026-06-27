# GL1TCH — Wallet & Key Security

## Wallet topology
- **Treasury multisig** (e.g. Squads, 2-of-3): holds any team/treasury allocation
  and long-term funds. NOT a single hot wallet. Signers + threshold documented below.
- **Launch / fee-payer hot wallet**: funded with only what's needed for launch ops
  (dev buy + fees). Short-lived, low balance.
- **Give-back wallet**: dedicated, public, freshly generated; published on `/links`.

## Signers (fill before launch)
| Role | Holder | Device |
|---|---|---|
| Signer 1 | {{SIGNER_1}} | Hardware wallet |
| Signer 2 | {{SIGNER_2}} | Hardware wallet |
| Signer 3 | {{SIGNER_3}} | Hardware wallet |

Threshold: **2 of 3**.

## Key handling rules
- Hardware wallets for all signers. No plaintext seed phrases anywhere.
- Keypair JSON files live in `onchain/keys/` and are **gitignored** — never committed.
- No private keys in any `NEXT_PUBLIC_` env var or the website bundle.
- No keys in cloud notes, screenshots, or chat.

## Incident plan (key compromise)
1. Move treasury funds via the multisig to a fresh multisig (signers rotate keys).
2. Announce through official channels; pin a warning.
3. The token itself is unaffected — mint/freeze authorities are revoked, so supply
   and holder balances cannot be altered by a compromised operational key.
4. Rotate the launch/give-back wallets; update `/links` and `official.ts`.
