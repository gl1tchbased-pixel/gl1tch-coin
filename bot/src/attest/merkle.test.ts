import { describe, it, expect } from "vitest";
import { canonical, leafHash, merkleProof, merkleRoot, memoText, parseMemo, verifyProof, type VerdictRecord } from "./merkle.js";
import { VECTORS } from "./vectors.js";

const rec = (i: number): VerdictRecord => ({
  chain: "solana",
  mint: `Mint${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
  verdict: i % 2 ? "HIGH RISK" : "CLEAN",
  score: 40 + i,
  scannedAt: 1792540800000 + i,
});

describe("verdict anchoring v1 (bot)", () => {
  it("serialises a record canonically", () => {
    expect(canonical(VECTORS.records[0])).toBe(VECTORS.canonical0);
    expect(leafHash(VECTORS.records[0]).toString("hex")).toBe(VECTORS.leaf0);
  });

  it("matches the locked root shared with the site", () => {
    expect(merkleRoot(VECTORS.records)).toBe(VECTORS.root);
  });

  it("proves every leaf for odd and even sweep sizes", () => {
    for (const n of [1, 2, 3, 5, 8, 13]) {
      const rs = Array.from({ length: n }, (_, i) => rec(i));
      const root = merkleRoot(rs);
      rs.forEach((r, i) => expect(verifyProof(r, merkleProof(rs, i), root)).toBe(true));
    }
  });

  it("rejects an edited verdict", () => {
    const rs = Array.from({ length: 5 }, (_, i) => rec(i));
    const root = merkleRoot(rs);
    const forged = { ...rs[2], verdict: "CLEAN", score: 99 };
    expect(verifyProof(forged, merkleProof(rs, 2), root)).toBe(false);
  });

  it("round-trips the memo and refuses anything else", () => {
    const m = memoText(VECTORS.root, 3, 1792540800000);
    expect(parseMemo(m)).toEqual({ root: VECTORS.root, count: 3, sweepMs: 1792540800000 });
    expect(parseMemo("hello")).toBeNull();
  });

  it("refuses an empty sweep", () => {
    expect(() => merkleRoot([])).toThrow();
  });
});
