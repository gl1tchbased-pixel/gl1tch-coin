import { describe, it, expect } from "vitest";
import { revenueEntryFromSettle } from "./revenue";
import { SOLANA_MAINNET } from "./x402/config";

const TX = "5".repeat(88);
const URL_SCAN = "https://gl1tchbased.xyz/api/x402/scan?mint=DezX";
const ok = { success: true, transaction: TX, network: SOLANA_MAINNET, amount: "10000", payer: "Payer111" };

describe("revenueEntryFromSettle", () => {
  it("maps a successful settlement to a paid ledger entry", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: URL_SCAN }, new Set(), 42)).toEqual({
      tx: TX,
      network: SOLANA_MAINNET,
      route: "scan",
      amountMicro: 10_000,
      payer: "Payer111",
      self: false,
      at: 42,
    });
  });

  it("ignores a failed settlement", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, success: false }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("ignores a resource that is not a paid route", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: "https://gl1tchbased.xyz/api/scan" }, new Set())).toBeNull();
  });

  it("falls back to the required amount when the settlement omits it", () => {
    const e = revenueEntryFromSettle({ result: { ...ok, amount: undefined }, requirementsAmount: "5000", resourceUrl: URL_SCAN }, new Set());
    expect(e?.amountMicro).toBe(5_000);
  });

  it("refuses an amount that is not a positive integer", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, amount: "abc" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
    expect(revenueEntryFromSettle({ result: { ...ok, amount: "0" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("needs a transaction and a network", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, transaction: "" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
    expect(revenueEntryFromSettle({ result: { ...ok, network: undefined }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("flags our own test wallet as a self-test", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: URL_SCAN }, new Set(["Payer111"]))?.self).toBe(true);
  });
});
