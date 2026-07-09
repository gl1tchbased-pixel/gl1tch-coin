import fs from "node:fs";
import path from "node:path";
import type { Draw, BeaconEntry } from "./logic.js";

/**
 * Durable Quantum Core store — draws + append-only Beacon log. Same Railway-volume
 * JSON pattern as the Signal Graph (spec §18B.2); no database. The Beacon is the
 * public transparency ledger: every draw event is recorded so anyone can replay it.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.QUANTUM_CORE_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-quantum-core.json") : "/tmp/gl1tch-quantum-core.json");

const BEACON_CAP = 500; // keep the log bounded; oldest trimmed

export class QuantumCoreStore {
  private draws = new Map<string, Draw>();
  private beacon: BeaconEntry[] = [];
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as {
        draws?: Draw[];
        beacon?: BeaconEntry[];
      };
      for (const d of parsed.draws ?? []) this.draws.set(d.id, d);
      this.beacon = parsed.beacon ?? [];
      console.log(`[quantum] loaded ${this.draws.size} draws, ${this.beacon.length} beacon entries`);
    } catch {
      console.log(`[quantum] no store at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({ draws: [...this.draws.values()], beacon: this.beacon }));
    } catch (e) {
      console.error("[quantum] save failed:", (e as Error).message);
    }
  }

  get(id: string): Draw | undefined {
    return this.draws.get(id);
  }

  /** The most-recently-opened draw (by openedAt). */
  current(): Draw | undefined {
    let latest: Draw | undefined;
    for (const d of this.draws.values()) if (!latest || d.openedAt > latest.openedAt) latest = d;
    return latest;
  }

  upsert(draw: Draw): void {
    this.draws.set(draw.id, draw);
    this.save();
  }

  logBeacon(entry: BeaconEntry): void {
    this.beacon.push(entry);
    if (this.beacon.length > BEACON_CAP) this.beacon = this.beacon.slice(-BEACON_CAP);
    this.save();
  }

  beaconLog(limit = 50): BeaconEntry[] {
    return this.beacon.slice(-limit).reverse();
  }

  /** Add a participant to an open draw (dedup). Returns a typed result. */
  addParticipant(drawId: string, wallet: string): { ok: boolean; error?: string; count?: number } {
    const d = this.draws.get(drawId);
    if (!d) return { ok: false, error: "no_such_draw" };
    if (d.status !== "open") return { ok: false, error: "draw_closed" };
    if (Date.now() >= d.closesAt) return { ok: false, error: "window_closed" };
    if (d.participants.includes(wallet)) return { ok: false, error: "already_entered" };
    d.participants.push(wallet);
    this.save();
    return { ok: true, count: d.participants.length };
  }

  size(): number {
    return this.draws.size;
  }
}

export const quantumCore = new QuantumCoreStore();
