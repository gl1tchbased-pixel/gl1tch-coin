/**
 * GL1TCH SCANNER — multi-chain layer. Adds:
 *  - name/symbol search (DexScreener) → candidate tokens across all chains
 *  - chain detection from any address
 *  - EVM security scan via GoPlus (Ethereum, BSC, Base, Arbitrum, Polygon, …)
 * Solana keeps its native deep scan (scan.ts). All read-only.
 */

import type { ScanResult, ScanCheck, CheckStatus, Verdict } from "@/lib/scan";
import { scoreChecks, bandVerdict, bottomLineFor, CANONICAL } from "@/lib/scan";
import { fetchTokenMarket } from "@/lib/market-sources";

// DexScreener chainId → GoPlus chain id (EVM numeric). "solana" handled natively.
export const GOPLUS_CHAIN: Record<string, string> = {
  ethereum: "1",
  bsc: "56",
  base: "8453",
  polygon: "137",
  arbitrum: "42161",
  optimism: "10",
  avalanche: "43114",
  fantom: "250",
  cronos: "25",
  zksync: "324",
  linea: "59144",
  scroll: "534352",
  mantle: "5000",
  blast: "81457",
  opbnb: "204",
};

export const CHAIN_LABEL: Record<string, string> = {
  solana: "Solana", ethereum: "Ethereum", bsc: "BNB Chain", base: "Base",
  polygon: "Polygon", arbitrum: "Arbitrum", optimism: "Optimism",
  avalanche: "Avalanche", fantom: "Fantom", cronos: "Cronos", zksync: "zkSync",
  linea: "Linea", scroll: "Scroll", mantle: "Mantle", blast: "Blast", opbnb: "opBNB",
};

export interface TokenCandidate {
  chain: string;
  address: string;
  name: string;
  symbol: string;
  liquidityUsd: number;
  volume24h: number;
  priceUsd: number | null;
}

interface DexPairLite {
  chainId?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceUsd?: string;
}

/**
 * Canonical addresses for the coins people actually search by name. DexScreener's
 * symbol search is gamed by wash-traded clones (a fake "WIF" / "SHIB" can fake BOTH
 * volume and liquidity), so for known names we resolve to the REAL token directly and
 * let the scan engine price it. Unknown names fall back to the heuristic search; for
 * anything obscure, users paste the contract (always exact).
 */
const KNOWN_TOKENS: Record<string, { chain: string; address: string; symbol: string; name: string }> = (() => {
  const map: Record<string, { chain: string; address: string; symbol: string; name: string }> = {};
  for (const t of CANONICAL) {
    const entry = { chain: t.chain, address: t.address, symbol: t.symbol, name: t.name };
    for (const a of t.aliases) map[a] = entry;
  }
  return map;
})();

/**
 * Search by name/symbol/address → ranked candidate tokens across chains.
 *
 * Known coin names resolve to their CANONICAL address (KNOWN_TOKENS) so wash-traded
 * impostors can't win. Otherwise rank by min(volume, liquidity) — the real token is
 * high on BOTH axes; clones fake one, vault tokens fake the other, both sink. Pools
 * with fabricated liquidity (huge depth, ~0 trading) are dropped.
 */
export async function searchTokens(q: string, signal?: AbortSignal): Promise<TokenCandidate[]> {
  const known = KNOWN_TOKENS[q.trim().toLowerCase()];
  if (known) {
    return [{ chain: known.chain, address: known.address, name: known.name, symbol: known.symbol, liquidityUsd: 0, volume24h: 0, priceUsd: null }];
  }
  const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, {
    signal, headers: { accept: "application/json" },
  });
  if (!res.ok) return [];
  const data: { pairs?: DexPairLite[] } = await res.json();
  const byToken = new Map<string, TokenCandidate>();
  for (const p of data.pairs ?? []) {
    const addr = p.baseToken?.address;
    const chain = p.chainId;
    if (!addr || !chain) continue;
    const key = `${chain}:${addr}`;
    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;
    const existing = byToken.get(key);
    // Keep the most-traded pair for each token (tiebreak: deeper liquidity).
    if (!existing || vol > existing.volume24h || (vol === existing.volume24h && liq > existing.liquidityUsd)) {
      byToken.set(key, {
        chain,
        address: addr,
        name: p.baseToken?.name ?? "Unknown",
        symbol: p.baseToken?.symbol ?? "?",
        liquidityUsd: liq,
        volume24h: vol,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
      });
    }
  }
  // Rank by min(volume, liquidity): the real token is high on BOTH axes. Using min
  // (not product) resists single-axis inflation — scam clones fake liquidity (huge
  // liq, ~0 vol) and bridge/vault tokens park billions with no trading; both score low
  // on their weak axis. A momentary-spike fork is low on liquidity. min punishes all.
  const score = (c: TokenCandidate) => Math.min(c.volume24h, c.liquidityUsd);
  return [...byToken.values()]
    // Drop FABRICATED liquidity: a real pool turns over a sane fraction of its depth
    // daily. Liquidity >$1M with <0.02% daily turnover (liq/vol > 5000) is fake — a
    // scam "BTC" parks $6B with $323K volume to look deep. Hard floor at $1M so genuine
    // low-volume small caps aren't touched.
    .filter((c) => !(c.liquidityUsd > 1_000_000 && c.liquidityUsd / Math.max(c.volume24h, 1) > 5000))
    .sort((a, b) => score(b) - score(a) || b.volume24h - a.volume24h)
    .slice(0, 8);
}

interface ChainMarket {
  chain: string | null;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  ageDays: number | null;
}

/**
 * Detect the chain + current market data for any address.
 * Uses DexScreener (all chains) with a per-chain GeckoTerminal backfill so thin or
 * de-indexed pairs still return live price/mcap/liquidity instead of blanks.
 */
export async function detectChainMarket(address: string, knownChain?: string, signal?: AbortSignal): Promise<ChainMarket> {
  const m = await fetchTokenMarket(address, knownChain, signal);
  return {
    chain: m.chain, name: m.name, symbol: m.symbol, priceUsd: m.priceUsd, priceChange24h: m.priceChange24h,
    marketCap: m.marketCap, liquidityUsd: m.liquidityUsd, volume24h: m.volume24h, ageDays: m.ageDays,
  };
}

interface GoPlusEvm {
  is_honeypot?: string;
  cannot_sell_all?: string;
  buy_tax?: string;
  sell_tax?: string;
  is_mintable?: string;
  owner_address?: string;
  can_take_back_ownership?: string;
  hidden_owner?: string;
  transfer_pausable?: string;
  is_blacklisted?: string;
  is_whitelisted?: string;
  is_open_source?: string;
  holder_count?: string;
  total_supply?: string;
  creator_address?: string;
  is_proxy?: string;
  slippage_modifiable?: string;
  personal_slippage_modifiable?: string;
  is_anti_whale?: string;
  anti_whale_modifiable?: string;
  trading_cooldown?: string;
  owner_change_balance?: string;
  selfdestruct?: string;
  external_call?: string;
  lp_holders?: Array<{ is_locked?: number; percent?: string; tag?: string; address?: string }>;
  lp_total_supply?: string;
  is_in_dex?: string;
}

const RENOUNCED = (a?: string) => !a || a === "" || /^0x0+$/.test(a) || /dead$/i.test(a);
const numStr = (s?: string): number | null => (s != null && s !== "" && Number.isFinite(Number(s)) ? Number(s) : null);

/** EVM scan via GoPlus. */
export async function scanEvm(chain: string, address: string, market: ChainMarket, signal?: AbortSignal): Promise<ScanResult> {
  const goId = GOPLUS_CHAIN[chain];
  const checks: ScanCheck[] = [];
  const add = (key: string, label: string, status: CheckStatus, value: string, explain: string) => checks.push({ key, label, status, value, explain });

  let g: GoPlusEvm = {};
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${goId}?contract_addresses=${address}`, { signal, headers: { accept: "application/json" } });
    const j = await res.json();
    g = (Object.values(j.result || {})[0] || {}) as GoPlusEvm;
  } catch { /* leave empty → unknowns */ }

  const honeypot = g.is_honeypot === "1" || g.cannot_sell_all === "1";
  add("honeypot", "Sellable (honeypot)", g.is_honeypot == null ? "unknown" : honeypot ? "fail" : "pass",
    g.is_honeypot == null ? "—" : honeypot ? "CAN'T SELL" : "OK",
    g.is_honeypot == null ? "Couldn't run a honeypot check." : honeypot ? "Buys work but you can't sell. Classic honeypot — do not touch." : "Simulated a sell — it goes through. Not a honeypot.");

  // LP locked / burned — from GoPlus lp_holders (is_locked flag + burn addresses).
  let lpLockedPct: number | null = null;
  if (g.lp_holders && g.lp_holders.length) {
    let locked = 0;
    for (const h of g.lp_holders) {
      const pct = (numStr(h.percent) ?? 0) * 100;
      const burned = /^0x0+$|dead$/i.test(h.address ?? "") || /lock|burn|null/i.test(h.tag ?? "");
      if (h.is_locked === 1 || burned) locked += pct;
    }
    lpLockedPct = Math.min(100, Math.round(locked));
  }
  // Deep, established liquidity is a different risk than a fresh ruggable pool:
  // GoPlus often reports 0% "locked" for blue-chips whose LP predates lockers.
  // So a low lock with deep liquidity is a WARN ("verify"), not a hard FAIL.
  const deepLiq = (market.liquidityUsd ?? 0) >= 100_000;
  const lpStatus: CheckStatus = lpLockedPct == null ? "unknown"
    : lpLockedPct >= 90 ? "pass" : lpLockedPct >= 50 ? "warn" : deepLiq ? "warn" : "fail";
  add("lp_lock", "LP locked / burned", lpStatus,
    lpLockedPct == null ? "—" : `${lpLockedPct}%`,
    lpLockedPct == null ? "Couldn't read LP lock status — verify the pool is locked before trusting it."
      : lpLockedPct >= 90 ? "Liquidity is locked/burned — the team can't pull the pool."
      : lpLockedPct >= 50 ? "Only part of the liquidity is locked; the rest can be pulled."
      : deepLiq ? "No on-chain lock detected, but liquidity is deep and established — likely an older pool that predates lockers. Verify manually before trusting."
      : "Liquidity is NOT locked. The team can drain the pool — classic rug setup.");

  const sellTax = numStr(g.sell_tax);
  const sellPct = sellTax != null ? sellTax * 100 : null;
  const buyTax = numStr(g.buy_tax);
  const buyPct = buyTax != null ? buyTax * 100 : null;
  const taxLabel = sellPct == null && buyPct == null ? "—" : `${(buyPct ?? 0).toFixed(0)}% buy / ${(sellPct ?? 0).toFixed(0)}% sell`;
  const worstTax = Math.max(sellPct ?? 0, buyPct ?? 0);
  add("sell_tax", "Trading tax", sellPct == null && buyPct == null ? "unknown" : worstTax === 0 ? "pass" : worstTax <= 10 ? "warn" : "fail",
    taxLabel,
    sellPct == null && buyPct == null ? "Tax data unavailable." : worstTax === 0 ? "No buy or sell tax." : worstTax > 10 ? `Up to ${worstTax.toFixed(0)}% tax bleeds you on every trade.` : `Modest ${worstTax.toFixed(0)}% tax — make sure it isn't adjustable.`);

  // Modifiable tax — owner can crank tax to 100% and trap you (soft honeypot).
  const taxModifiable = g.slippage_modifiable === "1" || g.personal_slippage_modifiable === "1";
  add("modifiable_tax", "Tax adjustable", g.slippage_modifiable == null ? "unknown" : taxModifiable ? "fail" : "pass",
    g.slippage_modifiable == null ? "—" : taxModifiable ? "YES" : "NO",
    g.slippage_modifiable == null ? "—" : taxModifiable ? "The owner can raise the tax to 100% at any time — a honeypot waiting to spring." : "Tax is fixed in the contract — can't be cranked up later.");

  add("mintable", "Mintable supply", g.is_mintable == null ? "unknown" : g.is_mintable === "1" ? "fail" : "pass",
    g.is_mintable == null ? "—" : g.is_mintable === "1" ? "YES" : "NO",
    g.is_mintable == null ? "—" : g.is_mintable === "1" ? "The contract can mint new supply and dilute you." : "Supply can't be inflated.");

  const renounced = RENOUNCED(g.owner_address);
  const dangerousOwner = g.can_take_back_ownership === "1" || g.hidden_owner === "1";
  add("ownership", "Ownership", g.owner_address == null ? "unknown" : dangerousOwner ? "fail" : renounced ? "pass" : "warn",
    g.owner_address == null ? "—" : renounced ? "RENOUNCED" : dangerousOwner ? "HIDDEN/REVERSIBLE" : "ACTIVE",
    g.owner_address == null ? "—" : renounced ? "Owner renounced — no privileged control left." : dangerousOwner ? "Hidden or reclaimable ownership. The team can seize control. Avoid." : "Owner still has control. Watch for privileged functions.");

  add("pausable", "Trading pausable", g.transfer_pausable == null ? "unknown" : g.transfer_pausable === "1" ? "fail" : "pass",
    g.transfer_pausable == null ? "—" : g.transfer_pausable === "1" ? "YES" : "NO",
    g.transfer_pausable == null ? "—" : g.transfer_pausable === "1" ? "The team can pause all transfers — freezing you out." : "Transfers can't be paused.");

  // Blacklist / whitelist — owner can block specific wallets from selling.
  const canBlock = g.is_blacklisted === "1" || g.is_whitelisted === "1";
  add("blacklist", "Wallet blocking", g.is_blacklisted == null && g.is_whitelisted == null ? "unknown" : canBlock ? "warn" : "pass",
    g.is_blacklisted == null && g.is_whitelisted == null ? "—" : canBlock ? "POSSIBLE" : "NONE",
    g.is_blacklisted == null && g.is_whitelisted == null ? "—" : canBlock ? "The contract can blacklist/whitelist wallets — yours could be blocked from selling." : "No blacklist/whitelist controls found.");

  const liq = market.liquidityUsd;
  const vol = market.volume24h;
  const fabricated = liq != null && liq > 50000 && vol != null && vol / liq < 0.0005;
  add("liquidity", "Liquidity", liq == null ? "unknown" : fabricated ? "fail" : liq >= 20000 ? "pass" : liq >= 5000 ? "warn" : "fail",
    liq == null ? "—" : fabricated ? `$${Math.round(liq).toLocaleString("en-US")} (suspect)` : `$${Math.round(liq).toLocaleString("en-US")}`,
    liq == null ? "No DEX pair found." : fabricated ? "Huge liquidity but almost no trading — likely fabricated or a locked vault, not depth you can exit into." : liq < 5000 ? "Very thin liquidity — you may not be able to exit." : liq < 20000 ? "Shallow liquidity, rough slippage." : "Healthy liquidity.");

  add("open_source", "Verified contract", g.is_open_source == null ? "unknown" : g.is_open_source === "1" ? "pass" : "fail",
    g.is_open_source == null ? "—" : g.is_open_source === "1" ? "YES" : "NO",
    g.is_open_source == null ? "—" : g.is_open_source === "1" ? "Source is verified — auditable." : "Unverified contract. You can't see what it does. High risk.");

  // Named risks for extra context (mirrors RugCheck's risks[] on Solana).
  const risks: ScanResult["risks"] = [];
  if (g.is_proxy === "1") risks.push({ name: "Proxy contract — logic can be swapped", level: "warn" });
  if (g.selfdestruct === "1") risks.push({ name: "Contract can self-destruct", level: "danger" });
  if (g.owner_change_balance === "1") risks.push({ name: "Owner can edit balances", level: "danger" });
  if (g.trading_cooldown === "1") risks.push({ name: "Trading cooldown between sells", level: "warn" });
  if (g.is_anti_whale === "1" && g.anti_whale_modifiable === "1") risks.push({ name: "Adjustable max-tx (anti-whale)", level: "warn" });
  if (g.external_call === "1") risks.push({ name: "Makes external calls (extra trust surface)", level: "info" });

  // score & verdict (shared logic with Solana).
  const w: Record<string, number> = {
    honeypot: 26, ownership: 14, lp_lock: 14, mintable: 10, pausable: 10,
    modifiable_tax: 8, sell_tax: 6, liquidity: 8, blacklist: 4, open_source: 4,
  };
  const { score, possible, confidence } = scoreChecks(checks, w);
  const fatal = honeypot || dangerousOwner || g.owner_change_balance === "1" || g.selfdestruct === "1";
  const lpUnlocked = lpLockedPct != null && lpLockedPct < 50;
  let verdict: Verdict;
  if (possible === 0) verdict = "UNKNOWN";
  else if (fatal) verdict = "RUG-SHAPED";
  else if (lpUnlocked && taxModifiable) verdict = "RUG-SHAPED";
  else verdict = bandVerdict(score, possible);

  return {
    mint: address, name: market.name, symbol: market.symbol, isToken2022: false,
    chain, score, confidence, verdict, verified: false, bottomLine: bottomLineFor(verdict, checks, confidence), aiVerdict: "", checks, risks,
    meta: {
      priceUsd: market.priceUsd, priceChange24h: market.priceChange24h,
      marketCap: market.marketCap ?? (market.priceUsd != null && numStr(g.total_supply) ? market.priceUsd * (numStr(g.total_supply) as number) : null),
      liquidityUsd: market.liquidityUsd,
      volume24h: market.volume24h, ageDays: market.ageDays, supply: null,
      topHolderPct: null, top10Pct: null, rugcheckScore: null,
      holderCount: numStr(g.holder_count), lpLockedPct, mutableMetadata: null,
      insiderPct: null, insiderCount: null,
      deployer: g.creator_address || null, deployPlatform: null, deployerCreated: null, deployerDead: null,
    },
    scannedAt: 0,
  };
}
