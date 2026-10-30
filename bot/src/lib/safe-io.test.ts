import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { safeWriteJson, safeWriteJsonPretty, safeReadJson } from "./safe-io.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-safe-io-"));

describe("safe-io", () => {
  it("writes and reads JSON atomically without leaving a .tmp file", () => {
    const dir = tmpDir();
    const file = path.join(dir, "nested", "data.json");
    safeWriteJson(file, { ok: true, count: 42 });

    expect(fs.existsSync(file)).toBe(true);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);

    const parsed = safeReadJson<{ ok: boolean; count: number }>(file, "test");
    expect(parsed).toEqual({ ok: true, count: 42 });
  });

  it("writes pretty JSON with 2-space indentation", () => {
    const dir = tmpDir();
    const file = path.join(dir, "pretty.json");
    safeWriteJsonPretty(file, { a: 1 });

    const raw = fs.readFileSync(file, "utf-8");
    expect(raw).toContain('{\n  "a": 1\n}');
    expect(safeReadJson<{ a: number }>(file, "test")).toEqual({ a: 1 });
  });

  it("returns null when file does not exist", () => {
    const dir = tmpDir();
    const file = path.join(dir, "nonexistent.json");
    expect(safeReadJson(file, "test")).toBeNull();
  });

  it("renames corrupt JSON file aside to .corrupt-<timestamp> for forensic recovery", () => {
    const dir = tmpDir();
    const file = path.join(dir, "store.json");
    fs.writeFileSync(file, "{broken-json-payload");

    const res = safeReadJson(file, "test");
    expect(res).toBeNull();
    expect(fs.existsSync(file)).toBe(false);

    const entries = fs.readdirSync(dir);
    const corruptBackup = entries.find((e) => e.startsWith("store.json.corrupt-"));
    expect(corruptBackup).toBeDefined();
    expect(fs.readFileSync(path.join(dir, corruptBackup!), "utf-8")).toBe("{broken-json-payload");
  });
});

