import fs from "node:fs";
import path from "node:path";
import type { Variant } from "./types.js";
import type { Draft } from "./compose.js";

/**
 * What the composer has served lately: the drafts themselves, so a DM's buttons find the exact text again (even
 * after a restart; data-driven drafts can't be rebuilt from their id), and when each subject was last used, so the
 * same token, red flag or feature doesn't come back day after day. JSON on the data volume, bounded.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.X_DRAFTS_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-x-drafts.json") : "/tmp/gl1tch-x-drafts.json");
const DRAFT_CAP = 300;
const USED_TTL_MS = 30 * 86_400_000;

type Stored = Variant & { at: number };

export class DraftMemory {
  private drafts = new Map<string, Stored>();
  private used = new Map<string, number>();
  private loaded = false;

  constructor(private readonly file = STORE_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const j = JSON.parse(fs.readFileSync(this.file, "utf-8")) as { drafts?: Stored[]; used?: Record<string, number> };
      for (const d of j.drafts ?? []) this.drafts.set(d.id, d);
      for (const [k, t] of Object.entries(j.used ?? {})) this.used.set(k, t);
    } catch {
      // first run, or an unreadable file: start empty
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ drafts: [...this.drafts.values()], used: Object.fromEntries(this.used) }));
    } catch (e) {
      console.error("[x-agent] drafts save failed:", (e as Error).message);
    }
  }

  lastUsed(key: string): number | null {
    this.load();
    return this.used.get(key) ?? null;
  }

  get(id: string): Variant | null {
    this.load();
    const d = this.drafts.get(id);
    if (!d) return null;
    const { at: _at, ...v } = d;
    return v;
  }

  /** Stores drafts that were sent and stamps their marks. */
  commit(drafts: Draft[], now = Date.now()): void {
    this.load();
    for (const d of drafts) {
      this.drafts.set(d.variant.id, { ...d.variant, at: now });
      for (const m of d.marks) this.used.set(m, now);
    }
    while (this.drafts.size > DRAFT_CAP) this.drafts.delete(this.drafts.keys().next().value as string);
    for (const [k, t] of this.used) if (now - t > USED_TTL_MS) this.used.delete(k);
    this.save();
  }

  /** Stamps a key without storing a draft (e.g. the daily Reddit angle). */
  mark(key: string, now = Date.now()): void {
    this.load();
    this.used.set(key, now);
    this.save();
  }
}

export const draftMemory = new DraftMemory();
