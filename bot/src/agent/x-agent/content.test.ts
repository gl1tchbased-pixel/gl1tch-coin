import { describe, it, expect } from "vitest";
import { buildVariant, buildReply, generateBatch } from "./content.js";

describe("X agent content", () => {
  it("buildVariant returns a clamped tweet for a known combo", () => {
    const v = buildVariant("proof", "evergreen", 0);
    expect(v).not.toBeNull();
    expect(v!.text.length).toBeLessThanOrEqual(280);
    expect(v!.text).toContain("$GL1TCH");
    expect(v!.voice).toBe("proof");
    expect(v!.category).toBe("evergreen");
  });

  it("generateBatch returns N diverse variants under the cap", () => {
    const batch = generateBatch(42, 5);
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThanOrEqual(5);
    const texts = new Set(batch.map((v) => v.text));
    expect(texts.size).toBe(batch.length); // no duplicates
    for (const v of batch) expect(v.text.length).toBeLessThanOrEqual(280);
  });

  it("buildReply text is short and brand-correct", () => {
    const r = buildReply(0);
    expect(r.text.length).toBeLessThanOrEqual(280);
    expect(r.text).toMatch(/\$GL1TCH|GL1TCH/);
  });
});
