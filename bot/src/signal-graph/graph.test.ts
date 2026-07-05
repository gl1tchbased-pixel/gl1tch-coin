import { describe, it, expect } from "vitest";
import { applyObservation, reputation, isRecordable, type Observation } from "./graph.js";

const T = 1_000_000;
const obs = (over: Partial<Observation> = {}): Observation => ({
  deployer: "DEP1",
  chain: "solana",
  mint: "MINT_A",
  verdict: "HIGH RISK",
  score: 20,
  ts: T,
  ...over,
});

describe("applyObservation", () => {
  it("creates a record from the first observation", () => {
    const rec = applyObservation(undefined, obs());
    expect(rec.deployer).toBe("DEP1");
    expect(rec.tokens).toHaveLength(1);
    expect(rec.firstSeen).toBe(T);
  });

  it("dedupes a re-scan of the same mint, keeping the newer read", () => {
    let rec = applyObservation(undefined, obs({ verdict: "HIGH RISK", score: 20, ts: T }));
    rec = applyObservation(rec, obs({ verdict: "SAFE-ish", score: 80, ts: T + 100 }));
    expect(rec.tokens).toHaveLength(1);
    expect(rec.tokens[0].verdict).toBe("SAFE-ish");
    expect(rec.tokens[0].score).toBe(80);
    expect(rec.lastSeen).toBe(T + 100);
  });

  it("accumulates distinct mints newest-first", () => {
    let rec = applyObservation(undefined, obs({ mint: "A", ts: T }));
    rec = applyObservation(rec, obs({ mint: "B", ts: T + 50 }));
    expect(rec.tokens.map((t) => t.mint)).toEqual(["B", "A"]);
  });
});

describe("reputation", () => {
  it("is unknown with no history", () => {
    expect(reputation(undefined).level).toBe("unknown");
  });

  it("flags a serial deployer (2+ flagged tokens)", () => {
    let rec = applyObservation(undefined, obs({ mint: "A", verdict: "RUG-SHAPED", ts: T }));
    rec = applyObservation(rec, obs({ mint: "B", verdict: "HIGH RISK", ts: T + 1 }));
    const rep = reputation(rec);
    expect(rep.level).toBe("serial");
    expect(rep.flaggedCount).toBe(2);
    expect(rep.note).toMatch(/high-risk/i);
  });

  it("is watch with exactly one flagged token", () => {
    let rec = applyObservation(undefined, obs({ mint: "A", verdict: "HIGH RISK", ts: T }));
    rec = applyObservation(rec, obs({ mint: "B", verdict: "SAFE-ish", score: 85, ts: T + 1 }));
    expect(reputation(rec).level).toBe("watch");
  });

  it("is clean with history and no flags", () => {
    let rec = applyObservation(undefined, obs({ mint: "A", verdict: "SAFE-ish", score: 88, ts: T }));
    rec = applyObservation(rec, obs({ mint: "B", verdict: "LOOKS OK", score: 72, ts: T + 1 }));
    const rep = reputation(rec);
    expect(rep.level).toBe("clean");
    expect(rep.flaggedCount).toBe(0);
    expect(rep.worstScore).toBe(72);
  });

  it("excludes the currently-scanned mint so a token never counts itself", () => {
    // Only sighting is the token being scanned → no prior history.
    const rec = applyObservation(undefined, obs({ mint: "SELF", verdict: "HIGH RISK", ts: T }));
    const rep = reputation(rec, { excludeMint: "SELF" });
    expect(rep.tokensSeen).toBe(0);
    expect(rep.level).toBe("unknown");
  });
});

describe("isRecordable", () => {
  it("requires deployer, chain, mint, verdict, ts", () => {
    expect(isRecordable(obs())).toBe(true);
    expect(isRecordable({ ...obs(), deployer: "" })).toBe(false);
    expect(isRecordable({ deployer: "X", chain: "solana", mint: "M" })).toBe(false);
  });
});
