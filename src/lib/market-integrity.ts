import type { CheckStatus, ScanCheck, ScanRisk, Verdict } from "./scan";
import { parseGeckoOhlcv } from "./ohlcv";

/**
 * Market integrity: is the activity around a token real? The structural checks (authorities, LP lock,
 * holders) say whether the contract can hurt you; they can't see a token whose "trending" volume is
 * bots buying in $3 slices, or whose holder count is one operator's wallet farm. Both are how weak
 * projects manufacture a crowd, and both passed as CLEAN before these checks existed.
 *
 * Thresholds come from real 24-hour readings (Oct 2026): organic tokens, from BONK and WIF down to
 * small caps and launch-day pump.fun mints, average $25+ per trade, while a volume-botted token
 * averaged $2.80 over 34,654 trades. On the holder side the largest linked network is under 3% of
 * holders for every established token we read, against 30% for the botted one.
 */

export interface IntegrityRead {
  status: CheckStatus;
  value: string;
  explain: string;
}

/** Last-24h trading on the pool the scan priced: DexScreener's trade counts, plus unique wallets when
 *  GeckoTerminal reports them. */
export interface TradeActivity {
  volume24h: number | null;
  buys: number | null;
  sells: number | null;
  traders?: number | null;
}

const MIN_TRADES = 100; // fewer trades than this in 24 hours is too little to judge
const BUSY = 1_000; // the bot patterns below only count on a busy pool
const BOT_AVG_USD = 5; // average trade under this on a busy pool = micro-trade bots
const SMALL_AVG_USD = 12;
const BUY_BOT_SKEW = 2.5; // buys per sell, with small trades
const SAME_WALLETS_FAIL = 20; // trades per trading wallet
const SAME_WALLETS_WARN = 10;

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const usd = (n: number) => (n < 10 ? `$${n.toFixed(2)}` : `$${int(n)}`);
const pct = (n: number) => (n < 10 ? `${n.toFixed(1)}%` : `${Math.round(n)}%`);

export function tradeActivityCheck(a: TradeActivity): IntegrityRead {
  const buys = a.buys ?? 0, sells = a.sells ?? 0, trades = buys + sells;
  if (a.volume24h == null || a.buys == null || a.sells == null || trades < MIN_TRADES) {
    return { status: "unknown", value: "—", explain: "Too little trading in the last 24 hours to judge whether the activity is real." };
  }
  const avg = a.volume24h / trades;
  const skew = sells > 0 ? buys / sells : null;
  const perWallet = a.traders ? trades / a.traders : null;
  const value = `${usd(avg)} avg · ${int(trades)} trades`;
  const skewNote = skew != null && skew >= 1.5 ? `, ${skew.toFixed(1)} buys for every sell` : "";
  const wallets = a.traders ? ` by ${int(a.traders)} wallets` : "";

  if (trades >= BUSY && avg < BOT_AVG_USD) {
    return {
      status: "fail", value,
      explain: `${int(trades)} trades in 24 hours averaging ${usd(avg)} each${skewNote}. Real traders don't buy in slices that small: this is the footprint of volume bots that make a token look busy and trending. The activity numbers are inflated.`,
    };
  }
  if (perWallet != null && trades >= 500 && perWallet >= SAME_WALLETS_FAIL) {
    return {
      status: "fail", value,
      explain: `${int(trades)} trades came from only ${int(a.traders as number)} wallets, about ${Math.round(perWallet)} each. The same wallets trading back and forth (wash trading) fake volume; little of it is new money.`,
    };
  }
  if (trades >= BUSY && skew != null && skew >= BUY_BOT_SKEW && avg < 20) {
    return {
      status: "warn", value,
      explain: `${skew.toFixed(1)} buys for every sell, in small trades averaging ${usd(avg)}. Buy bots use this pattern to push a token up the trending lists. Check who is actually buying.`,
    };
  }
  if (trades >= BUSY && avg < SMALL_AVG_USD) {
    return {
      status: "warn", value,
      explain: `${int(trades)} trades averaging only ${usd(avg)}${skewNote}. Smaller than real traders usually buy; part of this volume may be bots.`,
    };
  }
  if (perWallet != null && trades >= 500 && perWallet >= SAME_WALLETS_WARN) {
    return {
      status: "warn", value,
      explain: `${int(trades)} trades from ${int(a.traders as number)} wallets, about ${Math.round(perWallet)} each. Heavy repeat trading by the same wallets can inflate volume.`,
    };
  }
  return {
    status: "pass", value,
    explain: `${int(trades)} trades in 24 hours${wallets}, averaging ${usd(avg)}. Looks like real buyers and sellers, not bot volume.`,
  };
}

/** Size of the largest linked-wallet network RugCheck found (0 = none; null = no report). */
export function biggestNetwork(networks: Array<{ size?: number }> | undefined | null): number | null {
  if (!Array.isArray(networks)) return null;
  return networks.reduce((m, n) => Math.max(m, Number(n?.size) || 0), 0);
}

const NETWORK_MIN = 50; // smaller networks are normal (a team, friends, a few bots)
const NETWORK_FAIL = 0.2; // share of all holders
const NETWORK_WARN = 0.08;

export function walletNetworkCheck(network: number | null, holders: number | null): IntegrityRead {
  if (network == null || holders == null || holders <= 0) {
    return { status: "unknown", value: "—", explain: "Couldn't read how the holders' wallets are linked." };
  }
  if (network === 0) {
    return { status: "pass", value: "none found", explain: "No group of wallets funded from each other among the holders. The holder count looks like separate people." };
  }
  const share = network / holders;
  const value = `${int(network)} of ${int(holders)} holders (${pct(share * 100)})`;
  if (network >= NETWORK_MIN && share >= NETWORK_FAIL) {
    return {
      status: "fail", value,
      explain: `One network of ${int(network)} wallets that sent each other funds makes up ${pct(share * 100)} of all holders. A crowd that size moving together is bots or a single operator: the holder count is inflated, and the "community" may be one group.`,
    };
  }
  if (network >= NETWORK_MIN && share >= NETWORK_WARN) {
    return {
      status: "warn", value,
      explain: `A network of ${int(network)} linked wallets is ${pct(share * 100)} of holders. Part of the holder count may be one group; watch whether they move together.`,
    };
  }
  return {
    status: "pass", value,
    explain: `The largest group of linked wallets is ${int(network)}, ${pct(share * 100)} of holders. Normal for a token this size.`,
  };
}

/** Fall from the highest daily close to the latest one. Candles ascending by time. */
export function peakDrawdown(candles: Array<{ t: number; c: number }>): { pct: number; peakAt: number } | null {
  if (candles.length < 2) return null;
  const peak = candles.reduce((best, x) => (x.c > best.c ? x : best));
  const last = candles[candles.length - 1].c;
  if (!(peak.c > 0)) return null;
  return { pct: Math.max(0, (1 - last / peak.c) * 100), peakAt: peak.t };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMonth = (ms: number) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

export interface IntegrityContext {
  fromPeakPct: number | null;
  peakAt: number | null;
  boosts: number | null; // active paid DexScreener boosts
  links: number | null; // websites + socials listed on DexScreener
}

/** Named-risk chips: context a buyer should see, not scored. */
export function integrityRisks(x: IntegrityContext): ScanRisk[] {
  const out: ScanRisk[] = [];
  if (x.fromPeakPct != null && x.peakAt != null && x.fromPeakPct >= 85) {
    out.push({ name: `Down ${Math.round(x.fromPeakPct)}% from its peak (${dayMonth(x.peakAt)})`, level: x.fromPeakPct >= 95 ? "danger" : "warn" });
  }
  if (x.boosts) out.push({ name: `Paid DexScreener promotion (${x.boosts} boosts)`, level: "info" });
  if (x.links === 0) out.push({ name: "No website or socials listed", level: "info" });
  return out;
}

const CAUTION_TOP = 74; // highest score in the CAUTION band (see bandVerdict)

/** Botted volume or a holder base that is one network can't read CLEAN or LOW RISK: the verdict drops
 *  to CAUTION and the score to the top of that band, so the badge never shows "CAUTION 88/100". */
export function capForIntegrity(verdict: Verdict, score: number, checks: ScanCheck[]): { verdict: Verdict; score: number } {
  const faked = checks.some((c) => (c.key === "trade_quality" || c.key === "wallet_network") && c.status === "fail");
  return faked && (verdict === "CLEAN" || verdict === "LOW RISK")
    ? { verdict: "CAUTION", score: Math.min(score, CAUTION_TOP) }
    : { verdict, score };
}

/* ---------------- GeckoTerminal extras: unique wallets + price history ---------------- */

export interface IntegrityExtras {
  traders: number | null;
  fromPeakPct: number | null;
  peakAt: number | null;
}
export const NO_EXTRAS: IntegrityExtras ={ traders: null, fromPeakPct: null, peakAt: null };

// GeckoTerminal's free API allows ~30 calls a minute and Rug Radar scans 40 tokens a sweep, so the
// extras run on a budget and a cache; when the budget is spent the scan simply goes without them.
const BUDGET_PER_MIN = 20;
let windowStart = 0, spent = 0;
function takeBudget(n: number): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) { windowStart = now; spent = 0; }
  if (spent + n > BUDGET_PER_MIN) return false;
  spent += n;
  return true;
}
const CACHE_MS = 15 * 60_000;
const cache = new Map<string, { at: number; v: IntegrityExtras }>();

async function gt<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const to = AbortSignal.timeout(6000);
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, to]) : to, headers: { accept: "application/json" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Unique wallets trading the pool (24 h) and its fall from peak. `network` is GeckoTerminal's slug. */
export async function fetchIntegrityExtras(network: string, pool: string, ageDays: number | null, signal?: AbortSignal): Promise<IntegrityExtras> {
  const key = `${network}:${pool}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.v;
  if (!takeBudget(2)) return NO_EXTRAS;
  const base = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pool}`;
  // Young pools have too few daily candles to show a peak, so read them hourly.
  const tf = ageDays != null && ageDays < 3 ? "hour?limit=100" : "day?limit=1000";
  const [info, ohlcv] = await Promise.all([
    gt<{ data?: { attributes?: { transactions?: { h24?: { buyers?: number; sellers?: number } } } } }>(base, signal),
    gt<{ data?: { attributes?: { ohlcv_list?: unknown } } }>(`${base}/ohlcv/${tf}&currency=usd&token=base`, signal),
  ]);
  const h24 = info?.data?.attributes?.transactions?.h24;
  // A wallet that both bought and sold is counted on both sides, so this over-counts wallets and
  // under-states trades per wallet: the repeat-trading flags only fire on clear cases.
  const traders = h24 && (h24.buyers || h24.sellers) ? (h24.buyers ?? 0) + (h24.sellers ?? 0) : null;
  const dd = peakDrawdown(parseGeckoOhlcv(ohlcv?.data?.attributes?.ohlcv_list));
  const v = { traders, fromPeakPct: dd?.pct ?? null, peakAt: dd?.peakAt ?? null };
  if (info || ohlcv) cache.set(key, { at: Date.now(), v });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return v;
}
