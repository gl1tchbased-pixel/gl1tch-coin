import { describe, it, expect } from "vitest";
import { verdictCard } from "./verdict";

const check = (label: string, status: string, value = "x") => ({ key: label.toLowerCase(), label, status, value, explain: "…" });

describe("verdictCard", () => {
  const body = {
    mint: "Mint111",
    chain: "solana",
    name: "Example",
    symbol: "EXM",
    verdict: "HIGH RISK",
    score: 22,
    confidence: 88,
    verified: false,
    bottomLine: "Mint authority is still active.",
    aiVerdict: "in-character narrative that must not reach the card",
    scannedAt: 1793217679232,
    checks: [
      check("Liquidity", "warn"),
      check("Mint authority", "fail", "ACTIVE"),
      check("Holders", "pass"),
      check("Freeze authority", "fail", "ACTIVE"),
      check("Tax", "warn"),
      check("LP lock", "warn"),
    ],
  };

  it("lists failures before warnings, at most three, and drops passes", () => {
    expect(verdictCard(body, "https://gl1tchbased.xyz").reasons).toEqual([
      { label: "Mint authority", value: "ACTIVE", status: "fail" },
      { label: "Freeze authority", value: "ACTIVE", status: "fail" },
      { label: "Liquidity", value: "x", status: "warn" },
    ]);
  });

  it("links the shareable scan page and its card image", () => {
    expect(verdictCard(body, "https://gl1tchbased.xyz/").card).toEqual({
      page: "https://gl1tchbased.xyz/scan/solana-Mint111",
      image: "https://gl1tchbased.xyz/scan/solana-Mint111/opengraph-image",
    });
  });

  it("describes only: summary from the bottom line, no narrative", () => {
    const card = verdictCard(body, "https://gl1tchbased.xyz");
    expect(card.summary).toBe("Mint authority is still active.");
    expect(JSON.stringify(card)).not.toContain("narrative");
    expect(card).toMatchObject({ verdict: "HIGH RISK", score: 22, confidence: 88, verified: false, name: "Example", symbol: "EXM" });
  });

  it("survives a sparse body", () => {
    expect(verdictCard({ mint: "M" }, "https://s")).toMatchObject({ verdict: "UNKNOWN", score: 0, confidence: null, reasons: [], summary: "" });
  });
});
