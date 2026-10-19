import { describe, expect, it } from "vitest";
import { givebackCopy } from "./giveback";

describe("give-back wallet copy follows the chain", () => {
  it("says it isn't funded when there are no transactions", () => {
    const c = givebackCopy({ sol: 0, txs: 0, more: false, at: 0 });
    expect(c.short).toBe("Not funded yet · 0 transactions");
    expect(c.long).toMatch(/not funded yet/);
    expect(c.long).not.toMatch(/every disbursement/i);
  });

  it("counts real transactions and the balance", () => {
    expect(givebackCopy({ sol: 0.25, txs: 3, more: false, at: 0 }).short).toBe("3 transactions · 0.250 SOL");
    expect(givebackCopy({ sol: 2, txs: 100, more: true, at: 0 }).short).toBe("100+ transactions · 2.00 SOL");
    expect(givebackCopy({ sol: 0, txs: 1, more: false, at: 0 }).short).toBe("1 transaction · 0 SOL");
  });

  it("claims nothing when the chain can't be read", () => {
    const c = givebackCopy(null);
    expect(c.long).not.toMatch(/\d+ transactions|funded/);
  });
});
