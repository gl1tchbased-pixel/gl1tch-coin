import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createVerifyServer } from "./server.js";

// Boots the real HTTP server on a random port and checks the per-IP limits end to end.
let base = "";
const server = createVerifyServer({
  origin: "https://gl1tchbased.xyz",
  handle: async () => ({ status: 200, body: { ok: true } }),
  rateLimit: 3,
  stats: { token: "internal-secret", get: () => ({ scanned: 0, flagged: 0 }), bump: () => {} },
});

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const post = (headers: Record<string, string> = {}) =>
  fetch(`${base}/verify`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: "{}" });

describe("bot HTTP limits", () => {
  it("returns 429 once a client passes its write budget", async () => {
    const ip = { "x-real-ip": "198.51.100.1" };
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await post(ip)).status);
    expect(codes.slice(0, 3)).toEqual([200, 200, 200]);
    expect(codes[3]).toBe(429);
  });

  it("can't dodge the limit with a forged first X-Forwarded-For hop", async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await post({ "x-forwarded-for": `6.6.6.${i}, 198.51.100.2` })).status);
    expect(codes).toContain(429);
  });

  it("limits each client separately", async () => {
    expect((await post({ "x-real-ip": "198.51.100.3" })).status).toBe(200);
  });

  it("exempts the website's own calls that carry the shared token", async () => {
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await post({ "x-real-ip": "198.51.100.4", "x-stats-token": "internal-secret" })).status);
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it("does not exempt a wrong token", async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await post({ "x-real-ip": "198.51.100.5", "x-stats-token": "guess" })).status);
    expect(codes).toContain(429);
  });
});
