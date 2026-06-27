import { describe, it, expect } from "vitest";
import { scoreOpportunity } from "./scoring.js";

describe("X agent scoring", () => {
  const base = {
    id: "x",
    source: "reddit" as const,
    url: "https://reddit.com/r/solana/x",
    author: "u/alice",
    title: "",
    excerpt: "",
    metrics: { ageHours: 12, engagement: 5, relevance: 1 },
  };

  it("boosts strong Solana-meme signals", () => {
    const s = scoreOpportunity({ ...base, title: "Solana memecoin 100x", excerpt: "found a low cap solana gem on pump.fun" });
    expect(s).toBeGreaterThan(75);
  });

  it("penalizes scam/airdrop keywords", () => {
    const s = scoreOpportunity({ ...base, title: "free airdrop claim", excerpt: "presale ico private sale" });
    expect(s).toBeLessThan(50);
  });

  it("rewards recency", () => {
    const fresh = scoreOpportunity({ ...base, title: "solana new launch", excerpt: "solana pumpfun", metrics: { ...base.metrics, ageHours: 0.5 } });
    const old = scoreOpportunity({ ...base, title: "solana new launch", excerpt: "solana pumpfun", metrics: { ...base.metrics, ageHours: 120 } });
    expect(fresh).toBeGreaterThan(old);
  });
});
