import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import { MEMO_PROGRAM_ID, anchorMemoOf, parseProofFile, verifyEntry, type ProofEntry, type RpcTx } from "./verify";
import { memoText, merkleRoot } from "./merkle";
import { VECTORS } from "./vectors";

const ATTESTER = "ra7YezUjvPKHEfTHJ9NM65DRUkmrxkLHkSqqtkwSWpN";
const STRANGER = "9xLXfyLSypk8RoXxpk9cEghseqSPmNYiJz1bgsG73DLd";
const SWEEP = 1792540800000;
const [a, b, c] = VECTORS.records;

// Leaf 2 of 3: its sibling is the parent of leaves 0 and 1.
const entry: ProofEntry = {
  record: c,
  proof: [{ sibling: merkleRoot([a, b]), side: "L" }],
  root: VECTORS.root,
  count: 3,
  sweepMs: SWEEP,
  anchor: { sig: "5igSig", slot: 300, blockTime: 1792540900 },
};
const memo = memoText(VECTORS.root, 3, SWEEP);

function tx(over: { keys?: string[]; text?: string; signers?: number; ixs?: RpcTx["transaction"]["message"]["instructions"]; err?: unknown } = {}): RpcTx {
  const keys = over.keys ?? [ATTESTER, MEMO_PROGRAM_ID];
  return {
    slot: 300,
    blockTime: 1792540900,
    meta: { err: over.err ?? null },
    transaction: {
      message: {
        accountKeys: keys,
        header: { numRequiredSignatures: over.signers ?? 1 },
        instructions: over.ixs ?? [{ programIdIndex: keys.indexOf(MEMO_PROGRAM_ID), accounts: [], data: bs58.encode(new TextEncoder().encode(over.text ?? memo)) }],
      },
    },
  };
}
const run = (t: RpcTx | null, e: ProofEntry = entry, attester = ATTESTER) =>
  verifyEntry(e, { attester, rpcUrl: "unused", getTx: async () => t });

describe("anchorMemoOf (browser side)", () => {
  it("reads a lone attester-signed v1 memo", () => {
    expect(anchorMemoOf(tx(), ATTESTER)).toBe(memo);
  });
  it("rejects a stranger's copy of the memo, extra signers, extra instructions and other programs", () => {
    expect(anchorMemoOf(tx({ keys: [STRANGER, ATTESTER, MEMO_PROGRAM_ID] }), ATTESTER)).toBeNull();
    expect(anchorMemoOf(tx({ signers: 2 }), ATTESTER)).toBeNull();
    const memoIx = { programIdIndex: 1, accounts: [], data: bs58.encode(new TextEncoder().encode(memo)) };
    expect(anchorMemoOf(tx({ ixs: [memoIx, memoIx] }), ATTESTER)).toBeNull();
    expect(anchorMemoOf(tx({ keys: [ATTESTER, STRANGER], ixs: [{ ...memoIx, programIdIndex: 1 }] }), ATTESTER)).toBeNull();
    expect(anchorMemoOf(tx({ text: "hello" }), ATTESTER)).toBeNull();
  });
});

describe("verifyEntry", () => {
  it("passes every check for a sealed verdict", async () => {
    const v = await run(tx());
    expect(v.checks.map((x) => [x.key, x.ok])).toEqual([["proof", true], ["finalized", true], ["signer", true], ["memo", true]]);
    expect(v.verified).toBe(true);
  });

  it("fails an edited verdict at the first check", async () => {
    const v = await run(tx(), { ...entry, record: { ...c, verdict: "CLEAN" } });
    expect(v.checks[0].ok).toBe(false);
    expect(v.verified).toBe(false);
  });

  it("fails a seal by anyone but the attester, and a memo for another root", async () => {
    expect((await run(tx({ keys: [STRANGER, MEMO_PROGRAM_ID] }))).verified).toBe(false);
    const other = await run(tx({ text: memoText("ab".repeat(32), 3, SWEEP) }));
    expect(other.checks.find((x) => x.key === "memo")?.ok).toBe(false);
    expect(other.verified).toBe(false);
  });

  it("fails a missing or failed transaction, and reports an unreachable RPC", async () => {
    expect((await run(null)).verified).toBe(false);
    expect((await run(tx({ err: { InstructionError: [0, "x"] } }))).verified).toBe(false);
    const down = await verifyEntry(entry, { attester: ATTESTER, rpcUrl: "x", getTx: async () => Promise.reject(new Error("429")) });
    expect(down.checks.find((x) => x.key === "finalized")?.detail).toMatch(/couldn't read the chain/);
    expect(down.verified).toBe(false);
    expect(down.rpcUnreachable).toBe(true); // unchecked, not disproven
    expect((await run(null)).rpcUnreachable).toBeFalsy();
  });

  it("checks only the proof while sealing isn't live", async () => {
    const v = await run(tx(), entry, "");
    expect(v.verified).toBe(false);
    expect(v.pendingSeal).toBe(true);
    expect(v.checks).toHaveLength(2);
  });
});

describe("parseProofFile", () => {
  it("round-trips a downloaded proof and rejects junk", () => {
    expect(parseProofFile(JSON.stringify({ spec: "x", ...entry }))).toEqual(entry);
    expect(parseProofFile("{}")).toBeNull();
    expect(parseProofFile("not json")).toBeNull();
    expect(parseProofFile(JSON.stringify({ ...entry, proof: [{ sibling: 1, side: "L" }] }))).toBeNull();
  });
});
