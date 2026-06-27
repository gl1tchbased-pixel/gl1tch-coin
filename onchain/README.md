# GL1TCH On-Chain Workspace

Token creation, security hardening, and verification scripts. Separate from the
Next.js app. **Secrets and keypairs never leave this machine and are gitignored.**

## Setup
1. `cd onchain && npm install`
2. `cp .env.example .env` and fill it. Default cluster is **devnet**.
3. Create keypairs (kept out of git):
   ```
   mkdir -p keys
   solana-keygen new -o keys/fee-payer.json
   ```

## Runbook
1. **Rehearse on devnet (required):** `npm run devnet-dry-run`
   Runs create → mint full supply → revoke mint+freeze → verify, and prints a Trust Report.
2. **Launch:** follow `src/pumpfun/launchNotes.md` (Pump.fun, Path A) — UI-driven.
3. **Verify any time:** `npm run post-launch-verify -- <MINT_ADDRESS>`
4. **Self-managed pool (optional, later):** see `src/liquidity/README.md`.

## Safety gates
- Mainnet transactions require `SOLANA_CLUSTER=mainnet-beta` AND `CONFIRM_MAINNET=true`.
- The dry-run refuses to run on mainnet.
- Authorities are revoked only AFTER full supply is minted.
- See `SECURITY.md` and `PRE_LAUNCH_CHECKLIST.md`.

## Files
- `src/token/createMint.ts` · `mintSupply.ts` · `revokeAuthorities.ts` · `verify.ts`
- `src/token/metadata.md` — metadata runbook (Metaplex)
- `src/liquidity/burnLp.ts` · `README.md`
- `src/pumpfun/launchNotes.md`
- `scripts/devnet-dry-run.ts` · `post-launch-verify.ts`
