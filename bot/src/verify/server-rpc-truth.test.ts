import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createVerifyServer } from "./server.js";

let current: unknown = null;
let server: Server;
let base: string;

beforeAll(async () => {
  server = createVerifyServer({
    origin: "https://gl1tchbased.xyz",
    handle: async () => ({ status: 404, body: {} }),
    rpcTruth: { view: () => current },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("GET /rpc-truth", () => {
  it("answers 503 until the first pass finishes", async () => {
    current = null;
    const r = await fetch(`${base}/rpc-truth`);
    expect(r.status).toBe(503);
    expect(r.headers.get("retry-after")).toBe("120");
    expect(await r.json()).toEqual({ ok: false, error: "warming_up" });
  });

  it("serves the latest view with a short public cache", async () => {
    current = { version: 1, chains: [], records: {} };
    const r = await fetch(`${base}/rpc-truth`);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("public, max-age=120");
    expect(await r.json()).toEqual(current);
  });

  it("is not served for other methods", async () => {
    const r = await fetch(`${base}/rpc-truth`, { method: "POST", body: "{}" });
    expect(r.status).not.toBe(200);
  });
});

describe("GET /token-reality", () => {
  it("serves the reality view", async () => {
    const s = createVerifyServer({ origin: "https://gl1tchbased.xyz", handle: async () => ({ status: 404, body: {} }), tokenReality: { view: () => ({ version: 1, chains: [] }) } });
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}/token-reality`;
    const r = await fetch(url);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await r.json()).toEqual({ version: 1, chains: [] });
    await new Promise<void>((r) => s.close(() => r()));
  });
});
