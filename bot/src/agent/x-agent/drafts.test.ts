import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DraftMemory } from "./drafts.js";
import type { Draft } from "./compose.js";

const files: string[] = [];
const tmp = () => {
  const f = path.join(os.tmpdir(), `xdrafts-${process.pid}-${files.length}-${Date.now()}.json`);
  files.push(f);
  return f;
};
afterEach(() => {
  for (const f of files.splice(0)) fs.rmSync(f, { force: true });
});
const d = (id: string, marks: string[] = []): Draft => ({
  variant: { id, voice: "proof", category: "radar-catch", text: `text ${id}` },
  marks,
});

describe("DraftMemory", () => {
  it("finds sent drafts and their marks again after a restart", () => {
    const f = tmp();
    new DraftMemory(f).commit([d("s.radar-catch.a", ["mint:X", "kind:radar-catch"])], 1000);
    const again = new DraftMemory(f);
    expect(again.get("s.radar-catch.a")?.text).toBe("text s.radar-catch.a");
    expect(again.lastUsed("mint:X")).toBe(1000);
    expect(again.get("missing")).toBeNull();
  });

  it("stays bounded", () => {
    const m = new DraftMemory(tmp());
    m.commit(Array.from({ length: 350 }, (_, i) => d(`s.x.${i}`)), 1000);
    expect(m.get("s.x.0")).toBeNull();
    expect(m.get("s.x.349")).not.toBeNull();
  });

  it("forgets marks after a month", () => {
    const m = new DraftMemory(tmp());
    m.mark("kind:reddit", 1000);
    m.commit([], 1000 + 31 * 86_400_000);
    expect(m.lastUsed("kind:reddit")).toBeNull();
  });
});
