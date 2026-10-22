import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createVerifyServer } from "./server.js";

// Boots the real HTTP server and checks the anchoring routes' auth and input handling.
let base = "";
const added: unknown[] = [];
const server = createVerifyServer({
  origin: "https://gl1tchbased.xyz",
  handle: async () => ({ status: 200, body: { ok: true } }),
  attest: {
    token: "site-secret",
    add: (body) => {
      added.push(body);
      return { ok: true, root: "ab".repeat(32), count: 1 };
    },
    info: () => ({ attester: "Attester111", cluster: "devnet" }),
    pending: (limit) => Array.from({ length: limit }, (_, i) => ({ i })),
    batch: (root) => (root === "cd".repeat(32) ? { root } : null),
    proof: (chain, mint) => [{ chain, mint }],
  },
});

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const postBatch = (headers: Record<string, string>, body = "{}") =>
  fetch(`${base}/attest/batch`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });

describe("anchoring routes", () => {
  it("only the site's token can submit a sweep", async () => {
    expect((await postBatch({})).status).toBe(401);
    expect((await postBatch({ "x-stats-token": "guess" })).status).toBe(401);
    expect(added).toHaveLength(0);
    expect((await postBatch({ "x-stats-token": "site-secret" }, '{"records":[]}')).status).toBe(200);
    expect(added).toEqual([{ records: [] }]);
  });

  it("drops an oversized submission", async () => {
    const huge = JSON.stringify({ records: "x".repeat(70 * 1024) });
    await postBatch({ "x-stats-token": "site-secret" }, huge).catch(() => null);
    expect(added).toHaveLength(1);
  });

  it("serves the public reads with bounded inputs", async () => {
    const pending = (await (await fetch(`${base}/attest/pending?limit=999`)).json()) as { batches: unknown[] };
    expect(pending.batches).toHaveLength(20);
    expect((await fetch(`${base}/attest/batch?root=nothex`)).status).toBe(404);
    expect((await fetch(`${base}/attest/batch?root=${"cd".repeat(32)}`)).status).toBe(200);
    expect((await fetch(`${base}/attest/proof`)).status).toBe(400);
    const proof = (await (await fetch(`${base}/attest/proof?mint=So11111111111111111111111111111111111111112`)).json()) as { proofs: unknown[] };
    expect(proof.proofs[0]).toEqual({ chain: "solana", mint: "So11111111111111111111111111111111111111112" });
    expect(((await (await fetch(`${base}/attest/info`)).json()) as { attester: string }).attester).toBe("Attester111");
  });
});
