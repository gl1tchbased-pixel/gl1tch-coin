import { describe, it, expect } from "vitest";
import {
  ranks,
  faq,
  loreFragments,
  rankText,
  faqText,
  loreText,
  linksText,
  LAUNCH_STATUS,
  OFFICIAL,
} from "./content.js";

describe("rankText", () => {
  it("lists every rank in the ladder", () => {
    const out = rankText();
    for (const r of ranks) expect(out).toContain(r.rank);
  });

  it("shows the pre-launch activation note while not live", () => {
    if (LAUNCH_STATUS !== "LIVE") {
      expect(out_contains(rankText(), "activate at launch")).toBe(true);
    }
  });
});

function out_contains(s: string, sub: string) {
  return s.toLowerCase().includes(sub.toLowerCase());
}

describe("faqText", () => {
  it("includes every question", () => {
    const out = faqText();
    for (const f of faq) expect(out).toContain(f.q);
  });

  it("states zero tax", () => {
    expect(out_contains(faqText(), "zero")).toBe(true);
  });
});

describe("linksText", () => {
  it("refuses to show a contract before launch", () => {
    if (LAUNCH_STATUS !== "LIVE" || !OFFICIAL.CONTRACT) {
      expect(out_contains(linksText(), "not live yet")).toBe(true);
    }
  });
});

describe("loreText index handling", () => {
  const n = loreFragments.length;

  it("returns the first fragment at index 0", () => {
    expect(loreText(0)).toContain(loreFragments[0].code);
  });

  it("wraps positive overflow back to the start", () => {
    expect(loreText(n)).toContain(loreFragments[0].code);
  });

  it("wraps negative indices to the end", () => {
    expect(loreText(-1)).toContain(loreFragments[n - 1].code);
  });

  it("masks locked fragments instead of leaking their text", () => {
    const lockedIdx = loreFragments.findIndex((f) => f.locked);
    expect(lockedIdx).toBeGreaterThanOrEqual(0);
    const out = loreText(lockedIdx);
    expect(out_contains(out, "encrypted")).toBe(true);
    expect(out).not.toContain(loreFragments[lockedIdx].text);
  });
});
