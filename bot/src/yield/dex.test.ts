import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseWhirlpool, readDex, DEX_SEL } from "./dex.js";
import { DEX_POOLS } from "./registry.js";
import { pad32 } from "./abi.js";
import type { Rpc } from "./rpc.js";

const NOW = Date.UTC(2026, 9, 29, 18, 0, 0);
// Real Orca Whirlpool account: JitoSOL/SOL (Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp), 2026-10-29.
const fixture = fs.readFileSync(new URL("./fixtures/orca-jitosol-sol.b64", import.meta.url), "utf8").trim();
const hexWords = (...ws: bigint[]) => "0x" + ws.map((w) => w.toString(16).padStart(64, "0")).join("");

describe("parseWhirlpool", () => {
  it("reads the JitoSOL/SOL pool", () => {
    const s = parseWhirlpool(Buffer.from(fixture, "base64"))!;
    expect(s.mintA).toBe("So11111111111111111111111111111111111111112");
    expect(s.mintB).toBe("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
    expect(s.feeRate).toBe(100);
    expect(s.sqrtPrice > 0n).toBe(true);
    expect(s.feeGrowthA > 0n && s.feeGrowthB > 0n).toBe(true);
  });

  it("rejects a short buffer", () => {
    expect(parseWhirlpool(Buffer.alloc(200))).toBeNull();
  });
});

describe("readDex", () => {
  it("reads an Orca pool: counters, fee tier, low IL for a correlated pair", async () => {
    const pool = DEX_POOLS.find((p) => p.symbol === "JitoSOL-SOL")!;
    const rpc: Rpc = {
      evmCall: async () => { throw new Error("no evm"); },
      evmRaw: async () => { throw new Error("no evm"); },
      solana: async (method) => {
        if (method === "getAccountInfo") return { value: { data: [fixture, "base64"] } };
        if (method === "getTokenAccountBalance") return { value: { amount: "1000000000000" } }; // 1,000 of each
        throw new Error(method);
      },
    };
    const [o] = await readDex(rpc, { SOL: 100 }, NOW, [pool]);
    expect(o.id).toBe("solana-orca-jitosol-sol");
    expect(o.kind).toBe("dex-lp");
    expect(o.ilRisk).toBe("low");
    expect(o.method).toBe("growth");
    expect(o.apy).toBeNull();
    expect(o.inputs.q).toBe("64/64");
    expect(o.inputs.feeTier).toBe("0.01%");
    expect(BigInt(o.inputs.fee0)).toBeGreaterThan(0n);
    expect(o.tokens.map((t) => t.symbol)).toEqual(["SOL", "JitoSOL"]);
    // ~1,000 SOL + 1,000 JitoSOL valued in SOL at the pool price (> 1 SOL each) at $100
    expect(o.tvlUsd).toBeGreaterThan(200_000);
    expect(o.tvlUsd).toBeLessThan(260_000);
  });

  it("refuses an Orca account whose mints don't match the registry", async () => {
    const pool = { ...DEX_POOLS.find((p) => p.symbol === "SOL-USDC")! };
    const rpc: Rpc = {
      evmCall: async () => "0x",
      evmRaw: async () => "0x",
      solana: async (method) => (method === "getAccountInfo" ? { value: { data: [fixture, "base64"] } } : { value: { amount: "1" } }),
    };
    await expect(readDex(rpc, { SOL: 100 }, NOW, [pool])).rejects.toThrow(/mismatch/);
  });

  it("reads a Uniswap v3 pool: high IL, Q128/Q96, TVL from balances", async () => {
    const pool = DEX_POOLS.find((p) => p.chain === "base")!;
    const addr = pool.pool.toLowerCase();
    const Q96 = 1n << 96n;
    const calls: Record<string, string> = {
      [`${addr}|${DEX_SEL.slot0}`]: hexWords(Q96 * 2n, 0n, 0n, 0n, 0n, 68n, 1n),
      [`${addr}|${DEX_SEL.feeGrowth0}`]: hexWords(123n),
      [`${addr}|${DEX_SEL.feeGrowth1}`]: hexWords(456n),
      [`${addr}|${DEX_SEL.fee}`]: hexWords(500n),
      [`${pool.tokenA.address.toLowerCase()}|0x70a08231${pad32(pool.pool)}`]: hexWords(10n ** 18n * 10n), // 10 WETH
      [`${pool.tokenB.address.toLowerCase()}|0x70a08231${pad32(pool.pool)}`]: hexWords(20_000n * 10n ** 6n), // 20,000 USDC
    };
    const rpc: Rpc = {
      evmCall: async (_c, to, data) => {
        const k = `${to.toLowerCase()}|${data.toLowerCase()}`;
        if (!(k in calls)) throw new Error("unexpected " + k);
        return calls[k];
      },
      evmRaw: async () => "0x",
      solana: async () => null,
    };
    const [o] = await readDex(rpc, { USDC: 1, ETH: 2000 }, NOW, [pool]);
    expect(o.id).toBe("base-uniswap-v3-weth-usdc");
    expect(o.ilRisk).toBe("high");
    expect(o.inputs.q).toBe("128/96");
    expect(o.inputs.feeTier).toBe("0.05%");
    expect(o.inputs.fee0).toBe("123");
    // price raw s² = 4 (USDC raw per WETH raw) → 4·10^(18−6) USDC per WETH; TVL = 20,000 + 10 × 4e12 … dominated by price
    expect(o.tvlUsd).toBeCloseTo(20_000 + 10 * 4e12, -6);
  });
});
