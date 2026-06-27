# Liquidity (Path B — self-managed)

The DEFAULT launch is Pump.fun (Path A), which handles the bonding curve and
auto-migrates liquidity to Raydium at the threshold. This folder implements the
OPTIONAL self-managed pool used as the primary Path B launch or a post-Pump.fun
scale-up.

## Scripts
- `poolMath.ts` — pure helpers (allocation → token amount, raw conversion, opening
  price/FDV). Unit-tested in `poolMath.test.ts`.
- `raydiumPool.ts` — creates a **Raydium CPMM** (constant-product) pool pairing
  $GL1TCH with native SOL; prints pool ID, LP mint, and tx id.
- `burnLp.ts` — burns LP tokens so liquidity can never be pulled.

The full sequence is orchestrated by `scripts/path-b-launch.ts` (`npm run path-b-launch`):

```
create mint → metadata → mint full supply → revoke authorities → verify
            → (mainnet only) create CPMM pool → burn/lock LP
```

## Devnet caveat
Raydium's CPMM program is a **mainnet** facility; its devnet deployment is
unreliable. So the devnet rehearsal covers token creation only and **skips** pool
creation (printing the computed pool sizing instead). Run the pool + LP steps on
mainnet-beta with `CONFIRM_MAINNET=true` after the token rehearsal passes.

## LP handling — deliberate choice
Set `LP_ACTION`:
- `burn` (default) — burns LP tokens, proving liquidity is permanent (rug-proof).
- `lock` — skips the burn; you must then lock the LP via a reputable locker and
  publish the lock link.

> Never leave LP tokens sitting in a hot wallet post-launch. Record the burn/lock
> signature and surface it on the Trust Wall.

## Meteora alternative
If you prefer a Meteora DLMM pool instead of Raydium CPMM, create it via Meteora's
official SDK/UI, then record the pool ID + LP position and apply the same LP
burn/lock discipline. (Not bundled — one pool SDK is enough for launch.)
