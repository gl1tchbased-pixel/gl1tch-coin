import { describe, expect, it } from "vitest";
import { politeCaller, runEvmChain, runSolana, runTruthPass, type RawResult, type RpcCaller } from "./probe.js";
import { CANARY_TOKEN, type Endpoint } from "./registry.js";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ok = (result: unknown): RawResult => ({ ok: true, result, ms: 10 });
const fail = (error: string): RawResult => ({ ok: false, error, timeout: false, ms: 10 });
const hex = (n: number) => "0x" + n.toString(16);
const noWait = { gapMs: 0, retryMs: 0, sleep: async () => {} };

const eps = (chain: Endpoint["chain"], providers: string[]): Endpoint[] => providers.map((p) => ({ id: `${chain}:${p}`, chain, provider: p, url: `https://${p}.example` }));

/**
 * A fake Base chain: head 5,000,000, 2 s blocks (30 days back is block ~3.7M). Each endpoint has a behaviour:
 *  full     — serves every window
 *  shallow  — serves only the last ~2 days, then says "Archive requests require a personal token"
 *  silent   — serves only the last ~2 days, then answers [] (the dangerous failure)
 *  partial  — drops the last log of every window
 *  ratelim  — rate-limited on every getLogs
 */
function fakeEvm(behaviour: Record<string, "full" | "shallow" | "silent" | "partial" | "ratelim">): RpcCaller {
  const HEAD = 5_000_000;
  const canary = CANARY_TOKEN.base;
  return async (url, method, params) => {
    const who = new URL(url).hostname.split(".")[0];
    const b = behaviour[who];
    if (method === "eth_chainId") return ok("0x2105");
    if (method === "eth_blockNumber") return ok(hex(HEAD));
    if (method === "eth_getBlockByNumber") return ok({ timestamp: hex(2 * parseInt(String(params[0]), 16)) });
    if (method === "eth_getLogs") {
      const f = params[0] as { fromBlock: string; toBlock: string; topics: string[] };
      const from = parseInt(f.fromBlock, 16), to = parseInt(f.toBlock, 16);
      if (b === "ratelim") return fail("http 429 Too Many Requests");
      if (f.topics.length > 1) return to - from + 1 > 10_000 ? fail("query exceeds max block range 10000") : ok([]);
      const old = HEAD - from > 2 * 86_400 / 2;
      if (old && b === "shallow") return fail("Archive requests require a personal token");
      if (old && b === "silent") return ok([]);
      const logs = [];
      for (let n = from; n <= to; n++) logs.push({ address: canary, blockNumber: hex(n), transactionHash: `0x${n.toString(16)}`, logIndex: "0x0", topics: [TRANSFER] });
      return ok(b === "partial" ? logs.slice(0, -1) : logs);
    }
    return fail("method not found");
  };
}

describe("runEvmChain (end to end against a fake chain)", () => {
  it("grades full, honest-shallow, silent, partial and rate-limited endpoints correctly", async () => {
    const call = politeCaller(fakeEvm({ full: "full", full2: "full", shallow: "shallow", silent: "silent", partial: "partial", ratelim: "ratelim" }), noWait);
    const r = await runEvmChain("base", eps("base", ["full", "full2", "shallow", "silent", "partial", "ratelim"]), call);
    const g = Object.fromEntries(r.endpoints.map((e) => [e.provider, e]));

    expect(r.blockTimeSec).toBe(2);
    expect(r.probes.map((p) => p.id)).toEqual(["logs-1h", "logs-1d", "logs-7d", "logs-30d"]);
    expect(r.probes.every((p) => p.exists && (p.reference?.providers ?? 0) >= 2)).toBe(true);

    expect(g.full).toMatchObject({ grade: "trusted", reach: "30d", maxLogSpan: 10_000, logSpanLimit: "range_limit" });
    expect(g.shallow).toMatchObject({ grade: "honest_limited", reach: "1d" });
    expect(g.shallow.probes["logs-7d"]).toMatchObject({ verdict: "refused", errorClass: "paid_plan_required" });
    expect(g.silent).toMatchObject({ grade: "silent_failure", silentCount: 2 });
    expect(g.silent.probes["logs-30d"].verdict).toBe("silent_empty");
    expect(g.partial.grade).toBe("silent_failure");
    expect(g.partial.probes["logs-1h"].verdict).toBe("mismatch");
    expect(g.ratelim.grade).toBe("unreliable");
    expect(g.ratelim.probes["logs-1h"].verdict).toBe("throttled");
  });

  it("marks an endpoint on the wrong chain as down, and a rate-limited head as unreliable", async () => {
    const base = fakeEvm({ a: "full", b: "full" });
    const call: RpcCaller = async (url, method, params, t) => {
      if (url.includes("wrong") && method === "eth_chainId") return ok("0x1");
      if (url.includes("busy") && method === "eth_chainId") return fail("http 429 Too Many Requests");
      return base(url, method, params, t);
    };
    const r = await runEvmChain("base", eps("base", ["a", "b", "wrong", "busy"]), politeCaller(call, noWait));
    const g = Object.fromEntries(r.endpoints.map((e) => [e.provider, e]));
    expect(g.wrong).toMatchObject({ grade: "down", headError: "wrong chain 0x1" });
    expect(g.busy.grade).toBe("unreliable");
  });

  it("reports a clear note when no endpoint answers", async () => {
    const r = await runEvmChain("base", eps("base", ["x"]), async () => fail("fetch failed"));
    expect(r.note).toMatch(/No endpoint answered/);
    expect(r.endpoints[0].grade).toBe("down");
  });
});

describe("runSolana (end to end against a fake cluster)", () => {
  // "honest" serves everything; "pn" serves blocks for 1 day but answers null for older transactions and
  // errors on older blocks — exactly what solana-rpc.publicnode.com did on 26–27 Nov 2026.
  const HEAD = 400_000_000;
  const fake: RpcCaller = async (url, method, params) => {
    const who = new URL(url).hostname.split(".")[0];
    const shallowLimit = HEAD - (2 * 86_400) / 0.4;
    if (method === "getSlot") return ok(HEAD);
    if (method === "getBlock") {
      const slot = Number(params[0]);
      if (who === "pn" && slot < shallowLimit) return fail(`Block ${slot} cleaned up, does not exist on node.`);
      const opts = params[1] as { transactionDetails: string };
      return ok({ blockhash: `h${slot}`, parentSlot: slot - 1, ...(opts.transactionDetails === "signatures" ? { signatures: [`s${slot}a`, `s${slot}b`] } : {}) });
    }
    if (method === "getTransaction") {
      const sig = String(params[0]);
      const slot = Number(sig.slice(1, -1));
      if (who === "pn" && slot < HEAD - 3_600 / 0.4 - 1000) return ok(null);
      return ok({ slot, transaction: { signatures: [sig], message: { accountKeys: ["Payer111"] } } });
    }
    if (method === "getSignaturesForAddress") {
      if (who === "pn") return fail("history not available on this node");
      return ok([{ signature: "older1" }, { signature: "older2" }]);
    }
    return fail("method not found");
  };

  it("catches null transactions as silent empties and keeps refusals honest", async () => {
    const r = await runSolana(eps("solana", ["honest", "pn"]), politeCaller(fake, noWait));
    const g = Object.fromEntries(r.endpoints.map((e) => [e.provider, e]));
    expect(g.honest).toMatchObject({ grade: "trusted", reach: "30d" });
    expect(g.pn.grade).toBe("silent_failure");
    expect(g.pn.probes["tx-1d"].verdict).toBe("silent_empty");
    expect(g.pn.probes["block-7d"]).toMatchObject({ verdict: "refused", errorClass: "history_unavailable" });
    expect(g.pn.probes["sigs-7d"]).toMatchObject({ verdict: "refused" });
    expect(r.probes.find((p) => p.id === "tx-30d")?.exists).toBe(true);
  });
});

describe("politeCaller", () => {
  it("serialises calls per URL and retries once after a rate limit", async () => {
    const seen: string[] = [];
    let first = true;
    const inner: RpcCaller = async (url, method) => {
      seen.push(`${url}:${method}`);
      if (first && method === "b") {
        first = false;
        return fail("Too many requests for a specific RPC call");
      }
      return ok(method);
    };
    const slept: number[] = [];
    const call = politeCaller(inner, { gapMs: 7, retryMs: 99, sleep: async (ms) => void slept.push(ms) });
    const [a, b] = await Promise.all([call("u", "a", [], 1), call("u", "b", [], 1)]);
    expect(a).toMatchObject({ ok: true, result: "a" });
    expect(b).toMatchObject({ ok: true, result: "b" });
    expect(seen).toEqual(["u:a", "u:b", "u:b"]);
    expect(slept).toEqual([7, 99, 7]);
  });
});

describe("runTruthPass", () => {
  it("never throws: a chain that blows up becomes a note", async () => {
    const snap = await runTruthPass({
      endpoints: eps("base", ["a"]),
      call: async () => {
        throw new Error("boom");
      },
      polite: noWait,
      now: () => 42,
    });
    expect(snap.version).toBe(1);
    expect(snap.chains).toHaveLength(1);
    expect(snap.chains[0].note).toMatch(/boom|No endpoint/);
  });
});
