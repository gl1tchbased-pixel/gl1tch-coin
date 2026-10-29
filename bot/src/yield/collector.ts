import { readAave, readGas, readPrices, readRates, readSolanaNetwork, readSpl } from "./adapters.js";
import { growthApy } from "./math.js";
import { AAVE } from "./registry.js";
import { createRpc, type Rpc } from "./rpc.js";
import type { YieldStore } from "./store.js";
import type { SolanaNetwork, YieldOpportunity, YieldSnapshot } from "./types.js";

/**
 * Yield X-Ray collector: one hourly pass over every source. A failed source never blanks the page — its
 * last rows are carried over marked stale — and exchange-rate yields are measured from the store's history.
 */

export interface CollectorDeps {
  readPrices: typeof readPrices;
  readSolanaNetwork: typeof readSolanaNetwork;
  readGas: typeof readGas;
  readAave: typeof readAave;
  readSpl: typeof readSpl;
  readRates: typeof readRates;
}

const DEFAULT_DEPS: CollectorDeps = { readPrices, readSolanaNetwork, readGas, readAave, readSpl, readRates };
const H = 3_600_000;
const D = 24 * H;
const NO_NETWORK: SolanaNetwork = { solanaEpochsPerYear: null, solanaInflation: null, solanaStakedShare: null };

const sourceOf = (o: YieldOpportunity) => (o.protocol === "aave-v3" ? `aave:${o.chain}` : o.chain === "solana" ? "spl" : "rates");

/** Replace the adapter's APY with GL1TCH's own measured growth when history allows: 7 days, else 24 h (rate-only rows). */
function withGrowth(o: YieldOpportunity, store: YieldStore, now: number): YieldOpportunity {
  const r1 = Number(o.rate);
  if (!(r1 > 0)) return o;
  const week = store.nearest(o.id, now - 7 * D, 12 * H);
  const day = o.method === "growth" ? store.nearest(o.id, now - D, 3 * H) : null;
  const from = week ?? day;
  const r0 = Number(from?.rate);
  if (!from || !(r0 > 0)) return o;
  const apy = growthApy(r0, from.t, r1, now);
  if (apy === null) return o;
  return {
    ...o,
    method: "growth",
    apy,
    window: week ? "7d" : "24h",
    inputs: { ...o.inputs, growthFromRate: from.rate!, growthFromTime: new Date(from.t).toISOString(), growthToRate: o.rate!, growthToTime: new Date(now).toISOString() },
  };
}

export async function collect(rpc: Rpc, store: YieldStore, now: number, deps: CollectorDeps = DEFAULT_DEPS): Promise<YieldSnapshot> {
  const sources: YieldSnapshot["sources"] = [];
  const timed = async <T,>(id: string, f: () => Promise<T>): Promise<T | null> => {
    const t0 = Date.now();
    try {
      const v = await f();
      sources.push({ id, ok: true, ms: Date.now() - t0 });
      return v;
    } catch (e) {
      sources.push({ id, ok: false, ms: Date.now() - t0, error: String((e as Error)?.message ?? e).slice(0, 200) });
      return null;
    }
  };

  const prices = (await timed("prices", () => deps.readPrices(rpc, now))) ?? {};
  const [network, gas] = await Promise.all([
    timed("solana-network", () => deps.readSolanaNetwork(rpc)),
    timed("gas", () => deps.readGas(rpc, prices)),
  ]);
  const net = network ?? NO_NETWORK;

  const groups = await Promise.all([
    ...AAVE.map(async (a) => ({ id: `aave:${a.chain}`, rows: await timed(`aave:${a.chain}`, () => deps.readAave(rpc, a, now)) })),
    (async () => ({ id: "spl", rows: await timed("spl", () => deps.readSpl(rpc, prices, net.solanaEpochsPerYear, now)) }))(),
    (async () => ({ id: "rates", rows: await timed("rates", () => deps.readRates(rpc, prices, now)) }))(),
  ]);

  const prev = store.snapshot();
  const opportunities: YieldOpportunity[] = [];
  for (const g of groups) {
    if (!g.rows) {
      opportunities.push(...(prev?.opportunities ?? []).filter((o) => sourceOf(o) === g.id).map((o) => ({ ...o, stale: true })));
      continue;
    }
    for (const fresh of g.rows) {
      const o = withGrowth(fresh, store, now);
      store.append(o.id, { t: now, apy: o.apy, tvlUsd: o.tvlUsd, rate: o.rate }, now);
      opportunities.push(o.method === "growth" ? { ...o, measuredSinceMs: store.firstSeen(o.id) } : o);
    }
  }

  const snapshot: YieldSnapshot = { updatedAt: now, opportunities, sources, prices, gas: gas ?? {}, network: net };
  store.setSnapshot(snapshot);
  store.save();
  return snapshot;
}

/** Collect once shortly after boot, then hourly. Overlapping runs are skipped. */
export function startYieldCollector(store: YieldStore, rpc: Rpc = createRpc()): void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const s = await collect(rpc, store, Date.now());
      console.log(`[yield] ${s.opportunities.length} opportunities, ${s.sources.filter((x) => !x.ok).length} sources failed`);
    } catch (e) {
      console.error("[yield] collect failed:", (e as Error).message);
    } finally {
      running = false;
    }
  };
  setTimeout(run, 20_000).unref?.();
  setInterval(run, 60 * 60_000).unref?.();
}
