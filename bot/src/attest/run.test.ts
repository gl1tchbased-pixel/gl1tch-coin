import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { reportAnchor } from "./run.js";
import { linkReportMessage } from "./guard.js";

const signer = Keypair.generate();

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
  it("posts {root, sig, proof} to the bot's /attest/link, signed by the attester, and returns its answer", async () => {
    const f = fakeFetch([{ ok: true, result: "queued" }]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", signer.secretKey, { fetchFn: f.fn, delayMs: 0 })).toBe("queued");
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].url).toBe("https://bot.example/attest/link");
    const body = f.calls[0].body as { root: string; sig: string; proof: string };
    expect([body.root, body.sig]).toEqual([ROOT, "SIG"]);
    const ok = nacl.sign.detached.verify(Buffer.from(linkReportMessage(ROOT, "SIG"), "utf8"), bs58.decode(body.proof), signer.publicKey.toBytes());
    expect(ok).toBe(true);
  });

  it("retries while the bot's RPC hasn't seen the transaction yet", async () => {
    const f = fakeFetch([{ ok: false, result: "not_found" }, { ok: true, result: "queued" }]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", signer.secretKey, { fetchFn: f.fn, delayMs: 0 })).toBe("queued");
    expect(f.calls).toHaveLength(2);
  });

  it("never throws: an unreachable bot is reported, and the history fallback links later", async () => {
    const f = fakeFetch([new Error("ECONNREFUSED")]);
    expect(await reportAnchor("https://bot.example", ROOT, "SIG", signer.secretKey, { fetchFn: f.fn, delayMs: 0, attempts: 2 })).toBe("unreachable");
    expect(f.calls).toHaveLength(2);
  });
});
