import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createVerifyServer } from "./server.js";

const SNAPSHOT = { updatedAt: 1, opportunities: [{ id: "base-aave-v3-usdc" }], sources: [], prices: {}, gas: {}, network: {} };
let current: unknown = null;
let server: Server;
let base: string;

beforeAll(async () => {
  server = createVerifyServer({
    origin: "https://gl1tchbased.xyz",
    handle: async () => ({ status: 404, body: {} }),
    yield: {
      snapshot: () => current,
      history: (id) => ({ id, points: [{ t: 1, apy: 0.05, tvlUsd: 1, rate: null }] }),
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("GET /yield", () => {
  it("answers 503 until the first collection finishes", async () => {
    current = null;
    const r = await fetch(`${base}/yield`);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ ok: false, error: "warming_up" });
  });

  it("serves the latest snapshot with a short public cache", async () => {
    current = SNAPSHOT;
    const r = await fetch(`${base}/yield`);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("public, max-age=60");
    expect(await r.json()).toEqual(SNAPSHOT);
  });
});

describe("GET /yield/history", () => {
  it("returns the points for a valid id", async () => {
    const r = await fetch(`${base}/yield/history?id=base-aave-v3-usdc`);
    expect(r.status).toBe(200);
    const j = (await r.json()) as { id: string; points: unknown[] };
    expect(j.id).toBe("base-aave-v3-usdc");
    expect(j.points).toHaveLength(1);
  });

  it("rejects a missing or malformed id", async () => {
    for (const q of ["", "?id=", "?id=../etc", "?id=AB", "?id=" + "a".repeat(81)]) {
      const r = await fetch(`${base}/yield/history${q}`);
      expect(r.status, q).toBe(400);
    }
  });
});
