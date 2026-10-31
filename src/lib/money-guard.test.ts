import { describe, it, expect } from "vitest";
import { moneyGuardProblems } from "../../scripts/money-guard.mjs";

// Split so this file doesn't trip the guard it tests.
const SEND = ["signAndSend", "Transaction(tx)"].join("");
const SIGN = ["sign", "Transaction(tx)"].join("");
const RAW = ["sendRaw", "Transaction(raw)"].join("");

describe("moneyGuardProblems", () => {
  it("refuses a page that asks a wallet to send a transaction", () => {
    expect(moneyGuardProblems({ "src/app/x/page.tsx": `await provider.${SEND};` })[0]).toMatch(/x\/page\.tsx:1 asks for a fund/);
  });

  it("refuses signing outside the attester and allows it inside", () => {
    expect(moneyGuardProblems({ "src/app/x/page.tsx": `await provider.${SIGN};` })[0]).toMatch(/signs outside/);
    expect(moneyGuardProblems({ "bot/src/watch/a.ts": `conn.${RAW};` })[0]).toMatch(/signs outside/);
    expect(moneyGuardProblems({ "bot/src/attest/sender.ts": `conn.${RAW};` })).toEqual([]);
  });

  it("doesn't exempt the attester from fund calls", () => {
    expect(moneyGuardProblems({ "bot/src/attest/sender.ts": `await provider.${SEND};` })).toHaveLength(1);
  });

  it("passes ordinary code", () => {
    expect(moneyGuardProblems({ "src/lib/a.ts": "const signature = await signMessage(bytes);" })).toEqual([]);
  });
});
