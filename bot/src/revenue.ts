import fs from "node:fs";
import path from "node:path";

/**
 * Revenue ledger for the paid agent API (x402). The website reports each settled payment here
 * (token-guarded POST); the public GET /revenue feeds the /revenue page. Every entry carries its
 * on-chain tx, so anyone can check a row against the chain. Our own test payments are kept apart
 * (`self`) and never counted as revenue. Amounts are integer micro-USDC (6 decimals).
 */

export type RevenueRoute = "scan" | "agent" | "deployer";

export interface RevenueEntry {
  tx: string;
  network: string;
  route: RevenueRoute;
  amountMicro: number;
  payer?: string;
  self: boolean;
  at: number;
}

export interface Tally { count: number; usdMicro: number }

export interface RevenueSummary {
  ok: true;
  since: number | null;
  paid: Tally;
  self: Tally;
  byRoute: Record<string, Tally>;
  byNetwork: Record<string, Tally>;
  daily: Record<string, Tally>;
  recent: RevenueEntry[];
}

const ROUTES: readonly RevenueRoute[] = ["scan", "agent", "deployer"];
const NETWORK = /^(solana|eip155):[A-Za-z0-9]{1,64}$/;
const TX = /^([1-9A-HJ-NP-Za-km-z]{64,88}|0x[0-9a-fA-F]{64})$/;
const MAX_MICRO = 1e9; // $1,000 per call: far above any price we charge
const KEEP_RECENT = 500;
const SERVE_RECENT = 50;
const KEEP_SEEN = 5000; // duplicates arrive within seconds; this window is generous

/** Validate a reported settlement. Null for anything malformed. */
export function parseRevenueEntry(body: unknown): RevenueEntry | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.tx !== "string" || !TX.test(b.tx)) return null;
  if (typeof b.network !== "string" || !NETWORK.test(b.network)) return null;
  if (typeof b.route !== "string" || !ROUTES.includes(b.route as RevenueRoute)) return null;
  const amount = b.amountMicro;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > MAX_MICRO) return null;
  if (b.payer !== undefined && (typeof b.payer !== "string" || b.payer.length > 64)) return null;
  const at = typeof b.at === "number" && Number.isFinite(b.at) && b.at > 0 ? b.at : Date.now();
  const e: RevenueEntry = { tx: b.tx, network: b.network, route: b.route as RevenueRoute, amountMicro: amount, self: b.self === true, at };
  if (typeof b.payer === "string") e.payer = b.payer;
  return e;
}

interface Persisted {
  since: number | null;
  paid: Tally;
  self: Tally;
  byRoute: Record<string, Tally>;
  byNetwork: Record<string, Tally>;
  daily: Record<string, Tally>;
  recent: RevenueEntry[];
  seen: string[];
}

const empty = (): Persisted => ({
  since: null,
  paid: { count: 0, usdMicro: 0 },
  self: { count: 0, usdMicro: 0 },
  byRoute: {},
  byNetwork: {},
  daily: {},
  recent: [],
  seen: [],
});

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH =
  process.env.REVENUE_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-revenue.json") : "/tmp/gl1tch-revenue.json");

function add(t: Tally, micro: number): void {
  t.count += 1;
  t.usdMicro += micro;
}

export class RevenueStore {
  private s: Persisted = empty();
  private seen = new Set<string>();
  private loaded = false;
  private dirty = false;

  constructor(private readonly file = DEFAULT_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const p = JSON.parse(fs.readFileSync(this.file, "utf-8")) as Partial<Persisted>;
      this.s = { ...empty(), ...p };
      this.seen = new Set(this.s.seen);
      console.log(`[revenue] loaded ${this.s.paid.count} paid / ${this.s.self.count} self-test calls from ${this.file}`);
    } catch {
      console.log(`[revenue] no existing ledger at ${this.file} (starting empty)`);
    }
    // Debounced flush so a burst of payments writes at most ~once/5s.
    setInterval(() => this.flush(), 5000).unref?.();
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ ...this.s, seen: [...this.seen] }));
    } catch (e) {
      console.error("[revenue] save failed:", (e as Error).message);
    }
  }

  record(e: RevenueEntry): "added" | "duplicate" {
    const key = `${e.network}:${e.tx}`;
    if (this.seen.has(key)) return "duplicate";
    this.seen.add(key);
    if (this.seen.size > KEEP_SEEN) this.seen.delete(this.seen.values().next().value as string);

    if (e.self) {
      add(this.s.self, e.amountMicro);
    } else {
      add(this.s.paid, e.amountMicro);
      add((this.s.byRoute[e.route] ??= { count: 0, usdMicro: 0 }), e.amountMicro);
      add((this.s.byNetwork[e.network] ??= { count: 0, usdMicro: 0 }), e.amountMicro);
      const day = new Date(e.at).toISOString().slice(0, 10);
      add((this.s.daily[day] ??= { count: 0, usdMicro: 0 }), e.amountMicro);
      if (this.s.since === null || e.at < this.s.since) this.s.since = e.at;
    }
    this.s.recent.push(e);
    if (this.s.recent.length > KEEP_RECENT) this.s.recent.splice(0, this.s.recent.length - KEEP_RECENT);
    this.dirty = true;
    return "added";
  }

  summary(): RevenueSummary {
    const { since, paid, self, byRoute, byNetwork, daily } = this.s;
    const recent = this.s.recent.slice(-SERVE_RECENT).reverse();
    return { ok: true, since, paid: { ...paid }, self: { ...self }, byRoute: { ...byRoute }, byNetwork: { ...byNetwork }, daily: { ...daily }, recent };
  }
}

export const revenueStore = new RevenueStore();
