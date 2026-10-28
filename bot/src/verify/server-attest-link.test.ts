import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createVerifyServer } from "./server.js";

const seen: unknown[] = [];
let server: Server;
let base: string;

beforeAll(async () => {
  server = createVerifyServer({
    origin: "https://gl1tchbased.xyz",
    handle: async () => ({ status: 404, body: {} }),
    attest: {
      token: "t".repeat(32),
      add: () => ({ ok: false }),
      info: () => ({}),
      pending: () => [],
      batch: () => null,
      proof: () => [],
      link: async (body) => {
        seen.push(body);
        const b = body as { sig?: string };
        return b.sig === "good" ? "queued" : b.sig === "bad" ? "invalid" : "rejected";
      },
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

const post = (body: string) => fetch(`${base}/attest/link`, { method: "POST", headers: { "content-type": "application/json" }, body });

describe("bridge POST /attest/link (public: the report is verified on-chain, not trusted)", () => {
  it("hands the report to the linker without needing a token", async () => {
    const r = await post(JSON.stringify({ root: "r", sig: "good" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, result: "queued" });
    expect(seen.at(-1)).toEqual({ root: "r", sig: "good" });
  });

  it("answers 400 for an invalid report, and ok:false for one the linker refused", async () => {
    expect((await post(JSON.stringify({ sig: "bad" }))).status).toBe(400);
    const r = await post(JSON.stringify({ sig: "other" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: false, result: "rejected" });
  });

  it("refuses bad JSON and oversized bodies", async () => {
    expect((await post("{not json")).status).toBe(400);
    await expect(post(JSON.stringify({ pad: "x".repeat(4096) }))).rejects.toThrow();
  });
});
