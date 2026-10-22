import fs from "node:fs";
import path from "node:path";
import { merkleProof, merkleRoot, type ProofStep, type VerdictRecord } from "./merkle.js";

/**
 * Anchoring store (bot side, no key). Holds each Rug Radar sweep's verdicts so anyone can fetch a verdict's
 * Merkle proof, plus the transaction that sealed its root once the linker has seen it on-chain.
 * Append-only JSONL on the Railway volume: a sweep or an anchor is one line, nothing is rewritten.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.ATTEST_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-attest.jsonl") : "/tmp/gl1tch-attest.jsonl");

/** Sweeps held in memory and served (~31 days at one per 30 min). The file keeps everything as the archive. */
const MEMORY_CAP = 1500;
/** An unsealed sweep older than this is no longer offered to the runner. */
const PENDING_MAX_AGE_MS = 7 * 86_400_000;

export interface Anchor {
  sig: string;
  slot: number;
  blockTime: number | null;
}

export interface Batch {
  root: string;
  count: number;
  sweepMs: number;
  receivedAt: number;
  records: VerdictRecord[];
  anchor?: Anchor;
}

type Line = ({ t: "batch" } & Omit<Batch, "anchor">) | ({ t: "anchor"; root: string } & Anchor);

export interface ProofEntry {
  record: VerdictRecord;
  index: number;
  proof: ProofStep[];
  root: string;
  count: number;
  sweepMs: number;
  anchor: Anchor | null;
}

const tokenKey = (chain: string, mint: string) => `${chain}:${chain === "solana" ? mint : mint.toLowerCase()}`;

export class AttestStore {
  private batches = new Map<string, Batch>(); // insertion order = sweep order
  private byToken = new Map<string, string[]>(); // token → roots, oldest first
  private loaded = false;

  constructor(private readonly file = STORE_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    let text: string;
    try {
      text = fs.readFileSync(this.file, "utf-8");
    } catch {
      console.log(`[attest] no store at ${this.file} (starting empty)`);
      return;
    }
    for (const l of text.split("\n")) {
      if (!l.trim()) continue;
      try {
        this.apply(JSON.parse(l) as Line);
      } catch {
        // a torn last line after a crash; the rest still loads
      }
    }
    console.log(`[attest] loaded ${this.batches.size} sweeps`);
  }

  private apply(l: Line): void {
    if (l.t === "batch") {
      if (this.batches.has(l.root)) return;
      this.batches.set(l.root, { root: l.root, count: l.count, sweepMs: l.sweepMs, receivedAt: l.receivedAt, records: l.records });
      for (const r of l.records) {
        const k = tokenKey(r.chain, r.mint);
        const list = this.byToken.get(k);
        if (list) list.push(l.root);
        else this.byToken.set(k, [l.root]);
      }
      this.evict();
    } else if (l.t === "anchor") {
      const b = this.batches.get(l.root);
      if (b && !b.anchor) b.anchor = { sig: l.sig, slot: l.slot, blockTime: l.blockTime };
    }
  }

  private evict(): void {
    while (this.batches.size > MEMORY_CAP) {
      const [root, b] = this.batches.entries().next().value as [string, Batch];
      this.batches.delete(root);
      for (const r of b.records) {
        const k = tokenKey(r.chain, r.mint);
        const rest = (this.byToken.get(k) ?? []).filter((x) => x !== root);
        if (rest.length) this.byToken.set(k, rest);
        else this.byToken.delete(k);
      }
    }
  }

  private append(l: Line): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.appendFileSync(this.file, JSON.stringify(l) + "\n");
    } catch (e) {
      console.error("[attest] save failed:", (e as Error).message);
    }
  }

  /** Adds a validated sweep. Idempotent: the same sweep twice has the same root. */
  add(records: VerdictRecord[], sweepMs: number, now = Date.now()): { root: string; count: number; duplicate: boolean } {
    const root = merkleRoot(records);
    if (this.batches.has(root)) return { root, count: records.length, duplicate: true };
    const line: Line = { t: "batch", root, count: records.length, sweepMs, receivedAt: now, records };
    this.apply(line);
    this.append(line);
    return { root, count: records.length, duplicate: false };
  }

  isPending(root: string): boolean {
    const b = this.batches.get(root);
    return !!b && !b.anchor;
  }

  /** Unsealed sweeps, oldest first (the order the runner should seal them). */
  pending(limit: number, now = Date.now()): Batch[] {
    const out: Batch[] = [];
    for (const b of this.batches.values()) {
      if (out.length >= limit) break;
      if (!b.anchor && b.sweepMs >= now - PENDING_MAX_AGE_MS) out.push(b);
    }
    return out;
  }

  /** Records a verified on-chain anchor. Refused unless the sweep exists, is unsealed and the memo matches it. */
  markAnchored(a: { root: string; count: number; sweepMs: number } & Anchor): boolean {
    const b = this.batches.get(a.root);
    if (!b || b.anchor || b.count !== a.count || b.sweepMs !== a.sweepMs) return false;
    const line: Line = { t: "anchor", root: a.root, sig: a.sig, slot: a.slot, blockTime: a.blockTime };
    this.apply(line);
    this.append(line);
    return true;
  }

  batch(root: string): Batch | undefined {
    return this.batches.get(root);
  }

  /** A token's newest verdicts (up to `limit`), each with its Merkle proof and its anchor if sealed. */
  proofs(chain: string, mint: string, limit = 5): ProofEntry[] {
    const key = tokenKey(chain, mint);
    const roots = this.byToken.get(key) ?? [];
    const out: ProofEntry[] = [];
    for (let i = roots.length - 1; i >= 0 && out.length < limit; i--) {
      const b = this.batches.get(roots[i]);
      if (!b) continue;
      const index = b.records.findIndex((r) => tokenKey(r.chain, r.mint) === key);
      if (index < 0) continue;
      out.push({
        record: b.records[index],
        index,
        proof: merkleProof(b.records, index),
        root: b.root,
        count: b.count,
        sweepMs: b.sweepMs,
        anchor: b.anchor ?? null,
      });
    }
    return out;
  }

  summary(): { sweeps: number; sealed: number; pending: number } {
    let sealed = 0;
    for (const b of this.batches.values()) if (b.anchor) sealed++;
    return { sweeps: this.batches.size, sealed, pending: this.batches.size - sealed };
  }
}

export const attestStore = new AttestStore();
