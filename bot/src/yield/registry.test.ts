import { describe, it, expect, afterEach } from "vitest";
import { AAVE, SPL_POOLS, RATE_ASSETS, CHAINLINK, EVM_RPC, opportunityId, rpcUrlFor, type YieldChain } from "./registry.js";

const EVM = /^0x[0-9a-fA-F]{40}$/;
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

describe("yield registry", () => {
  const ids = [
    ...AAVE.flatMap((a) => a.assets.map((x) => opportunityId(a.chain, "aave-v3", x.symbol))),
    ...SPL_POOLS.map((p) => opportunityId("solana", p.protocol, p.symbol)),
    ...RATE_ASSETS.map((r) => opportunityId(r.chain, r.protocol, r.symbol)),
  ];

  it("gives every opportunity a unique, url-safe id", () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{3,80}$/);
    expect(ids.length).toBeGreaterThanOrEqual(25);
  });

  it("slugs ids from chain, protocol and symbol", () => {
    expect(opportunityId("base", "aave-v3", "USDC")).toBe("base-aave-v3-usdc");
    expect(opportunityId("robinhood", "morpho", "ymvST-USDG")).toBe("robinhood-morpho-ymvst-usdg");
  });

  it("holds only well-formed addresses", () => {
    for (const a of AAVE) {
      expect(a.pool).toMatch(EVM);
      for (const x of a.assets) expect(x.address).toMatch(EVM);
    }
    for (const r of RATE_ASSETS) {
      expect(r.address).toMatch(EVM);
      expect(r.asset.address === "native" || EVM.test(r.asset.address)).toBe(true);
      expect(r.rateCall).toMatch(/^0x[0-9a-f]{8}([0-9a-f]{64})*$/);
    }
    for (const p of SPL_POOLS) {
      expect(p.pool).toMatch(B58);
      expect(p.mint).toMatch(B58);
    }
    for (const f of Object.values(CHAINLINK)) expect(f).toMatch(EVM);
  });

  it("has an RPC for every EVM chain it uses", () => {
    const used = new Set<YieldChain>([...AAVE.map((a) => a.chain), ...RATE_ASSETS.map((r) => r.chain)]);
    for (const c of used) expect(EVM_RPC[c as Exclude<YieldChain, "solana">]?.length).toBeGreaterThan(0);
  });

  describe("rpcUrlFor", () => {
    const prev = process.env.SOLANA_RPC;
    afterEach(() => {
      if (prev === undefined) delete process.env.SOLANA_RPC;
      else process.env.SOLANA_RPC = prev;
    });
    it("never exposes the private Solana RPC in verify blocks", () => {
      process.env.SOLANA_RPC = "https://mainnet.helius-rpc.com/?api-key=secret";
      expect(rpcUrlFor("solana")).toBe("https://solana-rpc.publicnode.com");
      expect(rpcUrlFor("base")).toBe("https://base-rpc.publicnode.com");
    });
  });
});
