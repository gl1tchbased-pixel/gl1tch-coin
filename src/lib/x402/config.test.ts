import { describe, it, expect } from "vitest";
import {
  BASE_MAINNET,
  PAID_ROUTES,
  SOLANA_MAINNET,
  buildAccepts,
  readPayTo,
  readSelfPayers,
  routeIdFromUrl,
} from "./config";
import { ATTESTER_WALLET } from "@/lib/official";

const SOL = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const EVM = "0x" + "ab".repeat(20);

describe("readPayTo", () => {
  it("accepts a valid Solana and Base address", () => {
    expect(readPayTo({ X402_PAY_TO_SOLANA: SOL, X402_PAY_TO_BASE: EVM })).toEqual({ solana: SOL, base: EVM, rejected: [] });
  });

  it("refuses the attester wallet (its key lives in CI secrets; revenue must never land there)", () => {
    const r = readPayTo({ X402_PAY_TO_SOLANA: ATTESTER_WALLET });
    expect(r.solana).toBeUndefined();
    expect(r.rejected).toContain("X402_PAY_TO_SOLANA");
  });

  it("refuses malformed addresses and trims whitespace", () => {
    const r = readPayTo({ X402_PAY_TO_SOLANA: `  ${SOL}\n`, X402_PAY_TO_BASE: "0x123" });
    expect(r.solana).toBe(SOL);
    expect(r.base).toBeUndefined();
    expect(r.rejected).toEqual(["X402_PAY_TO_BASE"]);
  });

  it("treats unset or empty values as not configured, not rejected", () => {
    expect(readPayTo({ X402_PAY_TO_SOLANA: "", X402_PAY_TO_BASE: undefined })).toEqual({ rejected: [] });
  });
});

describe("buildAccepts", () => {
  it("offers one exact USDC option per configured network, Solana first", () => {
    const both = buildAccepts("$0.01", { solana: SOL, base: EVM });
    expect(both.map((a) => a.network)).toEqual([SOLANA_MAINNET, BASE_MAINNET]);
    expect(both[0]).toEqual({ scheme: "exact", price: "$0.01", network: SOLANA_MAINNET, payTo: SOL, maxTimeoutSeconds: 60 });
    expect(buildAccepts("$0.01", { solana: SOL })).toHaveLength(1);
    expect(buildAccepts("$0.01", {})).toEqual([]);
  });
});

describe("PAID_ROUTES", () => {
  it("prices the scan at half a cent (the busiest token-safety seller's price), agent at one cent, deployer at 0.3 cent", () => {
    expect(PAID_ROUTES.scan).toMatchObject({ path: "/api/x402/scan", price: "$0.005", priceMicro: 5000 });
    expect(PAID_ROUTES.agent).toMatchObject({ path: "/api/x402/agent", price: "$0.01", priceMicro: 10000 });
    expect(PAID_ROUTES.deployer).toMatchObject({ path: "/api/x402/deployer", price: "$0.003", priceMicro: 3000 });
  });

  it("describes each route with the words agents search catalogs for (case-insensitive, like catalog search)", () => {
    for (const w of ["rug", "honeypot", "pre-trade", "Solana", "Base", "LP", "tax"]) expect(PAID_ROUTES.scan.description.toLowerCase()).toContain(w.toLowerCase());
    for (const w of ["Know Your Agent", "trust"]) expect(PAID_ROUTES.agent.description.toLowerCase()).toContain(w.toLowerCase());
    for (const w of ["deployer", "rug"]) expect(PAID_ROUTES.deployer.description.toLowerCase()).toContain(w.toLowerCase());
  });
});

describe("routeIdFromUrl", () => {
  it("maps a paid path to its route id, ignoring host and query", () => {
    expect(routeIdFromUrl("https://gl1tchbased.xyz/api/x402/scan?mint=x")).toBe("scan");
    expect(routeIdFromUrl("/api/x402/deployer")).toBe("deployer");
  });

  it("returns null for free or unknown paths", () => {
    expect(routeIdFromUrl("/api/scan")).toBeNull();
    expect(routeIdFromUrl("not a url at all %%")).toBeNull();
  });
});

describe("readSelfPayers", () => {
  it("splits, trims and drops empties", () => {
    expect(readSelfPayers({ X402_SELF_PAYERS: " A , B ," })).toEqual(new Set(["A", "B"]));
    expect(readSelfPayers({})).toEqual(new Set());
  });
});
