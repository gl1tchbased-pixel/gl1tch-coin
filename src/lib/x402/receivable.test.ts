import { describe, it, expect, vi, beforeEach } from "vitest";
import { readSolanaReceivable, resetReceivableCache, solanaCanReceive, USDC_SOLANA_MINT } from "./receivable";

const OWNER = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";
const rpcWith = (value: unknown[] | Error) =>
  vi.fn(async () => {
    if (value instanceof Error) throw value;
    return { value } as never;
  });

beforeEach(() => {
  resetReceivableCache();
  vi.restoreAllMocks();
});

describe("readSolanaReceivable", () => {
  it("asks for the owner's USDC accounts and reads open / missing / unknown", async () => {
    const open = rpcWith([{}]);
    expect(await readSolanaReceivable(OWNER, open)).toBe(true);
    expect(open).toHaveBeenCalledWith("getTokenAccountsByOwner", [OWNER, { mint: USDC_SOLANA_MINT }, { encoding: "jsonParsed" }], expect.anything());
    expect(await readSolanaReceivable(OWNER, rpcWith([]))).toBe(false);
    expect(await readSolanaReceivable(OWNER, rpcWith(new Error("rpc down")))).toBeNull();
  });
});

describe("solanaCanReceive", () => {
  it("treats an unreadable chain as receivable, so an RPC hiccup never drops Solana", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await solanaCanReceive(OWNER, rpcWith(new Error("rpc down")))).toBe(true);
  });

  it("caches a read for 10 minutes, then reads again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = rpcWith([]);
    expect(await solanaCanReceive(OWNER, missing, 0)).toBe(false);
    expect(await solanaCanReceive(OWNER, missing, 60_000)).toBe(false);
    expect(missing).toHaveBeenCalledTimes(1);
    const open = rpcWith([{}]);
    expect(await solanaCanReceive(OWNER, open, 11 * 60_000)).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("keeps the last known answer when a later read fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await solanaCanReceive(OWNER, rpcWith([]), 0)).toBe(false);
    expect(await solanaCanReceive(OWNER, rpcWith(new Error("rpc down")), 11 * 60_000)).toBe(false);
    expect(err).toHaveBeenCalledTimes(1); // logged once, not on every request
  });
});
