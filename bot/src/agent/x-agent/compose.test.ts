import { describe, expect, it } from "vitest";
import {
  FEATURES,
  TOPICS,
  composeBatch,
  composeOne,
  displayName,
  feature,
  radarCatch,
  redFlag,
  tokenFacts,
  usage,
  type ComposeInput,
} from "./compose.js";
import type { RadarCatch, Signals } from "./signals.js";

const NOW = 1792800000000;
const MINT_A = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const MINT_B = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const catchOf = (over: Partial<RadarCatch>): RadarCatch => ({
  chain: "solana",
  mint: MINT_A,
  name: "Matrix",
  symbol: "MATRIX",
  verdict: "RUG-SHAPED",
  score: 55,
  reason: "Liquidity: $316",
  flagged: true,
  ...over,
});
const sig: Signals = {
  radar: {
    scanned: 40,
    flagged: 2,
    caught: [
      catchOf({}),
      catchOf({ mint: MINT_B, symbol: "SUI", verdict: "HIGH RISK", score: 61, reason: "LP locked / burned: 0%" }),
      catchOf({ mint: "So11111111111111111111111111111111111111112", symbol: "PHANTEON", verdict: "CAUTION", score: 69, reason: "Top holder: 48.7% · pool excluded", flagged: false }),
    ],
  },
  userScans: 675,
  splitSince: 1792449272964,
  recordedSweeps: 5,
  sealedSweeps: 0,
};
const input = (over: Partial<ComposeInput> = {}): ComposeInput => ({ sig, seed: 7, now: NOW, lastUsed: () => null, ...over });
const FORBIDDEN = /no team|guarantee|100x|moon|\bscam\b|safe bet|not a rug/i;

describe("composeBatch", () => {
  it("drafts three different kinds, led by the riskiest fresh radar catch", () => {
    const batch = composeBatch(input());
    expect(batch).toHaveLength(3);
    expect(new Set(batch.map((d) => d.variant.category)).size).toBe(3);
    const first = batch[0];
    expect(first.variant.category).toBe("radar-catch");
    expect(first.variant.text).toContain("$MATRIX");
    expect(first.variant.text).toContain(`gl1tchbased.xyz/scan/solana-${MINT_A}`);
    expect(first.marks).toContain(`mint:${MINT_A}`);
    for (const d of batch) {
      expect(d.variant.text.length).toBeLessThanOrEqual(280);
      expect(d.variant.text).not.toMatch(FORBIDDEN);
      expect(d.variant.id).toMatch(/^s\./);
    }
  });

  it("doesn't post about the same token twice in a week", () => {
    const used = new Map([[`mint:${MINT_A}`, NOW - 3 * 86_400_000]]);
    const d = radarCatch(input({ lastUsed: (k) => used.get(k) ?? null }));
    expect(d?.variant.text).toContain("$SUI");
  });

  it("calls out only HIGH RISK or worse by name", () => {
    const used = new Map([[`mint:${MINT_A}`, NOW], [`mint:${MINT_B}`, NOW]]);
    expect(radarCatch(input({ lastUsed: (k) => used.get(k) ?? null }))).toBeNull();
  });

  it("still drafts when the radar is unreachable", () => {
    const batch = composeBatch(input({ sig: { ...sig, radar: null } }));
    expect(batch.length).toBeGreaterThanOrEqual(2);
    expect(batch.some((d) => d.variant.category.startsWith("radar-"))).toBe(false);
  });

  it("varies across batches once subjects are marked used", () => {
    const used = new Map<string, number>();
    const texts = new Set<string>();
    for (let i = 0; i < 4; i++) {
      for (const d of composeBatch(input({ seed: i, now: NOW + i * 3 * 3_600_000, lastUsed: (k) => used.get(k) ?? null }))) {
        texts.add(d.variant.text);
        for (const m of d.marks) used.set(m, NOW + i * 3 * 3_600_000);
      }
    }
    expect(texts.size).toBeGreaterThanOrEqual(10);
  });
});

describe("builders", () => {
  it("red-flag explainers fit for every topic, with and without live counts", () => {
    for (const t of TOPICS) {
      const others = new Map(TOPICS.filter((x) => x.key !== t.key).map((x) => [`topic:${x.key}`, NOW]));
      const d = redFlag(input({ lastUsed: (k) => others.get(k) ?? null }));
      expect(d?.marks).toContain(`topic:${t.key}`);
      expect(d!.variant.text.length).toBeLessThanOrEqual(280);
    }
  });

  it("feature posts rotate and all fit", () => {
    for (const f of FEATURES) {
      expect(f.text(sig).length).toBeLessThanOrEqual(280);
      expect(f.text({ ...sig, sealedSweeps: 3 }).length).toBeLessThanOrEqual(280);
    }
    const used = new Map(FEATURES.filter((f) => f.key !== "compare").map((f) => [`feature:${f.key}`, NOW - 86_400_000]));
    expect(feature(input({ lastUsed: (k) => used.get(k) ?? null }))?.variant.text).toContain("/scan/compare");
  });

  it("says 'sealed on Solana' only once sweeps are actually sealed", () => {
    const verify = FEATURES.find((f) => f.key === "verify")!;
    expect(verify.text(sig)).not.toMatch(/sealed on Solana/);
    expect(verify.text({ ...sig, sealedSweeps: 1 })).toMatch(/sealed on Solana/);
  });

  it("quotes the people-run scan count only when it's meaningful", () => {
    expect(usage(input())?.variant.text).toContain("675 token checks run by people (not our bots) since 20 Oct");
    expect(usage(input({ sig: { ...sig, userScans: 12 } }))).toBeNull();
  });

  it("token posts stick to verifiable facts and stay rare", () => {
    const d = tokenFacts(input());
    expect(d?.variant.text).toMatch(/gl1tchbased\.xyz\/(proof|token)/);
    expect(d?.variant.text).not.toMatch(FORBIDDEN);
    expect(tokenFacts(input({ lastUsed: (k) => (k === "kind:token" ? NOW - 3_600_000 : null) }))).toBeNull();
  });

  it("composeOne serves the Next button", () => {
    expect(composeOne("feature", input())?.variant.category).toBe("feature");
    expect(composeOne("reply-to-trend", input())).toBeNull();
  });
});

describe("displayName", () => {
  it("keeps a clean ticker as a cashtag", () => {
    expect(displayName({ symbol: "Matrix", name: "", mint: MINT_A })).toBe("$MATRIX");
  });
  it("strips links, mentions and odd characters a launcher could put in a name", () => {
    const n = displayName({ symbol: "@evil http://x.co", name: "@evil visit http://x.co 🚀", mint: MINT_A });
    expect(n).not.toMatch(/[@:/]|http\b.*\./);
    expect(displayName({ symbol: "", name: "", mint: MINT_A })).toBe("7xKX…gAsU");
  });
});
