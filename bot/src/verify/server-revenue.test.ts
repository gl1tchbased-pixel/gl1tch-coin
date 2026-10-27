import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createVerifyServer } from "./server.js";
import { RevenueStore, parseRevenueEntry } from "../revenue.js";

const TOKEN = "t".repeat(32);
const ENTRY = { tx: "5".repeat(88), network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", route: "scan", amountMicro: 10_000, self: false };

let server: Server;
let base: string;

beforeAll(async () => {
  const store = new RevenueStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-rev-srv-")), "r.json"));
  store.load();
  server = createVerifyServer({
    origin: "https://gl1tchbased.xyz",
    handle: async () => ({ status: 404, body: {} }),
    revenue: {
      token: TOKEN,
      record: (body) => {
        const e = parseRevenueEntry(body);
        return e ? store.record(e) : "invalid";
      },
      summary: () => store.summary(),
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

const post = (body: unknown, token?: string) =>
  fetch(`${base}/revenue/record`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-stats-token": token } : {}) },
    body: JSON.stringify(body),
  });

describe("bridge /revenue", () => {
  it("refuses a record without the token", async () => {
    expect((await post(ENTRY)).status).toBe(401);
    expect((await post(ENTRY, "wrong")).status).toBe(401);
  });

  it("rejects a malformed entry", async () => {
    const r = await post({ ...ENTRY, amountMicro: "10000" }, TOKEN);
    expect(r.status).toBe(400);
  });

  it("records once, reports duplicates, and serves the summary publicly", async () => {
    expect(await (await post(ENTRY, TOKEN)).json()).toEqual({ ok: true, result: "added" });
    expect(await (await post(ENTRY, TOKEN)).json()).toEqual({ ok: true, result: "duplicate" });
    const g = await fetch(`${base}/revenue`);
    expect(g.status).toBe(200);
    expect(g.headers.get("cache-control")).toBe("public, max-age=15");
    const s = (await g.json()) as { paid: { count: number; usdMicro: number } };
    expect(s.paid).toEqual({ count: 1, usdMicro: 10_000 });
  });
});
