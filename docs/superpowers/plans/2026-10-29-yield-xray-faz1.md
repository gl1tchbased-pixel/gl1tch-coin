# Yield X-Ray Faz 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship on-chain-verified yield data for ~30 opportunities on 6 chains, collected hourly by the bot and shown on five new `/yield` pages with an explainable risk score and copy-paste verification.

**Architecture:** The bot (`bot/src/yield/`) reads chain state with raw JSON-RPC (no new deps), derives APYs, keeps hourly history in a JSON file store, and serves `GET /yield` + `GET /yield/history?id=` on the existing bridge server. The site (`src/lib/yield/`, `src/app/yield/`) fetches the snapshot (revalidate 300 s) and does all wording, risk scoring and calculators.

**Tech Stack:** Node 22 + TypeScript (bot, vitest), Next.js 16.4 App Router (site, vitest), JSON-RPC over `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-29-yield-xray-design.md`

## Global Constraints

- No new npm dependencies in bot or site.
- No string matching `eth_sendTransaction|sendTransaction\(|setApprovalForAll|increaseAllowance|\.approve\(|signAndSendTransaction` anywhere in `src` or `bot/src` (security CI).
- Site copy English; no "best", "recommended", "guaranteed", "safe" claims; every page carries "Not financial advice."
- APY values are fractions (`0.0457` = 4.57%) everywhere in code; formatting happens only in `src/lib/yield/format.ts`.
- Unknown values are `null`, never `0`.
- Opportunity id = lowercase slug `${chain}-${protocol}-${symbol}` with `[^a-z0-9]+` → `-` (e.g. `base-aave-v3-usdc`, `solana-jito-jitosol`).
- Bot imports use `.js` specifiers; bot tests live next to code as `*.test.ts`; site tests as `src/**/*.test.ts`.

## Review Focus

1. **RPC partially down** (one chain times out): snapshot still publishes the other chains, the failed source shows `ok:false`, its opportunities keep last values with `stale: true` — tested in Task 6.
2. **Bot unreachable from the site**: every `/yield` page renders an explicit "data temporarily unavailable" state, never a crash or empty table — tested in Task 8 (`getYieldSnapshot` returns null) and checked in Task 10.
3. **Bad/unknown id in URL** (`/yield/whatever`, `/yield/%00`): 404 page, bridge rejects ids not matching `^[a-z0-9-]{3,80}$` with 400 — tested in Task 7.
4. **Growth APY on a rate that went down** (vault loss, LST slashing): APY is negative and shown as negative with a hard warning, not clamped to 0 — tested in Tasks 1 and 8.
5. **Bot restarts mid-history / clock gaps**: growth lookup picks the nearest point within tolerance or returns null ("measuring"); never divides by a zero/negative time span — tested in Task 5.

---

### Task 1: Bot yield math + ABI helpers

**Files:**
- Create: `bot/src/yield/math.ts`, `bot/src/yield/abi.ts`
- Test: `bot/src/yield/math.test.ts`, `bot/src/yield/abi.test.ts`

**Interfaces:**
- Produces: `rayAprToApy(ray: bigint): number`, `growthApy(r0: number, t0: number, r1: number, t1: number): number | null`, `epochApy(rateNow: number, ratePrev: number, epochsPerYear: number): number | null`, `epochsPerYear(slotsInEpoch: number, slotsPerSecond: number): number | null`, `YEAR_MS = 365 * 86_400_000`; `pad32(hexOrAddress: string): string` (64 hex chars, no 0x), `words(hex: string): bigint[]`, `wordToAddress(w: bigint): string` (0x + 40 lowercase hex), `encodeCall(selector: string, ...args: string[]): string`.

- [ ] **Step 1: Write failing tests**
  - `rayAprToApy(4_467_000_000_000_000_000_000_000n)` ≈ `0.04568` (±1e-4) (Aave USDC Ethereum 29 Oct: APR 4.467% → APY 4.569%).
  - `growthApy(1.0, 0, 1.01, YEAR_MS/2)` ≈ `0.0201`; returns `null` when `t1 <= t0` or `r0 <= 0`; `growthApy(1.0, 0, 0.99, YEAR_MS)` = `-0.01` (negative kept).
  - `epochApy(1.30876307, 1.30857957, 341)` ≈ `0.0490` (±5e-4) (JitoSOL 29 Oct); `null` when `ratePrev <= 0`.
  - `epochsPerYear(432000, 4.669)` ≈ `341` (±1); `null` for non-positive inputs.
  - `words("0x" + "00".repeat(31) + "2a" + "00".repeat(32))` → `[42n, 0n]`; `pad32("0xA0b8…eB48")` is 64 chars, lowercase, left-padded; `wordToAddress(BigInt("0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c"))` = `"0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c"`; `encodeCall("0x35ea6a75", "0xA0b8…")` = `"0x35ea6a75" + pad32(addr)`.
- [ ] **Step 2: Run `cd bot && npx vitest run src/yield` → FAIL (modules missing)**
- [ ] **Step 3: Implement.** `rayAprToApy` compounds per second: `(1 + apr/31_536_000)^31_536_000 − 1` with `apr = Number(ray) / 1e27`. `growthApy` = `(r1/r0)^(YEAR_MS/(t1−t0)) − 1`. `epochApy` = `(rateNow/ratePrev)^epochsPerYear − 1`.
- [ ] **Step 4: Run tests → PASS**
- [ ] **Step 5: Commit** `feat(yield): bot math + ABI helpers`

### Task 2: SPL stake-pool parser with a real fixture

**Files:**
- Create: `bot/src/yield/spl.ts`, `bot/src/yield/fixtures/jitosol-pool.b64` (base64 of account `Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb`, captured once with `getAccountInfo`)
- Test: `bot/src/yield/spl.test.ts`

**Interfaces:**
- Produces: `parseStakePool(data: Buffer): StakePoolState | null` where `StakePoolState = { poolMint: string; totalLamports: bigint; poolTokenSupply: bigint; lastUpdateEpoch: bigint; lastEpochTotalLamports: bigint; lastEpochPoolTokenSupply: bigint; epochFee: { numerator: bigint; denominator: bigint } }`.

- [ ] **Step 1: Failing test** with the fixture: `poolMint === "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"`, `totalLamports / poolTokenSupply` within (1.2, 1.5), `lastEpochTotalLamports > 0n`, `epochFee.denominator > 0n`; a 100-byte buffer → `null`; buffer with `account_type != 1` → `null`.
- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** Borsh walk. Fixed offsets: account_type @0 (must be 1), pool_mint @162 (32 bytes, base58 via `bs58` already a bot dependency), total_lamports @258, pool_token_supply @266, last_update_epoch @274, lockup 48 bytes, then `epoch_fee` (Fee = 2×u64 denominator, numerator), `next_epoch_fee` FutureEpoch (u8 tag; tag≠0 → +16), `preferred_deposit_validator` Option<Pubkey>, `preferred_withdraw_validator` Option<Pubkey>, `stake_deposit_fee` Fee, `stake_withdrawal_fee` Fee, `next_stake_withdrawal_fee` FutureEpoch, `stake_referral_fee` u8, `sol_deposit_authority` Option<Pubkey>, `sol_deposit_fee` Fee, `sol_referral_fee` u8, `sol_withdraw_authority` Option<Pubkey>, `sol_withdrawal_fee` Fee, `next_sol_withdrawal_fee` FutureEpoch, then `last_epoch_pool_token_supply` u64, `last_epoch_total_lamports` u64. Return `null` on any out-of-range read.
- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat(yield): SPL stake pool parser`

### Task 3: Registry + RPC client

**Files:**
- Create: `bot/src/yield/registry.ts`, `bot/src/yield/rpc.ts`
- Test: `bot/src/yield/registry.test.ts`

**Interfaces:**
- Produces:
  - `type YieldChain = "ethereum" | "base" | "arbitrum" | "bsc" | "robinhood" | "solana"`; `EVM_RPC: Record<Exclude<YieldChain,"solana">, string[]>` (PublicNode first: `https://{ethereum,base,arbitrum-one,bsc,robinhood}-rpc.publicnode.com`; Robinhood second `https://rpc.mainnet.chain.robinhood.com`).
  - `AAVE: { chain; pool; assets: { symbol; address; stable: boolean }[] }[]` — pools: Ethereum `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` (USDC, USDT, WETH, WBTC), Base `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` (USDC, WETH, cbBTC), Arbitrum `0x794a61358D6845594F94dc1DB02A252b5b4814aD` (USDC, USDT, WETH, WBTC), BSC `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` (USDC, USDT, WBNB, BTCB, ETH). Asset addresses as verified in Faz 0 probe 3.
  - `SPL_POOLS: { protocol; symbol; mint; pool }[]` — jito JitoSOL `Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb`; blazestake bSOL `stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi`; jupiter JupSOL `8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr`; binance BNSOL `Hr9pzexrBge3vgmBNRR8u42CNQgBXdHm4UkUN2DH4a7r`; drift dSOL `9mhGNSPArRMHpLDMSmxAvuoizBqtBGqYdT8WGuqgxNdn`; helius hSOL `3wK2g8ZdzAH8FJ7PKr2RcvGh7V9VYson5hrVsJM5Lmws` (mints from Faz 0).
  - `RATE_ASSETS: { chain; protocol; kind: "liquid-staking" | "vault"; symbol; address; rateCall: string; rateDecimals: number; tvl: { kind: "supply-x-rate"; base: "ETH" } | { kind: "total-assets"; assetDecimals: number; base: "USD" }; asset: { symbol; address; decimals } }[]` — Ethereum: lido wstETH `0x7f39…2Ca0` `0x035faf82`; rocket-pool rETH `0xae78…6393` `0xe6aa216c`; coinbase cbETH `0xBe98…9704` `0x3ba0b9a9`; ether-fi weETH `0xCd5f…b7ee` `0x679aefce`; sky sUSDS `0xa393…7bD` `convertToAssets(1e18)` (asset USDS `0xdC035D45d973E3EC169d2276DDab16f1e407384F`, 18). Robinhood (morpho, vault, asset USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` 6 dec, share dec 18, `convertToAssets(1e18)`, `rateDecimals` 6): steakUSDG `0xBeEff033F34C046626B8D0A041844C5d1A5409dd`, nnUSDG `0x99347d5F70D3838763f6Bddcf80304C8aa953B57`, ymvST-USDG `0x8c258F25fc6fBe3f01ccC828E2C3840A46a4a9A2`, PurintaUSDG `0x37788ff0c1d4e45A7FE06BC7e71e0cc00121d0A8`.
  - `CHAINLINK: Record<"ETH"|"SOL"|"BTC"|"BNB"|"USDC", string>` on Ethereum (ETH `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`, SOL `0x4ffC43a60e009B551865A93d232E33Fce9f01507`, BTC `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`, BNB `0x14e613AC84a31f709eadbdF89C6CC390fDc9540A`, USDC `0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6`).
  - `opportunityId(chain, protocol, symbol): string`.
  - `interface Rpc { evmCall(chain, to, data): Promise<string>; evmRaw(chain, method, params): Promise<unknown>; solana(method, params): Promise<unknown> }` and `createRpc(opts?: { solanaUrl?: string; timeoutMs?: number }): Rpc` (tries endpoints in order; 12 s timeout; throws `Error("rpc <chain>: <msg>")` after all fail). `solanaUrl` defaults to `process.env.SOLANA_RPC` then `https://solana-rpc.publicnode.com`. `rpcUrlFor(chain): string` returns the first public URL (used in verify blocks; never the private SOLANA_RPC).
- [ ] **Step 1: Failing test**: all ids unique; every EVM address matches `^0x[0-9a-fA-F]{40}$`; every Solana key is base58 32–44 chars; every chain used has an RPC; `opportunityId("base","aave-v3","USDC") === "base-aave-v3-usdc"`; `rpcUrlFor("solana")` is the PublicNode URL even when `SOLANA_RPC` is set.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat(yield): curated registry + JSON-RPC client`

### Task 4: Adapters (Aave, SPL, rates, prices, network, gas)

**Files:**
- Create: `bot/src/yield/types.ts`, `bot/src/yield/adapters.ts`
- Test: `bot/src/yield/adapters.test.ts` (fake `Rpc` returning recorded hex)

**Interfaces:**
- Consumes: Task 1–3 exports.
- Produces (`types.ts`, the bridge contract, mirrored on the site in Task 8):
  ```ts
  type YieldKind = "lending" | "liquid-staking" | "vault";
  type ApyMethod = "rate" | "epoch" | "growth";
  interface YieldOpportunity { id; chain: YieldChain; protocol: string; kind: YieldKind; symbol: string;
    asset: { symbol; address; decimals }; receipt: { symbol; address } | null; stable: boolean;
    method: ApyMethod; apy: number | null; window: "live" | "epoch" | "24h" | "7d" | null;
    measuredSinceMs: number | null; tvlUsd: number | null; idleShare: number | null; feePct: number | null;
    rate: string | null;                 // exchange rate as decimal string (growth/epoch methods)
    inputs: Record<string, string>; verify: { rpc: string; body: string; read: string };
    stale: boolean; updatedAt: number }
  interface YieldSnapshot { updatedAt: number; opportunities: YieldOpportunity[];
    sources: { id: string; ok: boolean; ms: number; error?: string }[];
    prices: Partial<Record<"ETH"|"SOL"|"BTC"|"BNB"|"USDC", number>>;
    gas: Partial<Record<YieldChain, { gwei: number; nativeUsd: number | null }>>;
    network: { solanaEpochsPerYear: number | null; solanaInflation: number | null; solanaStakedShare: number | null } }
  ```
  - `readPrices(rpc): Promise<YieldSnapshot["prices"]>` (Chainlink `latestRoundData` 0xfeaf968c, answer = word 1, 8 decimals; drop a feed whose `updatedAt` is > 36 h old).
  - `readAave(rpc, entry, now): Promise<YieldOpportunity[]>` — `ADDRESSES_PROVIDER()` 0x0542975c → `getPriceOracle()` 0xfca513a8; per asset `getReserveData` 0x35ea6a75 (word 2 = liquidity rate ray, word 8 = aToken; aToken 0x0 → skip asset), `decimals` 0x313ce567, aToken `totalSupply` 0x18160ddd, asset `balanceOf(aToken)` 0x70a08231, oracle `getAssetPrice` 0xb3596f07 (8 dec). `method:"rate"`, `window:"live"`, `idleShare = idle/supply`.
  - `readSpl(rpc, prices, epochsPerYear, now): Promise<YieldOpportunity[]>` — `getAccountInfo` base64 per pool; `apy = epochApy(rate, lastRate, epochsPerYear)` (method `"epoch"`), `feePct = numerator/denominator`, `tvlUsd = totalLamports/1e9 × SOL`.
  - `readRates(rpc, prices, now): Promise<YieldOpportunity[]>` — rate via `rateCall` (+ `totalSupply` or `totalAssets` 0x01e1d114 for TVL); `apy:null`, `method:"growth"`, `rate` set; stablecoin `base:"USD"` priced at Chainlink USDC (inputs record `"price": "USDC/USD Chainlink (stablecoin proxy)"`).
  - `readSolanaNetwork(rpc): Promise<YieldSnapshot["network"]>` — `getEpochInfo` + `getRecentPerformanceSamples(60)` → `epochsPerYear`; `getInflationRate().validator`; `getSupply` total vs Σ `activatedStake` from `getVoteAccounts` → `solanaStakedShare`.
  - `readGas(rpc): Promise<YieldSnapshot["gas"]>` — `eth_gasPrice` per EVM chain; `nativeUsd` = ETH price (BNB for bsc).
  - Every opportunity's `verify.body` is the exact JSON-RPC body of its main read; `verify.rpc = rpcUrlFor(chain)`.
- [ ] **Step 1: Failing tests** with a fake `Rpc`: Aave USDC entry with liquidity-rate word `4467000000000000000000000` → `apy≈0.04569`, `idleShare` = idle/supply, `tvlUsd` = supply×price; an asset whose aToken word is 0 is omitted; SPL fixture from Task 2 + `epochsPerYear 341` → `apy` in (0.03, 0.08) and `method:"epoch"`; rate asset → `apy:null`, `rate:"1.24748084"`-style string, `verify.body` contains its `rateCall`; stale Chainlink feed (updatedAt 2 days ago) is dropped.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat(yield): on-chain adapters`

### Task 5: History store

**Files:**
- Create: `bot/src/yield/store.ts` · Test: `bot/src/yield/store.test.ts`

**Interfaces:**
- Produces: `class YieldStore { constructor(file?: string); load(): void; snapshot(): YieldSnapshot | null; setSnapshot(s: YieldSnapshot): void; append(id: string, p: YieldPoint, now: number): void; history(id: string): YieldPoint[]; firstSeen(id: string): number | null; nearest(id: string, targetMs: number, toleranceMs: number): YieldPoint | null; save(): void }`, `interface YieldPoint { t: number; apy: number | null; tvlUsd: number | null; rate: string | null }`. Default file per spec (`YIELD_FILE` / volume / `/tmp`).
- [ ] **Step 1: Failing tests** (tmp dir): append 3 points → `history` ordered by `t`; points older than 8 days are thinned to one per UTC day (keep the last of each day); points older than 120 days dropped; `nearest(id, t, tol)` returns the closest point within tolerance and `null` outside it; `save()`+new instance `load()` round-trips; a corrupt file loads as empty without throwing.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat(yield): history store`

### Task 6: Collector

**Files:**
- Create: `bot/src/yield/collector.ts` · Test: `bot/src/yield/collector.test.ts`

**Interfaces:**
- Consumes: adapters (Task 4), `YieldStore` (Task 5).
- Produces: `collect(rpc: Rpc, store: YieldStore, now: number): Promise<YieldSnapshot>` — runs prices + network + gas first, then all adapters with `Promise.allSettled`, records `sources` (`id` = `aave:<chain>`, `spl`, `rates`, `prices`, `solana-network`, `gas`); for each opportunity with `rate`: 7 d growth if `nearest(now−7d, ±12h)` exists → `window:"7d"`, else 24 h growth (`±3h`) → `"24h"`, else keep adapter value (epoch for SPL, `null` for rates); sets `measuredSinceMs = firstSeen(id)`; appends a `YieldPoint` per opportunity; if a source fails, the previous snapshot's opportunities from that source are carried over with `stale:true`; saves store; returns and stores the snapshot. `startYieldCollector(store: YieldStore, rpc?: Rpc): void` runs once after 20 s, then every 60 min (`unref`), logging `[yield] <n> opportunities, <failed> sources failed`.
- [ ] **Step 1: Failing tests** with stub adapters injected via an optional `deps` param: (a) a rate opportunity with points 7 d ago at 1.0 and now 1.001 → `window:"7d"`, `apy≈0.0535`; (b) only a 24 h-old point → `"24h"`; (c) no history → `apy:null`; (d) `aave:base` throws → `sources` has `{id:"aave:base", ok:false}` and the previous snapshot's base Aave rows appear with `stale:true`; (e) a falling rate gives a negative APY.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat(yield): hourly collector`

### Task 7: Bridge endpoints + wiring

**Files:**
- Modify: `bot/src/verify/server.ts` (options + two GET routes), `bot/src/verify/index.ts` (construct `YieldStore`, `startYieldCollector`, pass handlers)
- Test: `bot/src/verify/server-yield.test.ts`

**Interfaces:**
- Produces: `VerifyServerOptions.yield?: { snapshot: () => unknown; history: (id: string) => unknown }`; `GET /yield` → 200 snapshot or 503 `{ ok:false, error:"warming_up" }` when none; `GET /yield/history?id=<id>` → 200 `{ id, points }`, 400 for an id not matching `^[a-z0-9-]{3,80}$`. Responses set `Cache-Control: public, max-age=60`.
- [ ] **Step 1: Failing test** (pattern of `server-revenue.test.ts`): snapshot served; `null` → 503; `/yield/history?id=base-aave-v3-usdc` → points; `?id=../etc` → 400; missing id → 400.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement + wire** · **Step 4: `cd bot && npx tsc --noEmit && npm test` → all green**
- [ ] **Step 5: Live smoke:** `cd bot && NODE_OPTIONS=--use-system-ca npx tsx -e "…collect(createRpc(), new YieldStore('/tmp/y.json'), Date.now())…"` prints ≥ 25 opportunities, Aave Ethereum USDC APY within 1–10 %.
- [ ] **Step 6: Commit** `feat(yield): bridge GET /yield + /yield/history, hourly collector wired`

### Task 8: Site library (types, client, math, risk, copy, format)

**Files:**
- Create: `src/lib/yield/types.ts` (copy of the Task 4 contract), `client.ts`, `math.ts`, `risk.ts`, `copy.ts`, `format.ts`
- Test: `src/lib/yield/math.test.ts`, `risk.test.ts`, `format.test.ts`, `client.test.ts`

**Interfaces:**
- Produces:
  - `getYieldSnapshot(): Promise<YieldSnapshot | null>` (`${SCAN_STATS_URL||https://bot.gl1tchbased.xyz}/yield`, `next:{revalidate:300}`, 8 s timeout, `null` on any failure or shape mismatch), `getYieldHistory(id): Promise<YieldPoint[]>` (`[]` on failure).
  - `math.ts`: `projectValue(amount, apy, days)`, `scenario({ amount, apy, days, priceChange, stable }) → { start, withYield, holdOnly, yieldUsd }`, `impermanentLoss(ratio)` = `2√r/(1+r) − 1`, `lpVsHold(amount, ratio) → { lp, hold }` (50/50 full range: `lp = amount·√r`, `hold = amount·(1+r)/2`), `breakEvenDays(costUsd, amount, apy) → number | null` (null when apy ≤ 0), `ENTRY_EXIT_GAS = 446_000`, `gasCostUsd(gwei, nativeUsd)`.
  - `risk.ts`: `riskOf(o: YieldOpportunity): { score: number; level: "low"|"moderate"|"elevated"|"high"; reasons: { points: number; text: string }[]; warnings: string[] }` with weights in an exported `RISK_WEIGHTS` const: depth (tvl null 15, <1M 25, <10M 15, <100M 5), exit (lending idle <5% 20, <15% 8; liquid-staking 5; vault 10), maturity (apy null 10, window 24h 8, epoch 3), outlier (stable & apy>0.15 → 25; non-stable & apy>0.20 → 20), structure (vault 10, liquid-staking 5, lending 5), young chain (robinhood 5), stale 10. Levels: ≤20 low, ≤40 moderate, ≤60 elevated, else high. Warnings: apy>1 "Over 100% APY", apy<0 "Value went down over the measured window", tvl<100k "Under $100K deposited", lending idle<2% "Almost nothing can be withdrawn right now".
  - `copy.ts`: `PROTOCOLS: Record<string, { name; url; income: string; exit: string }>` for aave-v3, jito, blazestake, jupiter, binance, drift, helius, lido, rocket-pool, coinbase, ether-fi, sky, morpho; `KIND_LABEL`, `CHAIN_LABEL` (Robinhood Chain, BNB Chain…), `METHOD_TEXT` (how each method measures).
  - `format.ts`: `pct(x: number | null, digits=2)` → `"4.57%"`/`"—"`, `usd(x)` → `$2.34B`/`$190.1M`/`$62.4K`/`—`, `ago(ms, now)`.
- [ ] **Step 1: Failing tests**: `impermanentLoss(2)` ≈ `-0.0572`; `lpVsHold(1000, 0.5)` → lp ≈ 707.1, hold 750; `scenario({amount:1000, apy:0.0493, days:365, priceChange:-0.3, stable:false}).withYield` ≈ 734.5; `breakEvenDays(0.5, 200, 0.0467)` ≈ 19.5 and `null` for apy 0; `riskOf` of a $2.3B Aave USDC row with idle 5.5% → level "low" and a reason mentioning withdrawals; a $11K vault at apy 6.39 → level "high" with warnings "Over 100% APY" and "Under $100K deposited"; negative apy → warning present; `pct(0.04569)` = `"4.57%"`, `pct(null)` = `"—"`, `usd(2_343_400_000)` = `"$2.34B"`; `getYieldSnapshot` with `fetch` mocked to reject → `null`, to return `{}` → `null`.
- [ ] **Step 2: Run `npx vitest run src/lib/yield` → FAIL** · **Step 3: Implement** · **Step 4: PASS**
- [ ] **Step 5: Commit** `feat(yield): site data client, calculators, explainable risk score`

### Task 9: Robinhood Chain in the token scanner

**Files:**
- Modify: `src/lib/scan-multichain.ts:14-37` (`GOPLUS_CHAIN.robinhood = "4663"`, `CHAIN_LABEL.robinhood = "Robinhood Chain"`)
- Test: extend the nearest existing scan-multichain test, or add `src/lib/scan-multichain.test.ts` asserting both entries.
- [ ] Steps: failing test → add entries → `npx vitest run src/lib/scan-multichain` PASS → commit `feat(scan): Robinhood Chain via GoPlus 4663`.

### Task 10: `/yield` map + `/yield/[id]` X-Ray card

**Files:**
- Create: `src/app/yield/page.tsx`, `src/app/yield/[id]/page.tsx`, `src/app/yield/yield.module.css`, `src/components/yield/YieldTable.tsx` (client: chain / kind / stable filters, sort by risk ↑ default, TVL, APY), `src/components/yield/YieldCalculator.tsx` (client: amount, days, price change slider for non-stables, entry+exit cost prefilled from `gas`), `src/components/yield/Sparkline.tsx` (server SVG from history), `src/components/yield/VerifyBlock.tsx` (shows `verify.rpc` + `verify.body` as a copyable `curl` command and `verify.read`), `src/components/yield/RiskPanel.tsx`.

**Interfaces:**
- Consumes: Task 8 exports.
- Pages: `export const revalidate = 300`; metadata via `shareMeta`; `[id]` uses `params: Promise<{ id: string }>`, `notFound()` when id isn't in the snapshot; when the snapshot is `null` both pages render a "Data is temporarily unavailable — the collector refreshes hourly" panel (HTTP 200, no table).
- Card sections, in order: header (symbol, protocol, chain, kind, stale badge); "Where the yield comes from" (`copy.ts` income); APY + window + method text + measuring note with `measuredSinceMs`; TVL; exit (idle share for lending); fee; RiskPanel; YieldCalculator; Sparkline (≥2 points); VerifyBlock; token scan links (`/scan?t=<chain>:<address>` for asset and receipt, skipped for `native`); footer "Not financial advice. GL1TCH never asks you to sign or deposit anything."
- [ ] **Step 1:** Implement components and pages.
- [ ] **Step 2:** `npx tsc --noEmit` clean; `npm run lint` clean for new files.
- [ ] **Step 3:** Real-data check: `scripts/yield-local-bridge.mjs` is not committed; in the scratchpad run a tiny script that does one `collect()` into a temp store and serves it with `createVerifyServer({ …, yield })` on `127.0.0.1:8799`; then `SCAN_STATS_URL=http://127.0.0.1:8799 npm run dev` and open `/yield`, one lending card, one SPL card, one measuring vault card in Chrome; also stop the local bridge and confirm the unavailable panel. Add `findOpportunity(snapshot, id)` to `client.ts` with a test (hit, miss, null snapshot).
- [ ] **Step 4: Commit** `feat(yield): /yield map and X-Ray card`

### Task 11: `/yield/staking`, `/yield/dollar`, `/yield/il`

**Files:**
- Create: `src/app/yield/staking/page.tsx` (SOL LSTs and ETH LSTs side by side: APY, window, TVL, fee; network base rate line "Solana network reward ≈ inflation ÷ staked share, before commission" when both inputs exist), `src/app/yield/dollar/page.tsx` (stable rows grouped by chain with plain SVG bars, each row links to its card, intro "Same dollar, different yield — tap a row to see why"), `src/app/yield/il/page.tsx` + `src/components/yield/IlPlayground.tsx` (client slider 0.1×–10× price ratio → LP value, hold value, IL %, using `lpVsHold`/`impermanentLoss`).
- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit`, lint clean. **Step 3: Commit** `feat(yield): staking compare, dollar map, IL playground`

### Task 12: Discovery, verification, ship

**Files:**
- Modify: `src/app/sitemap.ts` (add `/yield`, `/yield/staking`, `/yield/dollar`, `/yield/il`), the main nav/footer component that links `/radar` (add "Yield X-Ray" → `/yield`).
- [ ] **Step 1:** Full gates: `npx tsc --noEmit && npm test && npm run lint && npm run build` (site) and `cd bot && npx tsc --noEmit && npm test`; security grep from CI passes locally.
- [ ] **Step 2:** Push branch, open PR (body ends with the Claude Code line), wait for CI green, `gh pr merge <n> --merge`.
- [ ] **Step 3:** Deploy site from `C:\Users\MSI\Desktop\coin-deploy`: `git fetch; git checkout --detach origin/main; NODE_OPTIONS=--use-system-ca npx vercel --prod --yes`. Bot auto-pulls main on Oracle; confirm with `ssh … 'sudo -n -u gl1tch git -C /opt/gl1tch/app log -1'`.
- [ ] **Step 4:** Live checks: `curl https://bot.gl1tchbased.xyz/yield` lists ≥ 25 opportunities after the first run; `/yield`, `/yield/base-aave-v3-usdc`, `/yield/staking`, `/yield/dollar`, `/yield/il` return 200; one card's `curl` verify command, run by hand, returns the same raw word the card shows.
