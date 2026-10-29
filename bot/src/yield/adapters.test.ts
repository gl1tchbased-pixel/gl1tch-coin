import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { pad32, encodeCall } from "./abi.js";
import { readAave, readSpl, readRates, readPrices, readGas, SEL } from "./adapters.js";
import { RATE_ASSETS, SPL_POOLS, CHAINLINK, type EvmChain } from "./registry.js";
import type { Rpc } from "./rpc.js";

const NOW = Date.UTC(2026, 9, 29, 15, 0, 0);
const hexWords = (...ws: (bigint | string)[]) => "0x" + ws.map((w) => (typeof w === "bigint" ? w.toString(16).padStart(64, "0") : pad32(w))).join("");
const fixture = fs.readFileSync(new URL("./fixtures/jitosol-pool.b64", import.meta.url), "utf8").trim();

function fakeRpc(calls: Record<string, string>, solana: Record<string, unknown> = {}, raw: Record<string, unknown> = {}): Rpc {
  return {
    async evmCall(chain, to, data) {
      const k = `${chain}|${to.toLowerCase()}|${data.toLowerCase()}`;
      if (!(k in calls)) throw new Error(`unexpected call ${k}`);
      return calls[k];
    },
    async evmRaw(chain, method) {
      const k = `${chain}|${method}`;
      if (!(k in raw)) throw new Error(`unexpected raw ${k}`);
      return raw[k];
    },
    async solana(method) {
      if (!(method in solana)) throw new Error(`unexpected solana ${method}`);
      return solana[method];
    },
  };
}

describe("readAave", () => {
  const POOL = "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2";
  const PROVIDER = "0x2f39d218133afab8f2b819b1066c7e434ad94e9e";
  const ORACLE = "0x54586be62e3c3580375ae3723c145253060ca0c2";
  const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const AUSDC = "0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c";
  const reserve = (rate: bigint, aToken: string) => hexWords(0n, 0n, rate, 0n, 0n, 0n, 0n, 0n, aToken, 0n, 0n, 0n, 0n, 0n, 0n);
  const c = (to: string, data: string) => `ethereum|${to}|${data.toLowerCase()}`;
  const rpc = fakeRpc({
    [c(POOL, SEL.addressesProvider)]: hexWords(PROVIDER),
    [c(PROVIDER, SEL.getPriceOracle)]: hexWords(ORACLE),
    [c(POOL, encodeCall(SEL.getReserveData, USDC))]: reserve(44_670_000_000_000_000_000_000_000n, AUSDC),
    [c(POOL, encodeCall(SEL.getReserveData, WETH))]: reserve(0n, "0x" + "0".repeat(40)),
    [c(USDC, SEL.decimals)]: hexWords(6n),
    [c(AUSDC, SEL.totalSupply)]: hexWords(1_000_000_000_000n), // 1,000,000 USDC
    [c(USDC, encodeCall(SEL.balanceOf, AUSDC))]: hexWords(55_000_000_000n), // 55,000 idle
    [c(ORACLE, encodeCall(SEL.getAssetPrice, USDC))]: hexWords(100_000_000n), // $1.00
  });
  const entry = {
    chain: "ethereum" as EvmChain,
    pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    assets: [
      { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", stable: true },
      { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", stable: false },
    ],
  };

  it("reads supply APY, size and idle share, and skips non-reserves", async () => {
    const out = await readAave(rpc, entry, NOW);
    expect(out).toHaveLength(1);
    const o = out[0];
    expect(o.id).toBe("ethereum-aave-v3-usdc");
    expect(o.kind).toBe("lending");
    expect(o.method).toBe("rate");
    expect(o.window).toBe("live");
    expect(o.apy).toBeCloseTo(0.04568, 4);
    expect(o.tvlUsd).toBeCloseTo(1_000_000, 0);
    expect(o.idleShare).toBeCloseTo(0.055, 6);
    expect(o.stable).toBe(true);
    expect(o.receipt?.address).toBe(AUSDC);
    expect(o.inputs.liquidityRateRay).toBe("44670000000000000000000000");
    expect(o.verify.rpc).toBe("https://ethereum-rpc.publicnode.com");
    expect(JSON.parse(o.verify.body).params[0].data).toBe(encodeCall(SEL.getReserveData, entry.assets[0].address));
  });
});

describe("readSpl", () => {
  it("measures one epoch of pool growth from a single account read", async () => {
    const rpc = fakeRpc({}, { getAccountInfo: { value: { data: [fixture, "base64"], owner: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy" } } });
    const out = await readSpl(rpc, { SOL: 100 }, 341, NOW, [SPL_POOLS[0]]);
    expect(out).toHaveLength(1);
    const o = out[0];
    expect(o.id).toBe("solana-jito-jitosol");
    expect(o.method).toBe("epoch");
    expect(o.window).toBe("epoch");
    expect(o.apy).toBeGreaterThan(0.03);
    expect(o.apy).toBeLessThan(0.08);
    expect(o.tvlUsd).toBeGreaterThan(100_000_000);
    expect(o.feePct).not.toBeNull();
    expect(o.rate).toMatch(/^1\.\d+/);
    expect(o.verify.rpc).toBe("https://solana-rpc.publicnode.com");
  });

  it("returns no APY when the epoch length is unknown", async () => {
    const rpc = fakeRpc({}, { getAccountInfo: { value: { data: [fixture, "base64"] } } });
    const [o] = await readSpl(rpc, {}, null, NOW, [SPL_POOLS[0]]);
    expect(o.apy).toBeNull();
    expect(o.tvlUsd).toBeNull();
  });
});

describe("readRates", () => {
  it("records the exchange rate and size; the APY waits for history", async () => {
    const wst = RATE_ASSETS.find((r) => r.symbol === "wstETH")!;
    const to = wst.address.toLowerCase();
    const rpc = fakeRpc({
      [`ethereum|${to}|${wst.rateCall}`]: hexWords(1_247_480_840_000_000_000n),
      [`ethereum|${to}|${SEL.totalSupply}`]: hexWords(3_000_000n * 10n ** 18n),
    });
    const [o] = await readRates(rpc, { ETH: 2000 }, NOW, [wst]);
    expect(o.id).toBe("ethereum-lido-wsteth");
    expect(o.method).toBe("growth");
    expect(o.apy).toBeNull();
    expect(o.rate).toBe("1.24748084000000");
    expect(o.tvlUsd).toBeCloseTo(3_000_000 * 1.24748084 * 2000, -3);
    expect(o.stable).toBe(false);
    expect(o.verify.body).toContain(wst.rateCall);
  });

  it("prices a stablecoin vault through the USDC feed", async () => {
    const steak = RATE_ASSETS.find((r) => r.symbol === "steakUSDG")!;
    const to = steak.address.toLowerCase();
    const rpc = fakeRpc({
      [`robinhood|${to}|${steak.rateCall}`]: hexWords(1_011_642_000_000n),
      [`robinhood|${to}|${SEL.totalAssets}`]: hexWords(541_158_234_000_000n),
    });
    const [o] = await readRates(rpc, { USDC: 0.9997 }, NOW, [steak]);
    expect(o.stable).toBe(true);
    expect(o.rate).toBe("1.01164200000000");
    expect(o.tvlUsd).toBeCloseTo(541_158_234 * 0.9997, -2);
  });
});

describe("readPrices", () => {
  it("reads Chainlink answers and drops a feed older than 36 h", async () => {
    const round = (answer: bigint, updatedSec: number) => hexWords(1n, answer, 0n, BigInt(updatedSec), 1n);
    const fresh = Math.floor(NOW / 1000) - 600;
    const calls: Record<string, string> = {};
    for (const [k, addr] of Object.entries(CHAINLINK)) {
      calls[`ethereum|${addr.toLowerCase()}|${SEL.latestRoundData}`] = round(k === "SOL" ? 10_127_150_000n : 236_320_630_000n, k === "BNB" ? fresh - 3 * 86_400 : fresh);
    }
    const p = await readPrices(fakeRpc(calls), NOW);
    expect(p.ETH).toBeCloseTo(2363.2063, 4);
    expect(p.SOL).toBeCloseTo(101.2715, 4);
    expect(p.BNB).toBeUndefined();
  });
});

describe("readGas", () => {
  it("turns eth_gasPrice into gwei with the chain's native price", async () => {
    const raw = { "ethereum|eth_gasPrice": "0x1c89411a", "base|eth_gasPrice": "0x989680", "arbitrum|eth_gasPrice": "0x989680", "bsc|eth_gasPrice": "0x3b9aca00", "robinhood|eth_gasPrice": "0x989680" };
    const g = await readGas(fakeRpc({}, {}, raw), { ETH: 2000, BNB: 750 });
    expect(g.ethereum?.gwei).toBeCloseTo(0.479, 3);
    expect(g.ethereum?.nativeUsd).toBe(2000);
    expect(g.bsc?.gwei).toBe(1);
    expect(g.bsc?.nativeUsd).toBe(750);
  });
});
