# Yield X-Ray Faz 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add DEX pools (fee APR measured on-chain) and Tron JustLend USDT, Telegram `/yield` + yield alerts, and make Yield X-Ray discoverable and usable from every relevant place on the site (buttons, how-to, guide, news, share images), then announce it.

**Architecture:** Same as Faz 1 — the bot measures, the site explains. DEX fee APR comes from the pools' own cumulative fee counters (`fee_growth_global` / `feeGrowthGlobal*X128`) between GL1TCH's hourly snapshots — no volume API (DexScreener showed $2B "liquidity" on Raydium pools with $0.3M volume on 2026-10-29). Tron is read through TronGrid's Ethereum-compatible JSON-RPC (`https://api.trongrid.io/jsonrpc`, `eth_call`). Alerts run in the bot right after each hourly collection.

**Tech Stack:** as Faz 1 (bot: Node/TS/grammy/vitest; site: Next 16.4/vitest). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-29-yield-xray-design.md` + founder request 2026-10-29: "sıradakileri yap … sitede buton koymayı unutma, insanlar nasıl kullanacak bunları da tanıt".

## Global Constraints

- Faz 1 constraints still hold (no fund-moving calls, English site copy, no "best/recommended", fractions in code, unknown = null).
- Yield alerts are not token-gated — same rule as Watchtower ("safety is never token-gated"); cap 25 per user.
- Telegram deep link: `https://t.me/gl1tch_infected_bot?start=yield_<id>` (payload ≤ 64 chars, `[a-z0-9-]` ids).
- DEX numbers are labelled **fee APR, full-range position, not compounded**; concentrated positions earn more in range and lose more to impermanent loss — said on every DEX card.
- Tron: TronGrid free tier → sequential calls, ≥ 300 ms apart.

## Review Focus

1. **Fee counters wrap** (u128 / uint256 overflow by design): differences are taken modulo 2^128 / 2^256 — tested in Task 1.
2. **Unknown deep-link payloads** (`/start yield_nope`, `/start ref_123`): unknown yield id → friendly "not found" + list hint; referral payloads still reach the existing handler — tested in Task 4.
3. **Alert spam**: an alert fires once per change (edge-triggered baseline), and never for opportunities still measuring — tested in Task 4.
4. **Share/OG for a missing id or bot down**: OG image falls back to a generic Yield X-Ray card, never throws — checked in Task 6.
5. **Tron rate limit**: a 429/empty result marks the `justlend` source failed (rows carried stale), never writes a 0% APY — tested in Task 2.

---

### Task 1: DEX fee-growth math + adapters (Orca Whirlpool, Uniswap v3)

**Files:** Modify `bot/src/yield/math.ts`, `registry.ts`, `types.ts`, `adapters.ts`, `store.ts` (YieldPoint gains `aux?: string[]`); tests in `math.test.ts`, `adapters.test.ts`.

**Interfaces — produces:**
- `feeApr(prev: { t: number; fee0: bigint; fee1: bigint }, cur: { t: number; fee0: bigint; fee1: bigint; sqrtPrice: bigint }, q: { fee: 64 | 128; sqrt: 64 | 96 }): number | null` — `Δf = (cur − prev) mod 2^(q.fee===64 ? 128 : 256)`; `s = sqrtPrice / 2^q.sqrt`; `ratio = (Δf0/2^q.fee · s² + Δf1/2^q.fee) / (2s)`; APR = `ratio · YEAR_MS / (t1 − t0)`; null when `t1 ≤ t0` or `s ≤ 0`.
- `YieldKind` gains `"dex-lp"`; `YieldOpportunity` gains `ilRisk: "none" | "low" | "high"` (lending/LST/vault `"none"`; DEX from registry `correlated` → `"low"`/`"high"`).
- `DEX_POOLS: { chain; protocol: "orca" | "uniswap-v3"; symbol; pool; tokenA: { symbol; mint/address; decimals }; tokenB: {…}; price: { side: "a" | "b"; key: PriceKey }; correlated: boolean }[]` — Orca JitoSOL-SOL `Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp` (A = SOL 9, B = JitoSOL 9, correlated), Orca SOL-USDC `Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE` (A = SOL 9, B = USDC 6); Uniswap v3 USDC-WETH 0.05% Ethereum `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640` (token0 USDC 6, token1 WETH 18), Base WETH-USDC 0.05% `0xd0b53D9277642d899DF5C87A3966A349A798F224` (token0 WETH 18, token1 USDC 6).
- `readDex(rpc, prices, now, pools = DEX_POOLS): Promise<YieldOpportunity[]>` — Whirlpool account layout (verified 2026-10-29): fee_rate u16 @45, protocol_fee_rate u16 @47, liquidity u128 @49, sqrt_price u128 @65 (Q64.64), mint_a @101, vault_a @133, fee_growth_global_a u128 @165, mint_b @181, vault_b @213, fee_growth_global_b u128 @245; vault balances via `getTokenAccountBalance`. Uniswap v3: `slot0()` 0x3850c7bd (word 0 sqrtPriceX96), `feeGrowthGlobal0X128()` 0xf3058399, `feeGrowthGlobal1X128()` 0x46141319, `fee()` 0xddca3f43, balances via token `balanceOf(pool)`. Returns `method:"growth"`, `apy:null`, `rate:null`, inputs `fee0`, `fee1`, `sqrtPrice`, `feeTier`, and TVL = (amountA + amountB / pB_per_A)·USD(A) or the mirror when B is the priced side, with `pB_per_A = s² · 10^(decA − decB)`.
- Collector: for `kind === "dex-lp"`, history points carry `aux: [fee0, fee1]`; APY = `feeApr` from the 7 d point (±12 h) else 24 h (±3 h); `window` as usual.
- [ ] Failing tests: `feeApr` on a synthetic pool (s = 1, Δf0 = Δf1 = 0.001·2^64 over one day, q 64/64 → ratio 0.001, APR 0.365); wrap-around (`prev.fee0 = 2^128 − 10`, `cur.fee0 = 5` → Δ 15); null for zero span; Whirlpool parse of a recorded account (`fixtures/orca-jitosol-sol.b64`) gives mints SOL/JitoSOL and fee_rate 100; Uniswap adapter with fake RPC returns `ilRisk:"high"`, inputs fee0/fee1, TVL from balances.
- [ ] Implement, run `cd bot && npx vitest run src/yield && npx tsc --noEmit` → PASS; live smoke prints 4 DEX rows with TVL. Commit `feat(yield): DEX pools — fee APR from on-chain fee counters`.

### Task 2: Tron JustLend USDT

**Files:** `registry.ts` (`EvmChain` gains `"tron"`; `EVM_RPC.tron = ["https://api.trongrid.io/jsonrpc"]`; `JUSTLEND = [{ symbol: "USDT", market: "TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd", hex: "0xea09611b57e89d67fbb33a516eb90508ca95a3e5", underlying: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6 }]`), `adapters.ts` (`readJustLend`), `collector.ts` (source `justlend`), tests.

**Interfaces — produces:** `readJustLend(rpc, prices, now, markets = JUSTLEND, pause = 300)`: sequential `supplyRatePerBlock` 0xae9d70b0, `getCash` 0x3b1d21a2, `totalBorrows` 0x47bd3718, `totalReserves` 0x8f840ddd (word 0 of each — delegators append padding); `apy = (1 + rate/1e18 · 28_800)^365 − 1` (Tron 3 s blocks, Compound daily compounding); `tvlUsd = (cash + borrows − reserves)/1e6 · USDC`; `idleShare = cash / (cash + borrows − reserves)`; `method:"rate"`, `window:"live"`, kind `lending`, inputs include the base58 jToken. `readGas` skips tron.
- [ ] Failing tests: fake RPC words → APR from `0x569d4dec` ≈ 1.527% → APY ≈ 1.54%; empty result → throws (source failed, not 0%). Implement, tests PASS, live smoke shows `tron-justlend-usdt`. Commit `feat(yield): Tron JustLend USDT`.

### Task 3: Shared store singleton + alert engine (bot)

**Files:** `bot/src/yield/store.ts` (`export const yieldStore = new YieldStore()`), `bot/src/yield/watch-store.ts`, `bot/src/yield/alerts.ts`, `bot/src/verify/index.ts` (use singleton; `startYieldCollector(yieldStore, createRpc(), (snap) => sendYieldAlerts(bot, snap))`), `collector.ts` (`onSnapshot?` callback after save).

**Interfaces — produces:**
- `YieldWatchStore { load(); add(w: { userId; chatId; id; baseline }): "added" | "exists" | "cap"; remove(userId, id): boolean; forUser(userId): YieldWatch[]; all(); setBaseline(w, b) }`, file `YIELD_WATCH_FILE` / volume `gl1tch-yield-watch.json`; `YieldBaseline = { apy: number | null; tvlUsd: number | null; idleShare: number | null }`.
- `yieldAlertChanges(base: YieldBaseline, cur: YieldOpportunity): string[]` — APY fell to ≤ half (only when base.apy ≥ 0.005), APY < 0 (when base.apy ≥ 0), TVL −30 % or more, lending idle share crossed below 2 %; none while `cur.apy == null` or `cur.stale`.
- `sendYieldAlerts(bot, snap)` — per watch: changes → message with card link; baseline updated after every check where `cur.apy != null` (edge-trigger).
- [ ] Failing tests (`alerts.test.ts`, `watch-store.test.ts`): each trigger; no alert for measuring/stale; small APY noise (0.004 → 0.001) ignored; cap 25; edge-trigger (second identical check → no alert). Implement, PASS. Commit `feat(yield): yield watch store + alert engine`.

### Task 4: Telegram `/yield`

**Files:** `bot/src/yield/telegram.ts` (Composer `yieldCommands`), `bot/src/index.ts` (register before `publicCommands`; `setMyCommands` += `yield`, `yieldwatch`, `yieldwatching`, `yieldunwatch`), `bot/src/keyboards.ts` (start keyboard gains "📈 Yield X-Ray" URL button → `https://gl1tchbased.xyz/yield`).

**Interfaces — produces:** `searchYield(snap, query): YieldOpportunity[]` (case-insensitive match on id, symbol, chain, protocol; max 8; sorted by TVL); `formatYieldLine(o): string`; commands: `/yield` (summary ranges: stablecoins, SOL staking, ETH staking, DEX fee APR + how-to + site link), `/yield <query>`, `/yieldwatch <id>` (baseline from current snapshot), `/yieldwatching`, `/yieldunwatch <id>`; `start` handler: payload `yield_<id>` → subscribe + confirmation, other payloads → `next()`.
- [ ] Failing tests (`telegram.test.ts`, pure helpers only): `searchYield(snap,"usdc")` returns only USDC rows; `"solana"` returns Solana rows; empty query → []; `formatYieldLine` contains APY text, chain label and `https://gl1tchbased.xyz/yield/<id>`, and says "measuring" for null APY; deep-link payload parser `parseYieldPayload("yield_base-aave-v3-usdc") === "base-aave-v3-usdc"`, `parseYieldPayload("ref_123") === null`. Implement, PASS, bot tsc + full tests green. Commit `feat(yield): Telegram /yield, /yieldwatch and deep-link subscribe`.

### Task 5: Site — DEX/Tron support + card actions

**Files:** `src/lib/yield/types.ts` (mirror: `tron`, `dex-lp`, `ilRisk`), `copy.ts` (orca, uniswap-v3, justlend copy; `CHAIN_LABEL.tron`; `KIND_LABEL["dex-lp"] = "DEX pool"`), `risk.ts` (IL: high +20 "The two tokens' prices move independently: impermanent loss can exceed the fees", low +5; dex structure +10), `math.ts` (`ilBreakEvenRatio(apr): { up: number; down: number } | null` — solve `2√r/(1+r) − 1 = −apr`: `k = 1 − apr`, `√r = (1 + √(1 − k²))/k`), `view.ts` (`scanLinks` skips `tron`; `telegramLink(id)`; `shareText(o)`), new `src/components/yield/CardActions.tsx` (client: Watch on Telegram, Share on X, Copy link, Scan, protocol site), `src/components/yield/LpCalculator.tsx` (fees at fee APR for N days + LP vs hold for a price move), `src/app/yield/[id]/page.tsx` (actions bar under the title; DEX section "Fee APR vs impermanent loss" with break-even moves; LpCalculator for dex-lp).
- [ ] Failing tests: `ilBreakEvenRatio(0.0572)` → up ≈ 2.0, down ≈ 0.5; `null` for apr ≥ 1 or ≤ 0; risk for an uncorrelated DEX row includes the IL reason; `telegramLink("base-aave-v3-usdc")` = `https://t.me/gl1tch_infected_bot?start=yield_base-aave-v3-usdc`; `scanLinks` for a tron row = []. Implement, tsc + lint clean. Commit `feat(yield): DEX + Tron on the site, card action bar`.

### Task 6: Discoverability — buttons, how-to, guide, news, share images

**Files:** `src/app/yield/page.tsx` (3-step "How to use" strip with buttons: browse table, open a card, get alerts on Telegram; Telegram `/yield` hint), `src/components/sections/ProductsBento.tsx` (5th card "Yield X-Ray" with live count of opportunities), `src/app/scan/page.tsx` + `src/app/radar/page.tsx` (button to /yield), `src/app/learn/how-to-read-an-apy/page.tsx` (guide in the existing learn format, buttons to /yield, /yield/il, /yield/dollar) + learn index link + sitemap, `src/content/news.ts` (launch entry dated 2026-10-29, tag `product`), `src/app/yield/[id]/opengraph-image.tsx` (ImageResponse 1200×630: name, chain, APY or "measuring", risk level, "Where does this APY come from?"; generic card on any failure), `src/app/yield/opengraph-image.tsx` (generic card).
- [ ] tsc, lint, `npm run build` green; screenshots of /yield (how-to strip), one DEX card, homepage bento, OG image route returns `image/png`. Commit `feat(yield): buttons and how-to across the site, guide, news, share images`.

### Task 7: Ship + announce

- [ ] Full gates (site + bot) → push → PR → CI green → `gh pr merge --merge` → deploy from `coin-deploy` → bot pulls within 5 min.
- [ ] Live checks: `/yield` lists DEX + Tron rows (DEX "measuring" first 24 h), `/start yield_<id>` subscribes (founder's own chat test optional), OG image renders.
- [ ] Announcement pack `pump-pack/YIELD-XRAY-LAUNCH.md` (X post + thread, Telegram post, 3 reply angles) — honest numbers from the live snapshot; post through the existing channels where an automated path exists, otherwise hand to the founder.
