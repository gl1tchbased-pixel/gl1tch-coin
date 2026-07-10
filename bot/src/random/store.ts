import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Commitment, RandomResult } from "./logic.js";

/**
 * Durable Quantum-Randomness store (Railway-volume JSON, same no-DB pattern as the
 * Signal Graph / Quantum Core). Holds every request + its result, plus an append-only
 * hash-chained event log (tamper-evident, Beacon-style) so the full history of
 * commitments and reveals can be replayed and no entry can be silently altered/removed.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.RANDOM_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-random.json") : "/tmp/gl1tch-random.json");

const RECORD_CAP = 2000;
const LOG_CAP = 2000;
const GENESIS = "genesis";

export type RandomStatus = "pending" | "fulfilled" | "void";

export interface RandomRecord {
  id: string;
  status: RandomStatus;
  tier: number;
  tierId: string;
  commitment: Commitment;
  availableAt: number; // best-effort ETA (targetRound maturity) for UX
  result?: RandomResult;
  seedRandomness?: string;
  seedSignature?: string;
  fulfilledAt?: number;
  error?: string;
}

export interface RandomEvent {
  seq: number;
  at: number;
  id: string;
  type: "requested" | "fulfilled" | "void";
  detail: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

const sha = (s: string): string => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

/** Canonical, byte-stable encoding of an event (for the hash chain). */
export function eventCanonical(e: Pick<RandomEvent, "seq" | "at" | "id" | "type" | "detail">): string {
  return `${e.seq}|${e.at}|${e.id}|${e.type}|${JSON.stringify(e.detail)}`;
}
export function eventHash(prevHash: string, e: Pick<RandomEvent, "seq" | "at" | "id" | "type" | "detail">): string {
  return sha(prevHash + "|" + eventCanonical(e));
}

export class RandomStore {
  private records = new Map<string, RandomRecord>();
  private log: RandomEvent[] = [];
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as {
        records?: RandomRecord[];
        log?: RandomEvent[];
      };
      for (const r of parsed.records ?? []) this.records.set(r.id, r);
      this.log = parsed.log ?? [];
      console.log(`[random] loaded ${this.records.size} requests, ${this.log.length} events`);
    } catch {
      console.log(`[random] no store at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      // Trim oldest records/events to keep the file bounded.
      const recs = [...this.records.values()];
      const trimmedRecs = recs.length > RECORD_CAP ? recs.slice(-RECORD_CAP) : recs;
      if (trimmedRecs.length !== recs.length) {
        this.records = new Map(trimmedRecs.map((r) => [r.id, r]));
      }
      if (this.log.length > LOG_CAP) this.log = this.log.slice(-LOG_CAP);
      fs.writeFileSync(STORE_PATH, JSON.stringify({ records: [...this.records.values()], log: this.log }));
    } catch (e) {
      console.error("[random] save failed:", (e as Error).message);
    }
  }

  private appendEvent(id: string, type: RandomEvent["type"], detail: Record<string, unknown>, at: number): void {
    const last = this.log[this.log.length - 1];
    const seq = last ? last.seq + 1 : 0;
    const prevHash = last?.hash ?? GENESIS;
    const hash = eventHash(prevHash, { seq, at, id, type, detail });
    this.log.push({ seq, at, id, type, detail, prevHash, hash });
  }

  get(id: string): RandomRecord | undefined {
    return this.records.get(id);
  }

  /** Record a new pending request + log its commitment. */
  create(rec: RandomRecord): void {
    this.records.set(rec.id, rec);
    this.appendEvent(rec.id, "requested", {
      spec: rec.commitment.spec,
      targetRound: rec.commitment.targetRound,
      source: rec.commitment.source,
      keyHash: rec.commitment.keyHash,
      committedAt: rec.commitment.committedAt,
    }, rec.commitment.committedAt);
    this.save();
  }

  /** Finalize a request with its derived result + seed proof. */
  fulfill(id: string, patch: Pick<RandomRecord, "result" | "seedRandomness" | "seedSignature" | "fulfilledAt">): void {
    const rec = this.records.get(id);
    if (!rec) return;
    rec.status = "fulfilled";
    rec.result = patch.result;
    rec.seedRandomness = patch.seedRandomness;
    rec.seedSignature = patch.seedSignature;
    rec.fulfilledAt = patch.fulfilledAt;
    this.appendEvent(id, "fulfilled", {
      round: rec.commitment.targetRound,
      randomness: patch.seedRandomness,
      result: patch.result,
      recompute: "output = derive(seed=randomness, requestId=id, spec)",
    }, patch.fulfilledAt ?? Date.now());
    this.save();
  }

  /** Void a request that can never be seeded (e.g. its round was skipped). */
  void(id: string, reason: string, at: number): void {
    const rec = this.records.get(id);
    if (!rec) return;
    rec.status = "void";
    rec.error = reason;
    this.appendEvent(id, "void", { reason }, at);
    this.save();
  }

  events(limit = 50): RandomEvent[] {
    return this.log.slice(-limit).reverse();
  }

  stats(): { total: number; fulfilled: number; pending: number } {
    let fulfilled = 0;
    let pending = 0;
    for (const r of this.records.values()) {
      if (r.status === "fulfilled") fulfilled++;
      else if (r.status === "pending") pending++;
    }
    return { total: this.records.size, fulfilled, pending };
  }
}

export const randomStore = new RandomStore();
