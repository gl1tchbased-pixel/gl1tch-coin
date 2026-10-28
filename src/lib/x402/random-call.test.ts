import { describe, it, expect } from "vitest";
import { parseRandomQuery, currentRound, roundTimeMs, randomCall, QUICKNET_GENESIS_S, X402_KEY_HASH } from "./random-call";
import { deriveResult, hashHex } from "@/lib/quantum/random";
import { CHAIN } from "@/lib/quantum/drand-round";

const q = (s: string) => new URLSearchParams(s);

describe("parseRandomQuery", () => {
  it("defaults to one integer in 1-100 with no salt", () => {
    expect(parseRandomQuery(q(""))).toEqual({ spec: { kind: "ints", min: 1, max: 100, count: 1 } });
  });

  it("reads min, max, count and salt", () => {
    expect(parseRandomQuery(q("min=-5&max=5&count=10&salt=raffle-42"))).toEqual({
      spec: { kind: "ints", min: -5, max: 5, count: 10 },
      salt: "raffle-42",
    });
  });

  it.each([
    ["min=abc", "integers"],
    ["min=1.5", "integers"],
    ["min=10&max=1", "exceed"],
    ["min=0&max=9999999999", "too large"],
    ["count=0", "count"],
    ["count=1001", "count"],
    ["salt=has%20space", "salt"],
    [`salt=${"a".repeat(65)}`, "salt"],
  ])("refuses %s", (query, word) => {
    const r = parseRandomQuery(q(query));
    expect("error" in r && r.error).toContain(word);
  });
});

describe("drand quicknet round timing", () => {
  it("round 1 is published at genesis and one round every 3 s after", () => {
    expect(roundTimeMs(1)).toBe(QUICKNET_GENESIS_S * 1000);
    expect(roundTimeMs(11)).toBe((QUICKNET_GENESIS_S + 30) * 1000);
  });

  it("the current round is the newest one already published", () => {
    const t = roundTimeMs(500);
    expect(currentRound(t)).toBe(500);
    expect(currentRound(t + 2999)).toBe(500);
    expect(currentRound(t + 3000)).toBe(501);
  });
});

describe("randomCall", () => {
  const T0 = roundTimeMs(1000) + 1500; // mid-period: round 1000 is the newest published
  const pulse = (round: number) => ({ round, randomness: "ab".repeat(32), signature: "cd".repeat(48), verified: false, source: "drand" as const });

  function deps(over: Partial<Parameters<typeof randomCall>[2]> = {}) {
    let now = T0;
    const fetched: number[] = [];
    return {
      fetched,
      d: {
        now: () => now,
        sleep: async (ms: number) => {
          now += ms;
        },
        fetchRound: async (round: number) => {
          fetched.push(round);
          return now >= roundTimeMs(round) ? pulse(round) : null;
        },
        verify: () => true,
        salt: () => "fixedsalt",
        ...over,
      },
    };
  }

  it("commits to a round two ahead of the newest published one, waits for it, and derives from it", async () => {
    const { d, fetched } = deps();
    const spec = { kind: "ints" as const, min: 1, max: 6, count: 3 };
    const r = await randomCall(spec, undefined, d);
    expect(r).not.toBeNull();
    expect(r!.proof.round).toBe(1002);
    expect(fetched[0]).toBe(1002);
    expect(r!.proof.commitment).toBe(
      `v=1|keyHash=${X402_KEY_HASH}|spec=ints:1:6:3|salt=fixedsalt|source=drand-quicknet|chainHash=${CHAIN}|targetRound=1002|committedAt=${T0}`
    );
    expect(r!.proof.requestId).toBe(hashHex(r!.proof.commitment));
    expect(r!.values).toEqual(deriveResult("ab".repeat(32), r!.proof.requestId, spec).values);
    expect(r!.values.every((v) => v >= 1 && v <= 6)).toBe(true);
  });

  it("binds the caller's salt into the commitment", async () => {
    const r = await randomCall({ kind: "ints", min: 1, max: 100, count: 1 }, "raffle-42", deps().d);
    expect(r!.proof.commitment).toContain("|salt=raffle-42|");
  });

  it("returns null (no charge) when the round fails BLS verification", async () => {
    expect(await randomCall({ kind: "ints", min: 1, max: 100, count: 1 }, "s", deps({ verify: () => false }).d)).toBeNull();
  });

  it("returns null when drand never publishes the round in time", async () => {
    expect(await randomCall({ kind: "ints", min: 1, max: 100, count: 1 }, "s", deps({ fetchRound: async () => null }).d)).toBeNull();
  });

  it("refuses a pulse for a different round than the committed one", async () => {
    expect(await randomCall({ kind: "ints", min: 1, max: 100, count: 1 }, "s", deps({ fetchRound: async () => pulse(999) }).d)).toBeNull();
  });
});
