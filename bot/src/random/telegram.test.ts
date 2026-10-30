import { describe, expect, it } from "vitest";
import { parseGiveawayArgs, checkGiveawayQuota, formatRevealMessage } from "./telegram.js";

describe("Telegram /giveaway command", () => {
  it("parses named entrants with default 1 winner", () => {
    const r = parseGiveawayArgs("@alice @bob @charlie");
    expect(r).toEqual({
      ok: true,
      mode: "labels",
      winners: 1,
      labels: ["@alice", "@bob", "@charlie"],
    });
  });

  it("parses named entrants with explicit winner count", () => {
    const r = parseGiveawayArgs("2 @alice, @bob, @charlie, @dave");
    expect(r).toEqual({
      ok: true,
      mode: "labels",
      winners: 2,
      labels: ["@alice", "@bob", "@charlie", "@dave"],
    });
  });

  it("parses ticket range giveaways", () => {
    expect(parseGiveawayArgs("100")).toEqual({
      ok: true,
      mode: "tickets",
      winners: 1,
      totalTickets: 100,
    });
    expect(parseGiveawayArgs("3 250")).toEqual({
      ok: true,
      mode: "tickets",
      winners: 3,
      totalTickets: 250,
    });
  });

  it("enforces daily quota (1 for free users, 25 for verified $GL1TCH holders)", () => {
    const day = Date.UTC(2026, 9, 31, 10, 0, 0);
    expect(checkGiveawayQuota(777, false, day).allowed).toBe(true);
    expect(checkGiveawayQuota(777, false, day).allowed).toBe(false);

    expect(checkGiveawayQuota(888, true, day).allowed).toBe(true);
    expect(checkGiveawayQuota(888, true, day).allowed).toBe(true);
    expect(checkGiveawayQuota(888, true, day).limit).toBe(25);
  });

  it("formats fulfilled giveaway reveal card with BLS verification link", () => {
    const msg = formatRevealMessage({
      ok: true,
      id: "a".repeat(64),
      status: "fulfilled",
      spec: { kind: "pick", n: 3, k: 1 },
      salt: "s",
      source: "drand-quicknet",
      chainHash: "52db",
      targetRound: 123456,
      committedAt: 1,
      availableAt: 2,
      availableInMs: 0,
      commitmentString: "c",
      recipe: "r",
      mode: "allocation",
      entrants: ["@alice", "@bob", "@charlie"],
      listRoot: "b".repeat(64),
      winners: ["@bob"],
      proof: {
        round: 123456,
        randomness: "deadbeef1234567890abcdef1234567890",
        signature: "sig",
        publicKeyHint: "pk",
        verifyUrl: "https://api.drand.sh/52db/public/123456",
      },
    });
    expect(msg).toContain("QUANTUM GIVEAWAY — WINNER(S) REVEALED");
    expect(msg).toContain("@bob");
    expect(msg).toContain("#123456");
    expect(msg).toContain("/quantum-core/random?id=" + "a".repeat(64));
  });
});

