import { describe, expect, it } from "vitest";
import { classifyError, gradeEndpoint, judgeProbe, median, type CallOutcome } from "./judge.js";

const data = (fingerprint: string, size: number): CallOutcome => ({ kind: "data", fingerprint, size, ms: 100 });
const empty: CallOutcome = { kind: "empty", ms: 90 };
const err = (message: string): CallOutcome => ({ kind: "error", errorClass: classifyError(message), message, ms: 50 });

describe("classifyError — real messages seen from public endpoints (26–27 Nov 2026)", () => {
  it.each([
    ["Archive requests require a personal token. Get one at: https://www.allnodes.com/publicnode", "paid_plan_required"],
    ["ranges over 100 blocks are not supported on free plan", "range_limit"],
    ["Rate limit exceeded. Upgrade your plan at https://thirdweb.com/pricing", "rate_limited"],
    ["You reached Public endpoint rate limit, please upgrade to paid plan", "rate_limited"],
    ["eth_getLogs is limited to 0 - 50 blocks range", "range_limit"],
    ["log query range must not exceed 25 blocks", "range_limit"],
    ["query exceeds max results 20000, retry with the range 62561432-62563953", "result_limit"],
    ["Block 467970595 cleaned up, does not exist on node. First available block: 468626584", "history_unavailable"],
    ["Too many requests for a specific RPC call", "rate_limited"],
    ["request limit reached", "rate_limited"],
    ["http 429 Too Many Requests", "rate_limited"],
    ['"This endpoint has been discontinued."', "discontinued"],
    ["method not available", "method_unsupported"],
    ["Unauthorized: You must authenticate your request with an API key.", "auth_required"],
    ["http 525", "http_error"],
    ["invalid params", "other"],
  ])("%s → %s", (msg, cls) => {
    expect(classifyError(msg)).toBe(cls);
  });
});

describe("judgeProbe", () => {
  it("calls an empty answer a SILENT EMPTY when another endpoint proved the data exists", () => {
    const j = judgeProbe({
      a: { provider: "p1", outcome: data("f1", 40) },
      b: { provider: "p2", outcome: data("f1", 40) },
      c: { provider: "p3", outcome: empty },
    });
    expect(j.exists).toBe(true);
    expect(j.reference).toEqual({ fingerprint: "f1", size: 40, providers: 2 });
    expect(j.verdicts.c.verdict).toBe("silent_empty");
    expect(j.verdicts.a.verdict).toBe("ok");
  });

  it("proves existence from a single provider (Solana has few free providers)", () => {
    const j = judgeProbe({ a: { provider: "sf", outcome: data("tx", 1) }, b: { provider: "pn", outcome: empty } });
    expect(j.reference).toBeNull();
    expect(j.verdicts.a.verdict).toBe("ok");
    expect(j.verdicts.b.verdict).toBe("silent_empty");
  });

  it("never treats two URLs of the same provider as independent confirmation", () => {
    const j = judgeProbe({
      a: { provider: "sf", outcome: data("x", 5) },
      b: { provider: "sf", outcome: data("x", 5) },
      c: { provider: "other", outcome: data("y", 4) },
    });
    expect(j.reference).toBeNull();
    // Without an independent reference a different non-empty answer is not called a mismatch.
    expect(j.verdicts.c.verdict).toBe("ok");
  });

  it("flags a different answer as a MISMATCH only against a two-provider reference", () => {
    const j = judgeProbe({
      a: { provider: "p1", outcome: data("full", 50) },
      b: { provider: "p2", outcome: data("full", 50) },
      c: { provider: "p3", outcome: data("partial", 30) },
    });
    expect(j.verdicts.c).toMatchObject({ verdict: "mismatch", size: 30 });
  });

  it("leaves empties unjudged when nobody could show data, and keeps errors honest", () => {
    const j = judgeProbe({
      a: { provider: "p1", outcome: empty },
      b: { provider: "p2", outcome: err("Archive requests require a personal token") },
      c: { provider: "p3", outcome: err("http 429 Too Many Requests") },
      d: { provider: "p4", outcome: { kind: "timeout", ms: 12000 } },
    });
    expect(j.exists).toBe(false);
    expect(j.verdicts.a.verdict).toBe("unverified");
    expect(j.verdicts.b).toMatchObject({ verdict: "refused", errorClass: "paid_plan_required" });
    expect(j.verdicts.c).toMatchObject({ verdict: "throttled", errorClass: "rate_limited" });
    expect(j.verdicts.d.verdict).toBe("timeout");
  });

  it("prefers the larger agreed answer when two references exist", () => {
    const j = judgeProbe({
      a: { provider: "p1", outcome: data("small", 3) },
      b: { provider: "p2", outcome: data("small", 3) },
      c: { provider: "p3", outcome: data("big", 9) },
      d: { provider: "p4", outcome: data("big", 9) },
    });
    expect(j.reference?.fingerprint).toBe("big");
  });
});

describe("gradeEndpoint", () => {
  it("trusted when every proven probe is correct", () => {
    expect(gradeEndpoint({ headOk: true, byDepth: { "1h": ["ok"], "1d": ["ok"], "7d": ["ok"], "30d": ["ok"] } })).toEqual({ grade: "trusted", reach: "30d", silentCount: 0 });
  });

  it("does not punish refusing history nobody could prove (depth left out)", () => {
    expect(gradeEndpoint({ headOk: true, byDepth: { "1h": ["ok"], "1d": ["ok"], "7d": ["ok"] } }).grade).toBe("trusted");
  });

  it("silent_failure beats everything else, even a deep reach", () => {
    const g = gradeEndpoint({ headOk: true, byDepth: { "1h": ["ok"], "1d": ["ok", "silent_empty"], "7d": ["ok"] } });
    expect(g).toEqual({ grade: "silent_failure", reach: "1h", silentCount: 1 });
  });

  it("honest_limited when it plainly refused deeper history", () => {
    expect(gradeEndpoint({ headOk: true, byDepth: { "1h": ["ok"], "1d": ["ok"], "7d": ["refused"], "30d": ["refused"] } })).toEqual({ grade: "honest_limited", reach: "1d", silentCount: 0 });
  });

  it("unreliable when throttling or timeouts hide the answer", () => {
    expect(gradeEndpoint({ headOk: true, byDepth: { "1h": ["ok"], "1d": ["throttled"] } }).grade).toBe("unreliable");
    expect(gradeEndpoint({ headOk: true, byDepth: {} }).grade).toBe("unreliable");
  });

  it("down when the head check failed", () => {
    expect(gradeEndpoint({ headOk: false, byDepth: {} }).grade).toBe("down");
  });
});

describe("median", () => {
  it("handles empty, odd and even lists", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(3);
  });
});
