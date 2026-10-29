import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync, spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Runs scripts/x402-first-call.mjs as a real process against a local fake RPC / API. */

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "scripts", "x402-first-call.mjs");
const PAY_TO = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";

let server: Server;
let base: string;
let payToHasUsdcAccount = false;
const seenSelfTestHeaders: Array<string | undefined> = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.method === "POST") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const owner = JSON.parse(raw).params[0];
        const holds = owner !== PAY_TO || payToHasUsdcAccount;
        const value = holds ? [{ account: { data: { parsed: { info: { tokenAmount: { amount: owner === PAY_TO ? "0" : "100000" } } } } } }] : [];
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { value } }));
      });
      return;
    }
    seenSelfTestHeaders.push(req.headers["x-gl1tch-self-test"] as string | undefined);
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "fake" }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

function runAsync(args: string[], env: Record<string, string>, cwd: string): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [SCRIPT, ...args], { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

describe("scripts/x402-first-call.mjs", () => {
  it("keeps the test wallet in the repo's gitignored e2e/x402, whatever the working directory", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "where"], { cwd: tmpdir(), encoding: "utf8", env: { ...process.env, X402_TEST_WALLET: "" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(ROOT, "e2e", "x402", "test-wallet.json"));
  });

  it("stops before paying when the revenue wallet has no USDC token account (every Solana payment would fail)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "x402-first-call-"));
    const env = { X402_TEST_WALLET: path.join(dir, "w.json"), SOLANA_RPC: base };
    expect((await runAsync(["init"], env, dir)).status).toBe(0);
    payToHasUsdcAccount = false;
    const r = await runAsync(["run", "--pay-to", PAY_TO, "--base", base], env, dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("has no USDC token account");
    expect(seenSelfTestHeaders).toHaveLength(0);
  }, 30_000);

  it("marks every call as a self-test", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "x402-first-call-"));
    const env = { X402_TEST_WALLET: path.join(dir, "w.json"), SOLANA_RPC: base };
    expect((await runAsync(["init"], env, dir)).status).toBe(0);
    payToHasUsdcAccount = true;
    seenSelfTestHeaders.length = 0;
    const r = await runAsync(["run", "--pay-to", PAY_TO, "--base", base], env, dir);
    expect(r.status).toBe(0);
    expect(seenSelfTestHeaders).toEqual(["1", "1", "1", "1", "1", "1"]); // one call per paid route
  }, 30_000);

  it("limits the run to --routes, and refuses an unknown route before paying", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "x402-first-call-"));
    const env = { X402_TEST_WALLET: path.join(dir, "w.json"), SOLANA_RPC: base };
    expect((await runAsync(["init"], env, dir)).status).toBe(0);
    payToHasUsdcAccount = true;
    seenSelfTestHeaders.length = 0;
    expect((await runAsync(["run", "--pay-to", PAY_TO, "--base", base, "--routes", "scan,radar"], env, dir)).status).toBe(0);
    expect(seenSelfTestHeaders).toEqual(["1", "1"]);
    seenSelfTestHeaders.length = 0;
    expect((await runAsync(["run", "--pay-to", PAY_TO, "--base", base, "--routes", "nope"], env, dir)).status).toBe(1);
    expect(seenSelfTestHeaders).toEqual([]);
  }, 30_000);
});
