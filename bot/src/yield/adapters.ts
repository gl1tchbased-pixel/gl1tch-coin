import { encodeCall, words, wordToAddress } from "./abi.js";
import { epochApy, epochsPerYear, rayAprToApy } from "./math.js";
import { parseStakePool } from "./spl.js";
import {
  AAVE,
  CHAINLINK,
  EVM_RPC,
  RATE_ASSETS,
  SPL_POOLS,
  opportunityId,
  rpcUrlFor,
  type EvmChain,
  type RateAsset,
} from "./registry.js";
import type { Rpc } from "./rpc.js";
import type { Gas, Prices, PriceKey, SolanaNetwork, YieldOpportunity } from "./types.js";

/** Function selectors used by the adapters. */
export const SEL = {
  latestRoundData: "0xfeaf968c",
  addressesProvider: "0x0542975c",
  getPriceOracle: "0xfca513a8",
  getReserveData: "0x35ea6a75",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231",
  getAssetPrice: "0xb3596f07",
  totalAssets: "0x01e1d114",
} as const;

const FEED_MAX_AGE_MS = 36 * 3_600_000;
const ZERO_ADDRESS = "0x" + "0".repeat(40);

const rpcBody = (method: string, params: unknown[]) => JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
const evmVerify = (chain: EvmChain, to: string, data: string, read: string) => ({
  rpc: rpcUrlFor(chain),
  body: rpcBody("eth_call", [{ to, data }, "latest"]),
  read,
});
const word0 = async (rpc: Rpc, chain: EvmChain, to: string, data: string) => words(await rpc.evmCall(chain, to, data))[0] ?? 0n;
const scaled = (raw: bigint, decimals: number) => Number(raw) / 10 ** decimals;

/** Chainlink USD prices; a feed that hasn't updated for 36 h is left out rather than trusted. */
export async function readPrices(rpc: Rpc, now: number): Promise<Prices> {
  const out: Prices = {};
  await Promise.allSettled(
    (Object.entries(CHAINLINK) as [PriceKey, string][]).map(async ([key, feed]) => {
      const w = words(await rpc.evmCall("ethereum", feed, SEL.latestRoundData));
      const answer = w[1], updatedAt = Number(w[3] ?? 0n) * 1000;
      if (!answer || now - updatedAt > FEED_MAX_AGE_MS) return;
      out[key] = scaled(answer, 8);
    })
  );
  return out;
}

/** Aave v3 supply markets on one chain: live supply APY, deposits, and the share that can be withdrawn now. */
export async function readAave(rpc: Rpc, entry: (typeof AAVE)[number], now: number): Promise<YieldOpportunity[]> {
  const { chain, pool } = entry;
  const provider = wordToAddress(await word0(rpc, chain, pool, SEL.addressesProvider));
  const oracle = wordToAddress(await word0(rpc, chain, provider, SEL.getPriceOracle));
  const rows = await Promise.all(
    entry.assets.map(async (asset): Promise<YieldOpportunity | null> => {
      const reserveCall = encodeCall(SEL.getReserveData, asset.address);
      const w = words(await rpc.evmCall(chain, pool, reserveCall));
      if (w.length < 9) return null;
      const aToken = wordToAddress(w[8]);
      if (aToken === ZERO_ADDRESS) return null; // not a reserve on this chain
      const liquidityRate = w[2];
      const [decRaw, supplyRaw, idleRaw, priceRaw] = await Promise.all([
        word0(rpc, chain, asset.address, SEL.decimals),
        word0(rpc, chain, aToken, SEL.totalSupply),
        word0(rpc, chain, asset.address, encodeCall(SEL.balanceOf, aToken)),
        word0(rpc, chain, oracle, encodeCall(SEL.getAssetPrice, asset.address)),
      ]);
      const decimals = Number(decRaw);
      const supplied = scaled(supplyRaw, decimals);
      const price = scaled(priceRaw, 8);
      return {
        id: opportunityId(chain, "aave-v3", asset.symbol),
        chain,
        protocol: "aave-v3",
        kind: "lending",
        symbol: asset.symbol,
        asset: { symbol: asset.symbol, address: asset.address, decimals },
        receipt: { symbol: "aToken", address: aToken },
        stable: asset.stable,
        method: "rate",
        apy: rayAprToApy(liquidityRate),
        window: "live",
        measuredSinceMs: null,
        tvlUsd: price > 0 ? supplied * price : null,
        idleShare: supplied > 0 ? scaled(idleRaw, decimals) / supplied : null,
        feePct: null,
        rate: null,
        inputs: {
          liquidityRateRay: liquidityRate.toString(),
          aToken,
          decimals: String(decimals),
          aTokenTotalSupply: supplyRaw.toString(),
          idleBalance: idleRaw.toString(),
          oracle,
          oraclePriceUsd8: priceRaw.toString(),
        },
        verify: evmVerify(
          chain,
          pool,
          reserveCall,
          "Word 2 of the result is currentLiquidityRate: the supply APR in ray (1e27). APY = (1 + APR / 31,536,000)^31,536,000 − 1."
        ),
        stale: false,
        updatedAt: now,
      };
    })
  );
  return rows.filter((r): r is YieldOpportunity => r !== null);
}

/** Solana liquid-staking pools: the pool account stores both today's rate and the rate one epoch ago. */
export async function readSpl(
  rpc: Rpc,
  prices: Prices,
  epochsPerYearN: number | null,
  now: number,
  pools = SPL_POOLS
): Promise<YieldOpportunity[]> {
  const settled = await Promise.allSettled(
    pools.map(async (p): Promise<YieldOpportunity> => {
      const params = [p.pool, { encoding: "base64" }];
      const res = (await rpc.solana("getAccountInfo", params)) as { value: { data: [string, string] } | null };
      if (!res?.value) throw new Error(`${p.symbol}: account missing`);
      const s = parseStakePool(Buffer.from(res.value.data[0], "base64"));
      if (!s || s.poolTokenSupply === 0n || s.lastEpochPoolTokenSupply === 0n) throw new Error(`${p.symbol}: unreadable pool`);
      const rate = Number(s.totalLamports) / Number(s.poolTokenSupply);
      const prev = Number(s.lastEpochTotalLamports) / Number(s.lastEpochPoolTokenSupply);
      return {
        id: opportunityId("solana", p.protocol, p.symbol),
        chain: "solana",
        protocol: p.protocol,
        kind: "liquid-staking",
        symbol: p.symbol,
        asset: { symbol: "SOL", address: "native", decimals: 9 },
        receipt: { symbol: p.symbol, address: p.mint },
        stable: false,
        method: "epoch",
        apy: epochsPerYearN ? epochApy(rate, prev, epochsPerYearN) : null,
        window: "epoch",
        measuredSinceMs: null,
        tvlUsd: prices.SOL ? scaled(s.totalLamports, 9) * prices.SOL : null,
        idleShare: null,
        feePct: s.epochFee.denominator > 0n ? Number(s.epochFee.numerator) / Number(s.epochFee.denominator) : null,
        rate: rate.toPrecision(15),
        inputs: {
          pool: p.pool,
          totalLamports: s.totalLamports.toString(),
          poolTokenSupply: s.poolTokenSupply.toString(),
          lastEpochTotalLamports: s.lastEpochTotalLamports.toString(),
          lastEpochPoolTokenSupply: s.lastEpochPoolTokenSupply.toString(),
          lastUpdateEpoch: s.lastUpdateEpoch.toString(),
          epochsPerYear: epochsPerYearN ? epochsPerYearN.toFixed(1) : "unknown",
        },
        verify: {
          rpc: rpcUrlFor("solana"),
          body: rpcBody("getAccountInfo", params),
          read: "SPL stake pool (Borsh): total_lamports ÷ pool_token_supply is today's rate; last_epoch_total_lamports ÷ last_epoch_pool_token_supply is the rate one epoch ago. APY = (today ÷ previous)^(epochs per year) − 1.",
        },
        stale: false,
        updatedAt: now,
      };
    })
  );
  const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!ok.length && settled.length) throw new Error((settled[0] as PromiseRejectedResult).reason?.message ?? "spl failed");
  return ok;
}

/** Exchange-rate yields (ETH liquid staking, ERC-4626 vaults). The APY is filled in by the collector from history. */
export async function readRates(rpc: Rpc, prices: Prices, now: number, assets: RateAsset[] = RATE_ASSETS): Promise<YieldOpportunity[]> {
  const settled = await Promise.allSettled(
    assets.map(async (r): Promise<YieldOpportunity> => {
      const rateRaw = await word0(rpc, r.chain, r.address, r.rateCall);
      if (rateRaw === 0n) throw new Error(`${r.symbol}: zero rate`);
      const rate = scaled(rateRaw, r.rateDecimals);
      const inputs: Record<string, string> = { rateRaw: rateRaw.toString(), rateDecimals: String(r.rateDecimals) };
      let tvlUsd: number | null = null;
      if (r.tvl.kind === "supply-x-rate") {
        const supplyRaw = await word0(rpc, r.chain, r.address, SEL.totalSupply);
        inputs.totalSupply = supplyRaw.toString();
        inputs.price = "ETH/USD Chainlink";
        if (prices.ETH) tvlUsd = scaled(supplyRaw, 18) * rate * prices.ETH;
      } else {
        const assetsRaw = await word0(rpc, r.chain, r.address, SEL.totalAssets);
        inputs.totalAssets = assetsRaw.toString();
        inputs.price = "USDC/USD Chainlink (stablecoin proxy)";
        if (prices.USDC) tvlUsd = scaled(assetsRaw, r.tvl.assetDecimals) * prices.USDC;
      }
      return {
        id: opportunityId(r.chain, r.protocol, r.symbol),
        chain: r.chain,
        protocol: r.protocol,
        kind: r.kind,
        symbol: r.symbol,
        asset: r.asset,
        receipt: { symbol: r.symbol, address: r.address },
        stable: r.tvl.base === "USD",
        method: "growth",
        apy: null,
        window: null,
        measuredSinceMs: null,
        tvlUsd,
        idleShare: null,
        feePct: null,
        rate: rate.toPrecision(15),
        inputs,
        verify: evmVerify(
          r.chain,
          r.address,
          r.rateCall,
          `The result is the underlying amount for the share amount in the call; divided by 10^${r.rateDecimals} it is the exchange rate (underlying per 1 ${r.symbol}). The yield is the growth of this rate between GL1TCH's hourly snapshots, annualized.`
        ),
        stale: false,
        updatedAt: now,
      };
    })
  );
  const ok = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  if (!ok.length && settled.length) throw new Error((settled[0] as PromiseRejectedResult).reason?.message ?? "rates failed");
  return ok;
}

/** Solana epoch length, validator inflation and the staked share of supply — the network's base staking reward. */
export async function readSolanaNetwork(rpc: Rpc): Promise<SolanaNetwork> {
  const safe = async <T,>(f: () => Promise<T>): Promise<T | null> => {
    try {
      return await f();
    } catch {
      return null;
    }
  };
  const [epy, inflation, stakedShare] = await Promise.all([
    safe(async () => {
      const e = (await rpc.solana("getEpochInfo", [])) as { slotsInEpoch: number };
      const perf = (await rpc.solana("getRecentPerformanceSamples", [60])) as { numSlots: number; samplePeriodSecs: number }[];
      const secs = perf.reduce((a, p) => a + p.samplePeriodSecs, 0);
      return secs > 0 ? epochsPerYear(e.slotsInEpoch, perf.reduce((a, p) => a + p.numSlots, 0) / secs) : null;
    }),
    safe(async () => ((await rpc.solana("getInflationRate", [])) as { validator: number }).validator),
    safe(async () => {
      const supply = (await rpc.solana("getSupply", [{ excludeNonCirculatingAccountsList: true }])) as { value: { total: number } };
      const votes = (await rpc.solana("getVoteAccounts", [])) as { current: { activatedStake: number }[]; delinquent: { activatedStake: number }[] };
      const staked = [...votes.current, ...votes.delinquent].reduce((a, v) => a + v.activatedStake, 0);
      return supply.value.total > 0 ? staked / supply.value.total : null;
    }),
  ]);
  return { solanaEpochsPerYear: epy, solanaInflation: inflation, solanaStakedShare: stakedShare };
}

/** Current gas price per EVM chain, with the USD price of the coin gas is paid in. */
export async function readGas(rpc: Rpc, prices: Prices): Promise<Gas> {
  const out: Gas = {};
  await Promise.allSettled(
    (Object.keys(EVM_RPC) as EvmChain[]).map(async (chain) => {
      const hex = (await rpc.evmRaw(chain, "eth_gasPrice", [])) as string;
      out[chain] = { gwei: Number(BigInt(hex)) / 1e9, nativeUsd: (chain === "bsc" ? prices.BNB : prices.ETH) ?? null };
    })
  );
  return out;
}
