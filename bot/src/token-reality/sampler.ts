import { outcomeOf, pickSample, type Candle, type Outcome } from "./outcome.js";
import { EVAL_AFTER_MS, REALITY_CHAINS, type RealityChain, type RealityStore } from "./store.js";

/**
 * New Token Reality sampler. Once an hour, per chain: read GeckoTerminal's newest pools (every launchpad and DEX it
 * indexes: pump.fun, four.meme, Uniswap v2/v3/v4, PancakeSwap, …), keep up to K brand-new tokens chosen at random,
 * and measure the 72-hour outcome of tokens sampled three days ago. Sampling at birth means survivors are never
 * over-represented. Read-only public API, ~2.5 s between calls (GeckoTerminal allows 30/min).
 */

export const GT_NETWORK: Record<RealityChain, string> = {
  solana: "solana",
  ethereum: "eth",
  base: "base",
  bsc: "bsc",
  arbitrum: "arbitrum",
  polygon: "polygon_pos",
};

export type GtGet = (path: string) => Promise<unknown | null>;

export function geckoClient(opts: { gapMs?: number; fetchFn?: typeof fetch; sleep?: (ms: number) => Promise<void> } = {}): GtGet {
  const gap = opts.gapMs ?? 2_500;
  const f = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last = 0;
  return async (path) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = last + gap - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const r = await f(`https://api.geckoterminal.com/api/v2${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
        if (r.status === 404) return { notFound: true };
        if (r.status === 429) {
          await sleep(30_000);
          continue;
        }
        if (!r.ok) continue;
        return await r.json();
      } catch {
        /* retry */
      }
    }
    return null;
  };
}

interface GtPool {
  attributes?: { address?: string; pool_created_at?: string };
  relationships?: { base_token?: { data?: { id?: string } }; dex?: { data?: { id?: string } } };
}

/** GeckoTerminal ids are `<network>_<address>`, and some network ids contain "_" themselves (polygon_pos). */
export function addressFromGtId(id: string | undefined, network: string): string | null {
  const prefix = `${network}_`;
  return id && id.startsWith(prefix) && id.length > prefix.length ? id.slice(prefix.length) : null;
}

/** Quote assets that are never "new tokens" (a fresh pool for them is not a launch). */
const MAJORS = new Set([
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "0x4200000000000000000000000000000000000006",
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  "0x55d398326f99059ff775485246999027b3197955",
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
]);

export interface CycleResult {
  sampled: Record<string, number>;
  rejectedOld: number;
  evaluated: number;
  failed: number;
}

export async function runCycle(
  store: RealityStore,
  gt: GtGet,
  opts: { now?: () => number; perChain?: number; maxChecks?: number; evalLimit?: number; chains?: RealityChain[] } = {}
): Promise<CycleResult> {
  const now = opts.now ?? Date.now;
  const k = opts.perChain ?? 4;
  const maxChecks = opts.maxChecks ?? 8;
  const res: CycleResult = { sampled: {}, rejectedOld: 0, evaluated: 0, failed: 0 };
  const chains = opts.chains ?? REALITY_CHAINS;

  for (const [ci, chain] of chains.entries()) {
    const net = GT_NETWORK[chain];
    const j = (await gt(`/networks/${net}/new_pools?page=1`)) as { data?: GtPool[] } | null;
    const t = now();
    const fresh = (j?.data ?? [])
      .map((p) => ({
        pool: p.attributes?.address ?? "",
        token: addressFromGtId(p.relationships?.base_token?.data?.id, net) ?? "",
        dex: p.relationships?.dex?.data?.id ?? "unknown",
        createdAt: Date.parse(p.attributes?.pool_created_at ?? ""),
      }))
      .filter((p) => p.pool && p.token && Number.isFinite(p.createdAt) && p.createdAt > t - 3 * 3_600_000 && p.createdAt <= t + 60_000)
      .filter((p) => !store.seen(chain, p.pool) && !MAJORS.has(p.token) && !MAJORS.has(p.token.toLowerCase()));
    let accepted = 0;
    for (const c of pickSample(fresh, maxChecks, Math.floor(t / 3_600_000) * 7 + ci)) {
      if (accepted >= k) break;
      store.markSeen(chain, c.pool, t);
      // A brand-new token's earliest pool is this one (or opened within the same hour).
      const tp = (await gt(`/networks/${net}/tokens/${c.token}/pools?page=1`)) as { data?: GtPool[] } | null;
      const created = (tp?.data ?? []).map((p) => Date.parse(p.attributes?.pool_created_at ?? "")).filter(Number.isFinite);
      if (!created.length) continue;
      if (Math.min(...created) < c.createdAt - 3_600_000) {
        res.rejectedOld++;
        continue;
      }
      store.add({ chain, pool: c.pool, token: c.token, dex: c.dex, createdAt: c.createdAt, sampledAt: t });
      accepted++;
    }
    res.sampled[chain] = accepted;
  }

  for (const tok of store.due(now(), opts.evalLimit ?? 30)) {
    const net = GT_NETWORK[tok.chain];
    const before = Math.floor((tok.createdAt + EVAL_AFTER_MS) / 1000);
    const j = (await gt(`/networks/${net}/pools/${tok.pool}/ohlcv/minute?aggregate=15&limit=320&before_timestamp=${before}&currency=usd`)) as
      | { notFound?: boolean; data?: { attributes?: { ohlcv_list?: unknown[] } } }
      | null;
    let outcome: Outcome | null = null;
    if (j?.notFound) outcome = { kind: "no_data" };
    else if (j?.data?.attributes && Array.isArray(j.data.attributes.ohlcv_list)) {
      const candles: Candle[] = (j.data.attributes.ohlcv_list as unknown[][])
        .filter((r) => Array.isArray(r) && r.length >= 5)
        .map((r) => [Number(r[0]) * 1000, Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])]);
      outcome = outcomeOf(candles, tok.createdAt);
    }
    store.setOutcome(tok.chain, tok.pool, outcome, now());
    if (outcome) res.evaluated++;
    else res.failed++;
  }
  store.prune(now());
  store.save();
  return res;
}

/** Hourly schedule anchored to the last cycle, so frequent deploy restarts don't over-sample some hours. */
export function startRealitySampler(store: RealityStore, opts: { gt?: GtGet; now?: () => number; setTimer?: (fn: () => void, ms: number) => unknown } = {}): void {
  const gt = opts.gt ?? geckoClient();
  const now = opts.now ?? Date.now;
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms).unref?.());
  const HOUR = 3_600_000;
  let last = store.lastCycle();
  const delay = () => Math.max(120_000, (last ?? 0) + HOUR - now());
  const tick = async () => {
    try {
      const r = await runCycle(store, gt, { now });
      last = now();
      store.setLastCycle(last);
      console.log(`[token-reality] sampled ${JSON.stringify(r.sampled)}, rejected ${r.rejectedOld} old tokens, evaluated ${r.evaluated}, failed ${r.failed}`);
    } catch (e) {
      console.error("[token-reality] cycle failed:", (e as Error).message);
    } finally {
      setTimer(tick, delay());
    }
  };
  setTimer(tick, delay());
}
