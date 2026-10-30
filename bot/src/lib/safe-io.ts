/**
 * Shared safe I/O helpers for all bot JSON stores.
 *
 * - safeWriteJson: atomic write via temp file + rename (crash-safe).
 * - safeReadJson:  read + parse; if the file is corrupt it is renamed aside
 *                  for forensic recovery instead of being silently discarded.
 *
 * Every store that previously used bare `fs.writeFileSync` should switch to
 * `safeWriteJson` so a mid-write crash can never truncate the data file.
 */

import fs from "node:fs";
import path from "node:path";

/** Atomically write JSON to `filePath` (write to .tmp, then rename). */
export function safeWriteJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, filePath);
}

/** Like `safeWriteJson` but pretty-prints the JSON (2-space indent). */
export function safeWriteJsonPretty(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

/**
 * Read and parse a JSON file.
 *
 * - If the file doesn't exist, returns `null` with a console.log.
 * - If the file exists but is corrupt/unreadable, renames it to
 *   `<file>.corrupt-<timestamp>` for forensic recovery, then returns `null`.
 */
export function safeReadJson<T>(filePath: string, tag: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch (e) {
    if (fs.existsSync(filePath)) {
      try {
        const aside = `${filePath}.corrupt-${Date.now()}`;
        fs.renameSync(filePath, aside);
        console.error(`[${tag}] store at ${filePath} is unreadable; kept as ${aside}`);
      } catch { /* rename failed — volume may be read-only */ }
    } else {
      console.log(`[${tag}] no store at ${filePath} (starting empty)`);
    }
    return null;
  }
}

