import fs from "node:fs";
import path from "node:path";

/**
 * Revenue ledger for the paid agent API (x402). The website reports each settled payment here
 * (token-guarded POST); the public GET /revenue feeds the /revenue page. Every entry carries its
 * on-chain tx, so anyone can check a row against the chain. Our own test payments are kept apart
 * (`self`) and never counted as revenue. Amounts are integer micro-USDC (6 decimals). Every record is
 * written to disk at once (atomic temp+rename), so a restart right after a payment loses nothing.
 */

/** Must list every paid route the site has (src/lib/x402/config.ts PaidRouteId); unknown routes are refused. */
export type RevenueRoute = "scan" | "agent" | "deployer" | "verdict" | "radar" | "random" | "quick" | "batch" | "yield";

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

/** Unpaid 402 answers ("quotes"): how often a paid route is found and priced, next to how often it is
 *  bought. Most quotes come from catalog crawlers and uptime monitors, so the user agents are kept
 *  too (truncated, no IPs) to tell them apart from real clients. */
export interface QuoteSummary {
  last30: { total: number; byRoute: Record<string, number> };
  daily: Record<string, number>;
  userAgents7d: { ua: string; count: number }[];
}

export interface RevenueSummary {
  ok: true;
  since: number | null;
  paid: Tally;
  self: Tally;
  byRoute: Record<string, Tally>;
  byNetwork: Record<string, Tally>;
  daily: Record<string, Tally>;
  recent: RevenueEntry[];
  quotes: QuoteSummary;
}

const ROUTES: readonly RevenueRoute[] = ["scan", "agent", "deployer", "verdict", "radar", "random", "quick", "batch", "yield"];
const NETWORK = /^(solana|eip155):[A-Za-z0-9]{1,64}$/;
const TX = /^([1-9A-HJ-NP-Za-km-z]{64,88}|0x[0-9a-fA-F]{64})$/;
const MAX_MICRO = 1e9; // $1,000 per call: far above any price we charge
const KEEP_RECENT = 500;
const SERVE_RECENT = 50;
const KEEP_SEEN = 5000; // duplicates arrive within seconds; this window is generous
const QUOTE_DAYS = 30;
const UA_LEN = 80;
const UA_PER_DAY = 40; // distinct user agents kept per day; the rest count as "(other)"
const QUOTE_FLUSH_MS = 60_000; // quotes are frequent and cheap to lose, so they are written in batches

/** A quote report → route and a short, printable user agent. Null for an unknown route. */
export function parseQuote(body: unknown): { route: RevenueRoute; ua: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.route !== "string" || !ROUTES.includes(b.route as RevenueRoute)) return null;
  const ua = typeof b.ua === "string" ? b.ua.replace(/[^\x20-\x7e]/g, "").trim().slice(0, UA_LEN) : "";
  return { route: b.route as RevenueRoute, ua: ua || "(none)" };
}

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
  /** day → route → unpaid 402 answers */
  quotes: Record<string, Record<string, number>>;
  /** day → user agent → unpaid 402 answers */
  quoteAgents: Record<string, Record<string, number>>;
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
  quotes: {},
  quoteAgents: {},
});

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

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
  private quoteTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly file = DEFAULT_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, "utf-8");
    } catch {
      console.log(`[revenue] no existing ledger at ${this.file} (starting empty)`);
      return;
    }
    try {
      const p = JSON.parse(raw) as Partial<Persisted>;
      this.s = { ...empty(), ...p };
      this.seen = new Set(this.s.seen);
      console.log(`[revenue] loaded ${this.s.paid.count} paid / ${this.s.self.count} self-test calls from ${this.file}`);
    } catch (e) {
      // Never overwrite a ledger we couldn't read: keep it for recovery and start a new one.
      const aside = `${this.file}.corrupt-${Date.now()}`;
      fs.renameSync(this.file, aside);
      console.error(`[revenue] ledger at ${this.file} is unreadable (${(e as Error).message}); kept it as ${aside}`);
    }
  }

  /** Write the ledger now, atomically (temp file + rename), so a crash mid-write can't tear it.
   *  Payments are rare and worth cents each, so every record is written immediately. */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ ...this.s, seen: [...this.seen] }));
      fs.renameSync(tmp, this.file);
    } catch (e) {
      this.dirty = true;
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
    this.flush();
    return "added";
  }

  /** Count one unpaid 402 answer. Written at most once a minute (and on the next payment). */
  quote(q: { route: RevenueRoute; ua: string }, now = Date.now()): void {
    const day = dayOf(now);
    const routes = (this.s.quotes[day] ??= {});
    routes[q.route] = (routes[q.route] ?? 0) + 1;
    const agents = (this.s.quoteAgents[day] ??= {});
    const ua = q.ua in agents || Object.keys(agents).length < UA_PER_DAY ? q.ua : "(other)";
    agents[ua] = (agents[ua] ?? 0) + 1;
    const oldest = dayOf(now - QUOTE_DAYS * 86_400_000);
    for (const d of Object.keys(this.s.quotes)) if (d < oldest) delete this.s.quotes[d];
    for (const d of Object.keys(this.s.quoteAgents)) if (d < oldest) delete this.s.quoteAgents[d];
    this.dirty = true;
    if (!this.quoteTimer) {
      this.quoteTimer = setTimeout(() => {
        this.quoteTimer = null;
        this.flush();
      }, QUOTE_FLUSH_MS);
      this.quoteTimer.unref?.();
    }
  }

  summary(now = Date.now()): RevenueSummary {
    const { since, paid, self, byRoute, byNetwork, daily } = this.s;
    const recent = this.s.recent.slice(-SERVE_RECENT).reverse();
    return { ok: true, since, paid: { ...paid }, self: { ...self }, byRoute: { ...byRoute }, byNetwork: { ...byNetwork }, daily: { ...daily }, recent, quotes: this.quoteSummary(now) };
  }

  private quoteSummary(now: number): QuoteSummary {
    const byRoute: Record<string, number> = {};
    const dailyTotals: Record<string, number> = {};
    let total = 0;
    for (const [day, routes] of Object.entries(this.s.quotes)) {
      for (const [route, n] of Object.entries(routes)) {
        byRoute[route] = (byRoute[route] ?? 0) + n;
        dailyTotals[day] = (dailyTotals[day] ?? 0) + n;
        total += n;
      }
    }
    const week = dayOf(now - 7 * 86_400_000);
    const agents: Record<string, number> = {};
    for (const [day, uas] of Object.entries(this.s.quoteAgents)) {
      if (day < week) continue;
      for (const [ua, n] of Object.entries(uas)) agents[ua] = (agents[ua] ?? 0) + n;
    }
    const userAgents7d = Object.entries(agents)
      .map(([ua, count]) => ({ ua, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    return { last30: { total, byRoute }, daily: dailyTotals, userAgents7d };
  }
}

export const revenueStore = new RevenueStore();
