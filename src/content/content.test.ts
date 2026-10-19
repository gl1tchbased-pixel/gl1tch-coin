import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUANTUM_COMPONENTS, QUANTUM_COUNT_WORD } from "./quantum";
import { tokenomicsContent } from "./tokenomics";
import { whitepaperSections } from "./whitepaper";
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
    for (const file of ["src/app/quantum-core/page.tsx"]) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toMatch(stale);
    }
  });
});

describe("whitepaper matches the launch that happened", () => {
  const text = JSON.stringify(whitepaperSections);
  it("has no conceptual allocation table or team percentage", () => {
    expect(text).not.toMatch(/"Allocation","%"/);
    expect(text).not.toMatch(/\["Team","\d/);
    expect(text).toMatch(/100% of the 1,000,000,000 supply launched to the open market/);
  });
  it("discloses the deployer exit and drops pre-launch wording", () => {
    expect(text).toMatch(/2026-08-20/);
    expect(text).not.toMatch(/funds operations via a small/i);
    expect(text).not.toMatch(/before launch, no (CA|contract) exists/i);
  });
  it("doesn't describe give-back payouts as already happening", () => {
    expect(text).not.toMatch(/runs a small, real, fully transparent give-back/i);
    expect(text).not.toMatch(/disbursed quarterly with each transaction/i);
  });
});

describe("no automated score is called an audit", () => {
  it("whitepaper says RugCheck/SolSniffer are scanners, not an audit", () => {
    const text = JSON.stringify(whitepaperSections);
    expect(text).not.toMatch(/equivalent of a third-party audit/i);
  });
  it("the trust wall labels the RugCheck card as a risk check", () => {
    const src = readFileSync(join(process.cwd(), "src/components/sections/TrustWall.tsx"), "utf8");
    expect(src).not.toMatch(/Third-Party Audit/);
  });
});
