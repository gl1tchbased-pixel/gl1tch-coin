# GL1TCH Pre-Mainnet Checklist (HARD GATE)

Do NOT execute any mainnet transaction until every item is checked.

## Rehearsal
- [ ] `npm run devnet-dry-run` completed end-to-end with Trust Report = PASS.
- [ ] (Path B only) `npm run path-b-launch` on devnet PASSED token creation +
      metadata + revoke + verify, and printed sane pool sizing.

## Token parameters (match whitepaper / Founder OS 3.6 exactly)
- [ ] Name = GL1TCH, Symbol = GL1TCH
- [ ] Decimals = 6
- [ ] Total supply = 1,000,000,000
- [ ] Zero tax confirmed (SPL token, no transfer fee extension)

## Metadata
- [ ] Image + metadata JSON hosted permanently (Arweave/IPFS) and reachable
- [ ] `METADATA_URI` set (or Pump.fun fields finalized for Path A)

## Security
- [ ] Revoke-authorities flow tested on devnet
- [ ] Treasury multisig live; signers confirmed (SECURITY.md)
- [ ] LP burn/lock decision made (Path B: set `LP_ACTION`) or N/A (Pump.fun Path A)
- [ ] (Path B) `PAIRED_SOL` + `PUBLIC_LIQUIDITY_PCT` set; public-liquidity tokens
      are in the pool-creator wallet before running the mainnet pool step
- [ ] No private keys in repo or NEXT_PUBLIC_ env

## Launch readiness
- [ ] Contract-address reveal plan ready (simultaneous X / TG / /links)
- [ ] `official.ts` ready to update CA + flip LAUNCH_STATUS to LIVE
- [ ] `/links` page deploys CA instantly
- [ ] Legal/risk disclaimers live on site + bot
- [ ] RugCheck + SolSniffer links prepared
- [ ] Rollback / incident plan reviewed (SECURITY.md)

> Owner + status per item. Any unchecked item blocks mainnet.
