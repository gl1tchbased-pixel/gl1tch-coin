import { describe, expect, it } from "vitest";
import { parseGoplusSolana } from "./goplus-solana";

const POOL = "9fi2sFnnySPhNwJZPzZwxZT3xQnjPa9dh3EQbVNCstRW";
const DEPLOYER = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

describe("parseGoplusSolana", () => {
  it("doesn't count the pool as a holder (the $GL1TCH case: no dex list, pool known from market data)", () => {
    const r = parseGoplusSolana(
      { holder_count: "2", metadata_mutable: { status: "0" }, holders: [{ account: POOL, percent: "0.9689" }, { account: DEPLOYER, percent: "0.0311" }] },
      POOL,
    );
    expect(r.topHolderPct).toBeCloseTo(96.89);
    expect(r.realTopPct).toBeCloseTo(3.11);
    expect(r.poolPct).toBeCloseTo(96.89);
    expect(r.mutable).toBe(false);
    expect(r.holderCount).toBe(2);
  });

  it("recognises pools from the dex list", () => {
    const r = parseGoplusSolana({ holders: [{ account: "amm", percent: "0.5" }, { account: "whale", percent: "0.2" }], dex: [{ id: "amm", type: "Standard" }] }, null);
    expect(r.realTopPct).toBeCloseTo(20);
  });

  it("reads burned LP from standard pools only", () => {
    expect(parseGoplusSolana({ dex: [{ type: "Standard", burn_percent: 99.75 }, { type: "Concentrated", burn_percent: null }] }, null).lpLockedPct).toBe(99.75);
    expect(parseGoplusSolana({ dex: [{ type: "Concentrated", burn_percent: 0.57 }] }, null).lpLockedPct).toBeNull();
  });

  it("names dangerous powers", () => {
    const names = parseGoplusSolana({ balance_mutable_authority: { status: "1" }, non_transferable: "1", closable: { status: "1" } }, null).risks.map((r) => r.name);
    expect(names).toEqual(["An authority can change token balances", "Token can't be transferred", "An authority can close the mint"]);
  });

  it("reports unknown, not safe, when a field is missing", () => {
    const r = parseGoplusSolana({}, null);
    expect(r.mutable).toBeNull();
    expect(r.topHolderPct).toBeNull();
    expect(r.poolPct).toBeNull();
    expect(r.holderCount).toBeNull();
    expect(r.lpLockedPct).toBeNull();
  });
});
