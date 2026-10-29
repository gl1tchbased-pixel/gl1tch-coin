import bs58 from "bs58";
import { encodeCall, words } from "./abi.js";
import { DEX_POOLS, opportunityId, rpcUrlFor, type DexPool, type EvmChain } from "./registry.js";
import type { Rpc } from "./rpc.js";
import type { Prices, YieldOpportunity } from "./types.js";

/**
 * DEX pools for Yield X-Ray. No volume API (third-party liquidity figures were off by 1000× on 2026-10-29):
 * GL1TCH reads each pool's cumulative fee counters and its price, and the collector turns two snapshots into
 * the fee APR of a full-range position (math.ts feeApr).
 */

export const DEX_SEL = {
  slot0: "0x3850c7bd",
  feeGrowth0: "0xf3058399",
  feeGrowth1: "0x46141319",
  fee: "0xddca3f43",
  balanceOf: "0x70a08231",
} as const;

export interface WhirlpoolState {
  feeRate: number;
  protocolFeeRate: number;
  liquidity: bigint;
  sqrtPrice: bigint;
  mintA: string;
  vaultA: string;
  feeGrowthA: bigint;
  mintB: string;
  vaultB: string;
  feeGrowthB: bigint;
}

const u128 = (b: Buffer, o: number) => b.readBigUInt64LE(o) + (b.readBigUInt64LE(o + 8) << 64n);
const key = (b: Buffer, o: number) => bs58.encode(b.subarray(o, o + 32));

/** Orca Whirlpool account (Anchor). Offsets verified against live pools on 2026-10-29. */
export function parseWhirlpool(data: Buffer): WhirlpoolState | null {
  if (data.length < 261) return null;
  return {
    feeRate: data.readUInt16LE(45),
    protocolFeeRate: data.readUInt16LE(47),
    liquidity: u128(data, 49),
    sqrtPrice: u128(data, 65),
    mintA: key(data, 101),
    vaultA: key(data, 133),
    feeGrowthA: u128(data, 165),
    mintB: key(data, 181),
    vaultB: key(data, 213),
    feeGrowthB: u128(data, 245),
  };
}

const rpcBody = (method: string, params: unknown[]) => JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
const pctTier = (hundredthsOfBp: number) => `${(hundredthsOfBp / 1e4).toFixed(2)}%`;

interface PoolRead {
  fee0: bigint;
  fee1: bigint;
  sqrtPrice: bigint;
  q: "64/64" | "128/96";
  feeTier: number;
  amountA: number;
  amountB: number;
  verify: YieldOpportunity["verify"];
}

async function readOrca(rpc: Rpc, p: DexPool): Promise<PoolRead> {
  const params = [p.pool, { encoding: "base64" }];
  const res = (await rpc.solana("getAccountInfo", params)) as { value: { data: [string, string] } | null };
  if (!res?.value) throw new Error(`${p.symbol}: account missing`);
  const s = parseWhirlpool(Buffer.from(res.value.data[0], "base64"));
  if (!s) throw new Error(`${p.symbol}: unreadable pool`);
  if (s.mintA !== p.tokenA.address || s.mintB !== p.tokenB.address) throw new Error(`${p.symbol}: mint mismatch`);
  const bal = async (vault: string) => Number(((await rpc.solana("getTokenAccountBalance", [vault])) as { value: { amount: string } }).value.amount);
  const [a, b] = [await bal(s.vaultA), await bal(s.vaultB)];
  return {
    fee0: s.feeGrowthA,
    fee1: s.feeGrowthB,
    sqrtPrice: s.sqrtPrice,
    q: "64/64",
    feeTier: s.feeRate,
    amountA: a / 10 ** p.tokenA.decimals,
    amountB: b / 10 ** p.tokenB.decimals,
    verify: {
      rpc: rpcUrlFor("solana"),
      body: rpcBody("getAccountInfo", params),
      read: "Orca Whirlpool account: fee_growth_global_a (u128 at byte 165) and fee_growth_global_b (u128 at 245) are cumulative fees per unit of liquidity (Q64.64); sqrt_price (u128 at 65) is √price (Q64.64). Fee APR = their growth between two snapshots, valued for a full-range position: (Δa·s² + Δb) ÷ (2s), annualized.",
    },
  };
}

async function readUniswap(rpc: Rpc, p: DexPool): Promise<PoolRead> {
  const chain = p.chain as EvmChain;
  const one = async (to: string, data: string) => words(await rpc.evmCall(chain, to, data))[0] ?? 0n;
  const sqrtPrice = await one(p.pool, DEX_SEL.slot0);
  const [fee0, fee1, fee, a, b] = await Promise.all([
    one(p.pool, DEX_SEL.feeGrowth0),
    one(p.pool, DEX_SEL.feeGrowth1),
    one(p.pool, DEX_SEL.fee),
    one(p.tokenA.address, encodeCall(DEX_SEL.balanceOf, p.pool)),
    one(p.tokenB.address, encodeCall(DEX_SEL.balanceOf, p.pool)),
  ]);
  return {
    fee0,
    fee1,
    sqrtPrice,
    q: "128/96",
    feeTier: Number(fee),
    amountA: Number(a) / 10 ** p.tokenA.decimals,
    amountB: Number(b) / 10 ** p.tokenB.decimals,
    verify: {
      rpc: rpcUrlFor(chain),
      body: rpcBody("eth_call", [{ to: p.pool, data: DEX_SEL.feeGrowth0 }, "latest"]),
      read: "feeGrowthGlobal0X128() (and feeGrowthGlobal1X128()) are the pool's cumulative fees per unit of liquidity (Q128.128); slot0() word 0 is √price (Q64.96). Fee APR = their growth between two snapshots, valued for a full-range position: (Δ0·s² + Δ1) ÷ (2s), annualized.",
    },
  };
}

export async function readDex(rpc: Rpc, prices: Prices, now: number, pools: DexPool[] = DEX_POOLS): Promise<YieldOpportunity[]> {
  const settled = await Promise.allSettled(
    pools.map(async (p): Promise<YieldOpportunity> => {
      const r = p.protocol === "orca" ? await readOrca(rpc, p) : await readUniswap(rpc, p);
      const qSqrt = r.q === "64/64" ? 64 : 96;
      const s = Number(r.sqrtPrice) / 2 ** qSqrt;
      const bPerA = s * s * 10 ** (p.tokenA.decimals - p.tokenB.decimals);
      const usd = prices[p.price.key];
      const tvlUsd =
        usd && bPerA > 0
          ? (p.price.side === "a" ? r.amountA + r.amountB / bPerA : r.amountB + r.amountA * bPerA) * usd
          : null;
      return {
        id: opportunityId(p.chain, p.protocol, p.symbol),
        chain: p.chain,
        protocol: p.protocol,
        kind: "dex-lp",
        symbol: p.symbol,
        asset: { symbol: p.tokenA.symbol, address: p.tokenA.address, decimals: p.tokenA.decimals },
        receipt: null,
        stable: false,
        ilRisk: p.correlated ? "low" : "high",
        tokens: [
          { symbol: p.tokenA.symbol, address: p.tokenA.address },
          { symbol: p.tokenB.symbol, address: p.tokenB.address },
        ],
        method: "growth",
        apy: null,
        window: null,
        measuredSinceMs: null,
        tvlUsd,
        idleShare: null,
        feePct: null,
        rate: null,
        inputs: {
          pool: p.pool,
          fee0: r.fee0.toString(),
          fee1: r.fee1.toString(),
          sqrtPrice: r.sqrtPrice.toString(),
          q: r.q,
          feeTier: pctTier(r.feeTier),
          [`${p.tokenA.symbol} in pool`]: r.amountA.toFixed(2),
          [`${p.tokenB.symbol} in pool`]: r.amountB.toFixed(2),
          [`price (${p.tokenB.symbol} per ${p.tokenA.symbol})`]: bPerA.toPrecision(8),
        },
        verify: r.verify,
        stale: false,
        updatedAt: now,
      };
    })
  );
  const ok = settled.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
  if (!ok.length && settled.length) throw new Error((settled[0] as PromiseRejectedResult).reason?.message ?? "dex failed");
  return ok;
}
