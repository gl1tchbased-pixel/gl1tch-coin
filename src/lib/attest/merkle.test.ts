import { describe, it, expect } from "vitest";
import { bytesToHex } from "@noble/hashes/utils.js";
import { canonical, leafHash, merkleRoot, parseMemo, verifyProof } from "./merkle";
import { VECTORS } from "./vectors";

describe("verdict anchoring v1 (site)", () => {
  it("serialises and hashes exactly like the bot", () => {
    expect(canonical(VECTORS.records[0])).toBe(VECTORS.canonical0);
    expect(bytesToHex(leafHash(VECTORS.records[0]))).toBe(VECTORS.leaf0);
    expect(merkleRoot(VECTORS.records)).toBe(VECTORS.root);
  });

  it("verifies a proof the bot would publish, and rejects an edited verdict", () => {
    // Proof for leaf 2 of 3: its sibling is the parent of leaves 0 and 1 (carried-up odd node rule).
    const [a, b, c] = VECTORS.records;
    const left = merkleRoot([a, b]); // root of a 2-leaf tree = node(leaf a, leaf b)
    expect(verifyProof(c, [{ sibling: left, side: "L" }], VECTORS.root)).toBe(true);
    expect(verifyProof({ ...c, verdict: "CLEAN" }, [{ sibling: left, side: "L" }], VECTORS.root)).toBe(false);
  });

  it("parses only v1 memos", () => {
    expect(parseMemo(`gl1tch:radar:v1:${VECTORS.root}:3:1792540800000`)?.count).toBe(3);
    expect(parseMemo("gl1tch:radar:v2:abc")).toBeNull();
  });
});
