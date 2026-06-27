import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey, type Connection } from "@solana/web3.js";

const getMint = vi.fn();
vi.mock("@solana/spl-token", () => ({ getMint: (...a: unknown[]) => getMint(...a) }));

const { buildTrustReport } = await import("./verify.js");

const MINT = new PublicKey("11111111111111111111111111111111");
const SOME_AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
const conn = {} as Connection;

// config defaults: totalSupply 1_000_000_000, decimals 6 -> 1e15 base units
const DECIMALS = 6;
const EXPECTED_SUPPLY = 1_000_000_000n * 10n ** BigInt(DECIMALS);

function mintInfo(over: Partial<{ mintAuthority: PublicKey | null; freezeAuthority: PublicKey | null; supply: bigint; decimals: number }> = {}) {
  return {
    mintAuthority: null,
    freezeAuthority: null,
    supply: EXPECTED_SUPPLY,
    decimals: DECIMALS,
    ...over,
  };
}

beforeEach(() => getMint.mockReset());

describe("buildTrustReport", () => {
  it("passes when mint+freeze are revoked and supply matches", async () => {
    getMint.mockResolvedValue(mintInfo());
    const r = await buildTrustReport(conn, MINT);
    expect(r.mintRevoked).toBe(true);
    expect(r.freezeRevoked).toBe(true);
    expect(r.supplyOk).toBe(true);
    expect(r.allPassed).toBe(true);
    expect(r.mint).toBe(MINT.toBase58());
  });

  it("fails if mint authority is still set", async () => {
    getMint.mockResolvedValue(mintInfo({ mintAuthority: SOME_AUTHORITY }));
    const r = await buildTrustReport(conn, MINT);
    expect(r.mintRevoked).toBe(false);
    expect(r.allPassed).toBe(false);
  });

  it("fails if freeze authority is still set", async () => {
    getMint.mockResolvedValue(mintInfo({ freezeAuthority: SOME_AUTHORITY }));
    const r = await buildTrustReport(conn, MINT);
    expect(r.freezeRevoked).toBe(false);
    expect(r.allPassed).toBe(false);
  });

  it("fails if the minted supply does not match expectations", async () => {
    getMint.mockResolvedValue(mintInfo({ supply: EXPECTED_SUPPLY - 1n }));
    const r = await buildTrustReport(conn, MINT);
    expect(r.supplyOk).toBe(false);
    expect(r.allPassed).toBe(false);
  });
});
