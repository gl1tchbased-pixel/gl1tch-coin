# Pump.fun Launch Runbook (Path A — default)

Pump.fun is UI-driven. This is a checklist, not an automated mint. Verification
is scripted via `scripts/post-launch-verify.ts`.

## Pre-launch
- [ ] Launch wallet funded with SOL (for the dev buy + fees).
- [ ] Token name `GL1TCH`, symbol `GL1TCH`, description, and on-brand image finalized.
- [ ] X + Telegram links ready; `/links` page deploy-ready.
- [ ] `PRE_LAUNCH_CHECKLIST.md` is 100% complete.

## Launch
1. Create the coin on Pump.fun with the finalized name/symbol/image/description.
2. Make the disclosed dev buy (≤3%) — same price as everyone, no hidden wallets.
3. Grab the contract address (CA) immediately.
4. Paste the CA into `src/lib/official.ts` (`CONTRACT_ADDRESS`) on the website,
   flip `CURRENT_LAUNCH_STATUS` to `LIVE`, and deploy.
5. Reveal the CA SIMULTANEOUSLY on X, Telegram, and `/links` (anti-snipe).
6. Pin the CA + official links everywhere.

## Immediately after
- [ ] Run `npm run post-launch-verify` (set the CA) — confirm mint state.
- [ ] Publish RugCheck + SolSniffer links on the Trust Wall.
- [ ] Confirm the CA on `/links` matches the on-chain mint.

## Migration note
Pump.fun auto-migrates liquidity to Raydium at the bonding-curve threshold.
The team does NOT manually create the initial pool on this path.
