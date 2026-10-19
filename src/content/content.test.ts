import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUANTUM_COMPONENTS, QUANTUM_COUNT_WORD } from "./quantum";
import { tokenomicsContent } from "./tokenomics";
import { RANK_TIERS } from "@/lib/ranks";
import { OFFICIAL } from "@/lib/official";
// Bot duplicates official links + the rank ladder; these must not drift.
import { OFFICIAL as BOT_OFFICIAL, ranks as botRanks } from "../../bot/src/content";
import { RANK_TIERS as BOT_TIERS } from "../../bot/src/ranks";
import { verificationMessage as botMessage } from "../../bot/src/verify/message";
import { verificationMessage as siteMessage } from "@/lib/verify";

describe("cross-surface consistency (single source of truth)", () => {
  it("bot official links match the website", () => {
    expect(BOT_OFFICIAL.X).toBe(OFFICIAL.X_URL);
    expect(BOT_OFFICIAL.TG).toBe(OFFICIAL.TG_URL);
    expect(BOT_OFFICIAL.SITE).toBe(OFFICIAL.SITE_URL);
  });

  it("bot rank ladder names match the website tiers in order", () => {
    expect(botRanks.map((r) => r.rank)).toEqual(RANK_TIERS.map((t) => t.rank));
  });

  it("bot numeric rank thresholds match the website tiers exactly", () => {
    expect(BOT_TIERS.map((t) => [t.id, t.min])).toEqual(
      RANK_TIERS.map((t) => [t.id, t.min])
    );
  });

  it("the wallet-signing message is byte-identical across bot and website", () => {
    expect(botMessage("nonce-xyz")).toBe(siteMessage("nonce-xyz"));
  });
});

describe("tokenomics shows the real fair launch", () => {
  it("has no conceptual allocation table on the site", () => {
    expect(tokenomicsContent).not.toHaveProperty("allocations");
    expect(tokenomicsContent.launch.openMarketPercent).toBe(100);
  });

  it("never prints a team percentage anywhere in the section", () => {
    const text = JSON.stringify(tokenomicsContent);
    expect(text).not.toMatch(/team[^.]{0,24}\d+(\.\d+)?\s*%/i);
    expect(text).not.toMatch(/"Team"/);
  });

  it("states the two facts holders ask about", () => {
    const ids = tokenomicsContent.launch.facts.map((f) => f.id);
    expect(ids).toContain("no-team-allocation");
    expect(ids).toContain("deployer-exit");
    expect(tokenomicsContent.launch.liveHref).toBe("/proof");
  });
});

describe("quantum component count (one source of truth)", () => {
  it("lists the five live components", () => {
    expect(QUANTUM_COMPONENTS).toEqual(["Vault", "Draw", "Seal", "Forge", "Randomness"]);
    expect(QUANTUM_COUNT_WORD).toBe("Five");
  });

  it("no page hard-codes an outdated count", () => {
    const stale = /\b(four|Four)\s+(working\s+)?(quantum\s+)?(components|pillars)\b/;
    for (const file of ["src/app/quantum-core/page.tsx", "src/components/sections/QuantumShowcase.tsx"]) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toMatch(stale);
    }
  });
});
