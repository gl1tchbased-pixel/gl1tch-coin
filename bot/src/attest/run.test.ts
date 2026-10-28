import { describe, expect, it } from "vitest";
import { reportAnchor } from "./run.js";

const ROOT = "ab".repeat(32);

function fakeFetch(answers: unknown[]) {
  const calls: { url: string; body: unknown }[] = [];
  const fn = (async (url: string, init?: { body?: string }) => {
    calls.push({ url, body: JSON.parse(init?.body ?? "null") });
    const a = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (a instanceof Error) throw a;
    return new Response(JSON.stringify(a), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("reportAnchor — the runner tells the bot which transaction sealed a sweep", () => {
  it("posts {root, sig} to the bot's /attest/link and returns its answer", async () => {
    const f = fakeFetch([{ ok: true, result: "queued" }]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", { fetchFn: f.fn, delayMs: 0 })).toBe("queued");
    expect(f.calls).toEqual([{ url: "https://bot.example/attest/link", body: { root: ROOT, sig: "SIG" } }]);
  });

  it("retries while the bot's RPC hasn't seen the transaction yet", async () => {
    const f = fakeFetch([{ ok: false, result: "not_found" }, { ok: true, result: "queued" }]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", { fetchFn: f.fn, delayMs: 0 })).toBe("queued");
    expect(f.calls).toHaveLength(2);
  });

  it("never throws: an unreachable bot is reported, and the history fallback links later", async () => {
    const f = fakeFetch([new Error("ECONNREFUSED")]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", { fetchFn: f.fn, delayMs: 0, attempts: 2 })).toBe("unreachable");
    expect(f.calls).toHaveLength(2);
  });
});
