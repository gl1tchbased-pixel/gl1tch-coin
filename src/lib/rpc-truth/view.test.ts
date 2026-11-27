import { describe, expect, it } from "vitest";
import { depthCell, findings, hostOf, recommend, recordText, sortEndpoints, spanText, summarize } from "./view";
import { isTruthView } from "./client";
import { truthApiResponse, truthText } from "./api";
import { VIEW } from "./fixture.test-data";

const base = VIEW.chains[0];
const ep = (id: string) => base.endpoints.find((e) => e.id === id)!;

describe("depthCell", () => {
  it("shows ✓ for correct answers and 'says no' for an honest refusal", () => {
    expect(depthCell(base, ep("base:publicnode"), "1d")).toMatchObject({ state: "ok", text: "✓" });
    const c = depthCell(base, ep("base:publicnode"), "7d");
    expect(c.state).toBe("refused");
    expect(c.detail).toContain("needs a paid plan or key");
    expect(c.detail).toContain("Archive requests require a personal token");
  });

  it("flags a silent empty with the exact question asked", () => {
    const c = depthCell(base, ep("base:shady"), "7d");
    expect(c.state).toBe("silent");
    expect(c.detail).toContain("returned nothing");
    expect(c.detail).toContain("7d ago");
  });

  it("does not judge a depth nobody could prove (30-day logs on Base)", () => {
    expect(depthCell(base, ep("base:publicnode"), "30d").state).toBe("unproven");
    expect(depthCell(base, ep("base:tenderly"), "30d").state).toBe("unproven");
  });

  it("marks throttling as inconclusive and down endpoints as not measured", () => {
    expect(depthCell(base, ep("base:busy"), "1h").state).toBe("inconclusive");
    expect(depthCell(base, ep("base:gone"), "1h")).toMatchObject({ state: "none", detail: "Endpoint down" });
  });
});

describe("ordering, text and summaries", () => {
  it("sorts correct endpoints first (deeper reach, wider span, faster), failures last", () => {
    expect(sortEndpoints(base.endpoints).map((e) => e.provider)).toEqual(["tenderly", "drpc", "publicnode", "busy", "shady", "gone"]);
  });

  it("formats the getLogs span honestly", () => {
    expect(spanText(ep("base:publicnode"))).toBe("50,000");
    expect(spanText(ep("base:drpc"))).toBe("< 1,000");
    expect(spanText(ep("base:gone"))).toBe("—");
    expect(spanText(VIEW.chains[1].endpoints[0])).toBe("n/a");
  });

  it("counts the summary and lists every silent finding", () => {
    expect(summarize(VIEW)).toEqual({ endpoints: 8, chains: 2, correct: 3, silent: 2, down: 1 });
    const f = findings(VIEW);
    expect(f.map((x) => `${x.endpointId}:${x.depth}`)).toEqual(["base:shady:7d", "solana:publicnode:1d"]);
    expect(f[0]).toMatchObject({ expected: 20, got: 0, verdict: "silent_empty" });
    expect(f[1].expected).toBeNull();
  });

  it("describes the 7-day record", () => {
    expect(recordText(VIEW.records["base:tenderly"])).toBe("0 silent in 28 checks");
    expect(recordText(VIEW.records["base:shady"])).toBe("silent in 9 of 28 checks");
    expect(recordText(VIEW.records["base:busy"])).toBe("new");
    expect(recordText(undefined)).toBe("new");
  });

  it("shortens URLs for display", () => {
    expect(hostOf("https://gateway.tenderly.co/public/base")).toBe("gateway.tenderly.co/public/base");
    expect(hostOf("https://base.drpc.org")).toBe("base.drpc.org");
  });
});

describe("recommend", () => {
  it("never recommends an endpoint with a silent failure in the last 7 days, nor an inconclusive or down one", () => {
    expect(recommend(VIEW, "base").map((r) => r.provider)).toEqual(["tenderly", "publicnode"]);
  });

  it("filters by history depth and getLogs span", () => {
    expect(recommend(VIEW, "base", { depth: "7d" }).map((r) => r.provider)).toEqual(["tenderly"]);
    expect(recommend(VIEW, "base", { minSpan: 10_000 }).map((r) => r.provider)).toEqual(["publicnode"]);
    expect(recommend(VIEW, "base", { depth: "7d", minSpan: 10_000 })).toEqual([]);
  });

  it("ignores minSpan on Solana and returns [] for an unmeasured chain", () => {
    expect(recommend(VIEW, "solana", { minSpan: 50_000 }).map((r) => r.provider)).toEqual(["solana-foundation"]);
    expect(recommend(VIEW, "polygon")).toEqual([]);
  });
});

describe("isTruthView", () => {
  it("accepts a real view and rejects broken shapes", () => {
    expect(isTruthView(VIEW)).toBe(true);
    expect(isTruthView(null)).toBe(false);
    expect(isTruthView({ ...VIEW, version: 2 })).toBe(false);
    expect(isTruthView({ ...VIEW, chains: [{ chain: "base" }] })).toBe(false);
    expect(isTruthView({ ok: false, error: "warming_up" })).toBe(false);
  });
});

describe("/api/rpc-truth response", () => {
  const q = (s: string) => new URLSearchParams(s);

  it("validates parameters before anything else", () => {
    expect(truthApiResponse(VIEW, q("chain=tron")).status).toBe(400);
    expect(truthApiResponse(VIEW, q("chain=base&depth=2d")).status).toBe(400);
    expect(truthApiResponse(VIEW, q("chain=base&minSpan=-5")).status).toBe(400);
    expect(truthApiResponse(VIEW, q("chain=base&minSpan=1.5")).status).toBe(400);
  });

  it("answers 503 (not an empty list) when there is no measurement", () => {
    const r = truthApiResponse(null, q("chain=base"));
    expect(r.status).toBe(503);
  });

  it("returns recommendations, what to avoid, and a note when nothing qualifies", () => {
    const r = truthApiResponse(VIEW, q("chain=BASE&depth=7d"));
    expect(r.status).toBe(200);
    expect(r.body.chain).toBe("base");
    expect((r.body.recommended as { provider: string }[]).map((x) => x.provider)).toEqual(["tenderly"]);
    expect((r.body.avoid as { provider: string }[]).map((x) => x.provider).sort()).toEqual(["drpc", "shady"]);
    expect(r.body.note).toBeUndefined();
    const none = truthApiResponse(VIEW, q("chain=base&depth=30d"));
    expect(none.body.recommended).toEqual([]);
    expect(String(none.body.note)).toMatch(/No free endpoint/);
  });

  it("returns the whole measurement without a chain", () => {
    const r = truthApiResponse(VIEW, q(""));
    expect(r.status).toBe(200);
    expect(r.body.summary).toEqual(summarize(VIEW));
    expect((r.body.silentFailures as unknown[]).length).toBe(2);
    expect(r.body.measuredAt).toBe(new Date(VIEW.finishedAt).toISOString());
  });
});

describe("MCP text", () => {
  it("names good endpoints and the ones to avoid", () => {
    const t = truthText(VIEW, "solana", "1d");
    expect(t).toContain("https://api.mainnet-beta.solana.com");
    expect(t).toContain("Avoid (silent empty answers right now): https://solana-rpc.publicnode.com");
    expect(t).toContain("needs 1d of history");
  });

  it("says so when there is no measurement", () => {
    expect(truthText(null, "base")).toMatch(/not available/);
  });
});
