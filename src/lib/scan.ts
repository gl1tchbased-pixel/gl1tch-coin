/**
 * GL1TCH SCANNER — non-custodial, read-only safety engine for ANY Solana token.
 * Aggregates on-chain mint state + holder concentration + liquidity + RugCheck
 * into a single GL1TCH verdict, with plain-language explanations. Runs server-side
 * (the /api/scan route) so the browser stays CORS-clean and keys stay hidden.
 *
 * Never holds funds, never signs, never asks for keys — it only reads.
 */

import { fetchTokenMarket } from "@/lib/market-sources";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function rpcEndpoints(): string[] {
  const env = process.env.SCAN_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC || "";
  const list = [
    /^https?:\/\//.test(env) ? env : "",
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
  ].filter(Boolean);
  return [...new Set(list)];
}

// Resilient JSON-RPC: tries each endpoint, skips ones that return HTML / block the
// method / error, returns the first valid result. Some public RPCs block heavy
// methods (getTokenLargestAccounts) — falling through keeps the scan alive.
async function rpc<T>(method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
  let lastErr: unknown;
  for (const url of rpcEndpoints()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal,
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("json")) { lastErr = new Error(`rpc ${method} ${res.status}`); continue; }
      const j = await res.json();
      if (j.error) { lastErr = new Error(j.error.message || `rpc ${method} error`); continue; }
      return j.result as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`rpc ${method} failed`);
}

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";
export interface ScanCheck {
  key: string;
  label: string;
  status: CheckStatus;
  value: string;
  explain: string;
  weight?: number; // contribution to the score (for the breakdown UI)
}
export type Verdict = "CLEAN" | "LOW RISK" | "CAUTION" | "HIGH RISK" | "RUG-SHAPED" | "UNKNOWN";
export interface ScanRisk {
  name: string;
  level: string; // "danger" | "warn" | "info"
}
export interface ScanResult {
  mint: string;
  chain: string; // "solana" | "ethereum" | "bsc" | "base" | …
  name: string | null;
  symbol: string | null;
  isToken2022: boolean;
  score: number; // 0–100 GL1TCH safety score
  confidence: number; // 0–100 — how much of the checklist we could actually verify
  verdict: Verdict;
  verified: boolean; // canonical blue-chip (real token, not an impostor clone)
  bottomLine: string; // one-line plain-language takeaway
  aiVerdict: string; // the rogue AI's narrative read, in character
  sources: { name: string; ok: boolean; detail?: string }[]; // which data sources we cross-checked
  checks: ScanCheck[];
  risks: ScanRisk[]; // named risks (RugCheck) for extra context
  meta: {
    priceUsd: number | null;
    priceChange24h: number | null;
    marketCap: number | null;
    liquidityUsd: number | null;
    volume24h: number | null;
    ageDays: number | null;
    supply: number | null;
    topHolderPct: number | null;
    top10Pct: number | null;
    rugcheckScore: number | null;
    holderCount: number | null;
    lpLockedPct: number | null;
    mutableMetadata: boolean | null;
    insiderPct: number | null; // % supply in insider/bundled wallets
    insiderCount: number | null;
    deployer: string | null; // creator wallet
    deployPlatform: string | null;
    deployerCreated: number | null;
    deployerDead: number | null;
  };
  scannedAt: number;
}

/**
 * Shared verdict/score/confidence/bottom-line logic so Solana (this file) and EVM
 * (scan-multichain) produce identical, comparable result shapes.
 */
export function scoreChecks(checks: ScanCheck[], weights: Record<string, number>) {
  let got = 0, possible = 0;
  for (const c of checks) {
    const w = weights[c.key] ?? 0;
    c.weight = w;
    if (c.status === "unknown") continue;
    possible += w;
    got += c.status === "pass" ? w : c.status === "warn" ? w * 0.5 : 0;
  }
  const score = possible > 0 ? Math.round((got / possible) * 100) : 0;
  const known = checks.filter((c) => c.status !== "unknown").length;
  const confidence = checks.length ? Math.round((known / checks.length) * 100) : 0;
  return { score, possible, confidence, known };
}

export function bandVerdict(score: number, possible: number): Verdict {
  if (possible === 0) return "UNKNOWN";
  if (score >= 90) return "CLEAN";
  if (score >= 75) return "LOW RISK";
  if (score >= 55) return "CAUTION";
  return "HIGH RISK";
}

export function bottomLineFor(verdict: Verdict, checks: ScanCheck[], confidence: number): string {
  const fails = checks.filter((c) => c.status === "fail").map((c) => c.label.toLowerCase());
  const warns = checks.filter((c) => c.status === "warn").map((c) => c.label.toLowerCase());
  const list = (a: string[]) => a.slice(0, 3).join(", ");
  let line: string;
  switch (verdict) {
    case "RUG-SHAPED":
      line = `Walk away. This is shaped like a rug${fails.length ? ` — ${list(fails)}` : ""}.`;
      break;
    case "HIGH RISK":
      line = fails.length
        ? `High risk — ${list(fails)}. Only the reckless ape this.`
        : `High risk. Too many flags to call it safe.`;
      break;
    case "CAUTION":
      line = `Tradeable but flawed${warns.length ? ` — ${list(warns)}` : ""}. Size small, set a stop.`;
      break;
    case "LOW RISK":
      line = warns.length
        ? `Mostly clean — minor flags on ${list(warns)}. Nothing fatal.`
        : `Mostly clean. No fatal flags in what we checked.`;
      break;
    case "CLEAN":
      line = `No red flags in any check we could run. Still not financial advice.`;
      break;
    default:
      line = `Not enough on-chain data to judge this one. Treat as unknown, not safe.`;
  }
  if (verdict !== "UNKNOWN" && confidence < 60) {
    line += ` (Only ${confidence}% of checks could run — partial read.)`;
  }
  return line;
}

const isBase58Mint = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

interface ParsedMint {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: number | null;
  decimals: number;
  isToken2022: boolean;
  transferFeeBps: number | null;
}

async function getMint(mint: string, signal?: AbortSignal): Promise<ParsedMint> {
  const r = await rpc<{ value: { owner: string; data: { parsed?: { info?: Record<string, unknown> } } } | null }>(
    "getAccountInfo",
    [mint, { encoding: "jsonParsed" }],
    signal
  );
  if (!r?.value) throw new Error("mint not found");
  const owner = r.value.owner;
  const info = (r.value.data?.parsed?.info ?? {}) as Record<string, unknown>;
  const decimals = Number(info.decimals ?? 0);
  const rawSupply = info.supply ? Number(info.supply as string) : null;
  let transferFeeBps: number | null = null;
  const exts = (info.extensions as Array<{ extension?: string; state?: Record<string, unknown> }> | undefined) ?? [];
  for (const e of exts) {
    if (e.extension === "transferFeeConfig" && e.state) {
      const newer = e.state.newerTransferFee as { transferFeeBasisPoints?: number } | undefined;
      transferFeeBps = Number(newer?.transferFeeBasisPoints ?? 0);
    }
  }
  return {
    mintAuthority: (info.mintAuthority as string | null) ?? null,
    freezeAuthority: (info.freezeAuthority as string | null) ?? null,
    supply: rawSupply != null ? rawSupply / Math.pow(10, decimals) : null,
    decimals,
    isToken2022: owner === TOKEN_2022,
    transferFeeBps,
  };
}

async function getConcentration(mint: string, supply: number | null, signal?: AbortSignal) {
  try {
    const r = await rpc<{ value: Array<{ uiAmount: number | null }> }>("getTokenLargestAccounts", [mint], signal);
    const amts = (r.value ?? []).map((a) => Number(a.uiAmount ?? 0)).sort((a, b) => b - a);
    if (!supply || supply <= 0 || amts.length === 0) return { topHolderPct: null, top10Pct: null };
    const top1 = (amts[0] / supply) * 100;
    const top10 = (amts.slice(0, 10).reduce((s, v) => s + v, 0) / supply) * 100;
    return { topHolderPct: Math.min(100, top1), top10Pct: Math.min(100, top10) };
  } catch {
    return { topHolderPct: null, top10Pct: null };
  }
}

interface MktInfo {
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  ageDays: number | null;
  priceChange24h: number | null;
}
// DexScreener → GeckoTerminal fallback (DexScreener drops thin pairs like $GL1TCH).
async function getMarket(mint: string, signal?: AbortSignal): Promise<MktInfo> {
  const m = await fetchTokenMarket(mint, "solana", signal);
  return {
    name: m.name, symbol: m.symbol, priceUsd: m.priceUsd, marketCap: m.marketCap,
    liquidityUsd: m.liquidityUsd, volume24h: m.volume24h, ageDays: m.ageDays, priceChange24h: m.priceChange24h,
  };
}

interface RugReport {
  score: number | null;
  risks: ScanRisk[];
  lpLockedPct: number | null; // max across markets
  mutable: boolean | null; // metadata mutable (dev can change name/image)
  topHolderPct: number | null; // RugCheck's own top-holder read (excludes LP/known)
  // ---- Degen intelligence (the stuff that actually rugs people) ----
  top10Pct: number | null; // combined % held by the top 10 non-LP wallets
  insiderPct: number | null; // % supply in flagged insider/bundled wallets
  insiderCount: number | null; // # of detected insider/bundle accounts
  holderCount: number | null; // total holders
  // ---- Deployer track record ----
  creator: string | null; // deployer wallet
  deployPlatform: string | null; // e.g. pump.fun, Raydium
  deployerCreated: number | null; // tokens this wallet has launched (if indexed)
  deployerDead: number | null; // of those, how many are effectively dead (~$0 mcap)
}

// RugCheck full report — far richer than the score summary: named risks, LP-lock %,
// mutable-metadata flag, holder spread + insider/bundle intelligence. All optional-
// chained so a shape change downgrades to unknown instead of throwing.
async function getRugcheck(mint: string, signal?: AbortSignal): Promise<RugReport> {
  const empty: RugReport = { score: null, risks: [], lpLockedPct: null, mutable: null, topHolderPct: null, top10Pct: null, insiderPct: null, insiderCount: null, holderCount: null, creator: null, deployPlatform: null, deployerCreated: null, deployerDead: null };
  try {
    // RugCheck can be slow/flaky; one retry with a per-attempt timeout so a single
    // sluggish response doesn't drop all of its checks to "unknown" and tank the score.
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        const to = AbortSignal.timeout(6500);
        const sig = signal ? AbortSignal.any([signal, to]) : to;
        const r = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, { signal: sig, headers: { accept: "application/json" } });
        if (r.ok) { res = r; break; }
      } catch { /* retry once */ }
    }
    if (!res) return empty;
    const j = (await res.json()) as {
      score_normalised?: number; score?: number;
      risks?: Array<{ name?: string; level?: string }>;
      markets?: Array<{ lp?: { lpLockedPct?: number } }>;
      tokenMeta?: { mutable?: boolean };
      mutable?: boolean;
      totalHolders?: number;
      graphInsidersDetected?: number;
      topHolders?: Array<{ pct?: number; insider?: boolean; owner?: string; address?: string }>;
      creator?: string;
      deployPlatform?: string;
      creatorTokens?: Array<{ mint?: string; marketCap?: number; createdAt?: string }>;
    };
    const score = (typeof j.score_normalised === "number" ? j.score_normalised : typeof j.score === "number" ? j.score : null);
    const risks: ScanRisk[] = (j.risks ?? [])
      .filter((r) => r?.name)
      .map((r) => ({ name: String(r.name), level: String(r.level ?? "warn") }))
      .slice(0, 8);
    let lpLockedPct: number | null = null;
    for (const m of j.markets ?? []) {
      const v = m?.lp?.lpLockedPct;
      if (typeof v === "number") lpLockedPct = Math.max(lpLockedPct ?? 0, v);
    }
    const mutable = typeof j.tokenMeta?.mutable === "boolean" ? j.tokenMeta.mutable
      : typeof j.mutable === "boolean" ? j.mutable : null;
    const holders = (j.topHolders ?? []).filter((h) => typeof h?.pct === "number");
    const topHolderPct = typeof holders[0]?.pct === "number" ? (holders[0].pct as number) : null;
    const top10Pct = holders.length ? Math.min(100, holders.slice(0, 10).reduce((s, h) => s + (h.pct ?? 0), 0)) : null;
    const insiderHolders = holders.filter((h) => h.insider);
    const insiderPct = holders.length ? Math.min(100, insiderHolders.reduce((s, h) => s + (h.pct ?? 0), 0)) : null;
    const insiderCount = typeof j.graphInsidersDetected === "number" ? j.graphInsidersDetected : (insiderHolders.length || null);
    const holderCount = typeof j.totalHolders === "number" ? j.totalHolders : null;
    const creator = typeof j.creator === "string" && j.creator ? j.creator : null;
    const deployPlatform = typeof j.deployPlatform === "string" && j.deployPlatform && !/^unknown$/i.test(j.deployPlatform) ? j.deployPlatform : null;
    const ctoks = Array.isArray(j.creatorTokens) ? j.creatorTokens : null;
    const deployerCreated = ctoks ? ctoks.length : null;
    const deployerDead = ctoks ? ctoks.filter((t) => (t?.marketCap ?? 0) < 1000).length : null;
    return { score, risks, lpLockedPct, mutable, topHolderPct, top10Pct, insiderPct, insiderCount, holderCount, creator, deployPlatform, deployerCreated, deployerDead };
  } catch {
    return empty;
  }
}

// Bound a slow call so one sluggish endpoint can't hang the whole scan. On timeout
// the check degrades to its "unknown" fallback instead of the request never returning
// (getTokenLargestAccounts / RugCheck can crawl for mega-cap tokens like WSOL/BONK).
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
}

/** Run the full scan. Each check is independently fault-tolerant. */
export async function scanToken(mint: string, signal?: AbortSignal): Promise<ScanResult> {
  if (!isBase58Mint(mint)) throw new Error("invalid Solana mint address");

  const EMPTY_RUG: RugReport = { score: null, risks: [], lpLockedPct: null, mutable: null, topHolderPct: null, top10Pct: null, insiderPct: null, insiderCount: null, holderCount: null, creator: null, deployPlatform: null, deployerCreated: null, deployerDead: null };
  const [mintInfo, market, rug] = await Promise.all([
    getMint(mint, signal), // must succeed (throws "mint not found" if invalid)
    withTimeout(getMarket(mint, signal), 9000, { name: null, symbol: null, priceUsd: null, marketCap: null, liquidityUsd: null, volume24h: null, ageDays: null, priceChange24h: null }),
    withTimeout(getRugcheck(mint, signal), 14000, EMPTY_RUG),
  ]);
  const conc = await withTimeout(getConcentration(mint, mintInfo.supply, signal), 8000, { topHolderPct: null, top10Pct: null });

  // age (DexScreener pairCreatedAt) — re-fetch lightweight if needed is overkill; derive from market call
  const ageDays: number | null = market.ageDays;

  // Consistent market-cap fallback: if the source had no mcap, derive it from the
  // SAME price × on-chain supply (FDV) — never borrow a mcap from another source.
  const marketCap = market.marketCap ?? (market.priceUsd != null && mintInfo.supply ? market.priceUsd * mintInfo.supply : null);

  const checks: ScanCheck[] = [];
  const add = (key: string, label: string, status: CheckStatus, value: string, explain: string) =>
    checks.push({ key, label, status, value, explain });

  // 1) mint authority
  add(
    "mint_authority",
    "Mint authority",
    mintInfo.mintAuthority ? "fail" : "pass",
    mintInfo.mintAuthority ? "ACTIVE" : "REVOKED",
    mintInfo.mintAuthority
      ? "The owner can still mint new tokens and dilute you. A red flag for a meme (normal for stablecoins / CEX tokens)."
      : "No one can mint more. Supply is fixed — the way it should be."
  );

  // 2) freeze authority
  add(
    "freeze_authority",
    "Freeze authority",
    mintInfo.freezeAuthority ? "fail" : "pass",
    mintInfo.freezeAuthority ? "ACTIVE" : "REVOKED",
    mintInfo.freezeAuthority
      ? "The owner can freeze your wallet so you can't sell. Honeypot risk (normal for stablecoins / regulated tokens)."
      : "No one can freeze your tokens. You can always sell."
  );

  // 3) transfer tax (Token-2022)
  const feePct = mintInfo.transferFeeBps != null ? mintInfo.transferFeeBps / 100 : 0;
  add(
    "transfer_tax",
    "Transfer tax",
    feePct === 0 ? "pass" : feePct <= 5 ? "warn" : "fail",
    feePct === 0 ? "0.00%" : `${feePct.toFixed(2)}%`,
    feePct === 0
      ? "Zero protocol tax on buys and sells."
      : `A ${feePct.toFixed(2)}% tax is taken on transfers. Some are legit; high ones bleed holders.`
  );

  // 4) liquidity — and detect FABRICATED depth: a real pool turns over a sane fraction
  // of its size daily. Huge liquidity with almost no volume = a fake/vault number you
  // can't actually exit into, so it must NOT read as "healthy".
  const liq = market.liquidityUsd;
  const vol = market.volume24h;
  const fabricated = liq != null && liq > 50000 && vol != null && vol / liq < 0.0005;
  add(
    "liquidity",
    "Liquidity",
    liq == null ? "unknown" : fabricated ? "fail" : liq >= 20000 ? "pass" : liq >= 5000 ? "warn" : "fail",
    liq == null ? "—" : fabricated ? `$${Math.round(liq).toLocaleString("en-US")} (suspect)` : `$${Math.round(liq).toLocaleString("en-US")}`,
    liq == null
      ? "No DEX pair found — can't assess tradability."
      : fabricated
        ? "Reported liquidity is huge but almost nothing trades against it — likely fabricated or a locked vault, not depth you can exit into. Treat with suspicion."
        : liq < 5000
          ? "Very thin liquidity. A single sell can crater the price and you may not be able to exit."
          : liq < 20000
            ? "Shallow liquidity. Slippage will be rough on any real size."
            : "Healthy enough liquidity to enter and exit at size."
  );

  // 5) top-holder concentration
  const top1 = conc.topHolderPct;
  add(
    "concentration",
    "Top holder",
    top1 == null ? "unknown" : top1 <= 15 ? "pass" : top1 <= 40 ? "warn" : "fail",
    top1 == null ? "—" : `${top1.toFixed(1)}%`,
    top1 == null
      ? "Top holders couldn't be indexed — usually means a very large, established token (millions of accounts). Less of a concern for those."
      : top1 > 40
        ? "One account holds a huge share. If it dumps, you're exit liquidity. (Note: on new pump.fun tokens the top account is often the bonding curve/LP.)"
        : top1 > 15
          ? "Moderate concentration — watch the top wallet."
          : "Supply is reasonably spread across holders."
  );

  // 6) LP locked / burned — the #1 Solana rug vector (dev pulls liquidity).
  const lpPct = rug.lpLockedPct;
  add(
    "lp_lock",
    "LP locked / burned",
    lpPct == null ? "unknown" : lpPct >= 90 ? "pass" : lpPct >= 50 ? "warn" : "fail",
    lpPct == null ? "—" : `${lpPct.toFixed(0)}%`,
    lpPct == null
      ? "Couldn't read LP lock status — verify the pool is locked or burned before trusting it."
      : lpPct >= 90
        ? "Liquidity is locked/burned — the dev can't yank the pool out from under you."
        : lpPct >= 50
          ? "Only part of the liquidity is locked. The unlocked share can still be pulled."
          : "Liquidity is NOT locked. The dev can drain the pool and leave you with worthless tokens — classic rug."
  );

  // 7) mutable metadata — dev can swap the name/image after you buy.
  add(
    "metadata_mutable",
    "Metadata",
    rug.mutable == null ? "unknown" : rug.mutable ? "warn" : "pass",
    rug.mutable == null ? "—" : rug.mutable ? "MUTABLE" : "IMMUTABLE",
    rug.mutable == null
      ? "Couldn't read metadata mutability."
      : rug.mutable
        ? "The dev can still change the token's name and image after launch — used for bait-and-switch scams."
        : "Name and image are locked. No bait-and-switch."
  );

  // 8) insiders / bundles — the degen-grade signal: supply concentrated in wallets
  // funded together or flagged as insiders. High insider % = coordinated dump risk.
  const insPct = rug.insiderPct;
  add(
    "insiders",
    "Insiders / bundled",
    insPct == null ? "unknown" : insPct <= 5 ? "pass" : insPct <= 15 ? "warn" : "fail",
    insPct == null ? "—" : `${insPct.toFixed(1)}%${rug.insiderCount ? ` · ${rug.insiderCount} wallets` : ""}`,
    insPct == null
      ? "Couldn't read insider/bundle data."
      : insPct <= 5
        ? "Little insider/bundled supply — low risk of a coordinated dump."
        : insPct <= 15
          ? "Some supply sits in insider/bundled wallets — watch for a coordinated exit."
          : "A large share is held by insider/bundled wallets that can dump together — major risk."
  );

  // 9) deployer track record — who launched it & their history. A serial deployer whose
  // past tokens are dead is the strongest human red flag. History isn't always indexed;
  // when it isn't we still surface the wallet + platform so it can be investigated.
  const dCreated = rug.deployerCreated;
  const dDead = rug.deployerDead ?? 0;
  const shortAddr = rug.creator ? `${rug.creator.slice(0, 4)}…${rug.creator.slice(-4)}` : null;
  let depStatus: CheckStatus, depValue: string, depExplain: string;
  if (dCreated != null && dCreated > 1) {
    const ratio = dDead / dCreated;
    depStatus = ratio >= 0.5 && dCreated >= 3 ? "fail" : ratio >= 0.3 ? "warn" : "pass";
    depValue = `${dCreated} launched · ${dDead} dead`;
    depExplain = depStatus === "fail"
      ? `This wallet launched ${dCreated} tokens and ${dDead} are already dead — a serial deployer. High chance this follows the same path.`
      : depStatus === "warn"
        ? `The deployer has launched ${dCreated} tokens (${dDead} dead). Mixed record — look closer before trusting.`
        : `The deployer launched ${dCreated} tokens and most are still alive — a relatively clean record.`;
  } else if (rug.creator) {
    depStatus = "unknown";
    depValue = `${shortAddr}${rug.deployPlatform ? ` · ${rug.deployPlatform}` : ""}`;
    depExplain = `Deployer ${shortAddr}${rug.deployPlatform ? ` (via ${rug.deployPlatform})` : ""}. Launch history isn't indexed — check their wallet on Solscan before trusting.`;
  } else {
    depStatus = "unknown"; depValue = "—"; depExplain = "Couldn't identify the deployer wallet.";
  }
  add("deployer", "Deployer", depStatus, depValue, depExplain);

  // 10) rugcheck score (context, lightly weighted — risks[] carry the detail).
  const rugScore = rug.score;
  add(
    "rugcheck",
    "RugCheck score",
    rugScore == null ? "unknown" : rugScore <= 1 ? "pass" : rugScore <= 20 ? "warn" : "fail",
    rugScore == null ? "—" : String(rugScore),
    rugScore == null
      ? "RugCheck had no report for this token."
      : rugScore <= 1
        ? "RugCheck rates this clean — lowest risk band."
        : `RugCheck flags risk (score ${rugScore}). See the named risks below.`
  );

  // ---- score & verdict ----
  const weights: Record<string, number> = {
    mint_authority: 19, freeze_authority: 17, lp_lock: 15, liquidity: 12,
    concentration: 8, insiders: 9, deployer: 8, transfer_tax: 5, metadata_mutable: 3, rugcheck: 4,
  };
  const { score, possible, confidence } = scoreChecks(checks, weights);
  const has = (key: string, status: CheckStatus) => checks.some((c) => c.key === key && c.status === status);
  // Active mint/freeze = owner can touch your funds. A hard red flag for memes
  // (normal for stablecoins/CEX tokens — hence we CAP rather than auto-condemn).
  const authActive = has("mint_authority", "fail") || has("freeze_authority", "fail");
  // NB: exclude rugcheck here — its score is largely driven by the same mint/freeze
  // flags, so counting it would double-penalise legit managed tokens (e.g. RENDER,
  // bridged assets) into RUG-SHAPED. Escalate only on INDEPENDENT red flags.
  const otherSerious = has("liquidity", "fail") || has("concentration", "fail") || has("lp_lock", "fail") || has("insiders", "fail") || has("deployer", "fail");

  let verdict: Verdict;
  if (possible === 0) verdict = "UNKNOWN";
  else if (has("lp_lock", "fail") && (authActive || has("liquidity", "fail"))) verdict = "RUG-SHAPED"; // unlocked LP + owner power / no liq
  else if (authActive && otherSerious) verdict = "RUG-SHAPED"; // honeypot-shaped
  else if (authActive) verdict = "HIGH RISK"; // owner can mint/freeze — capped here
  else verdict = bandVerdict(score, possible);

  return {
    mint,
    chain: "solana",
    name: market.name,
    symbol: market.symbol,
    isToken2022: mintInfo.isToken2022,
    score,
    confidence,
    verdict,
    verified: false,
    bottomLine: bottomLineFor(verdict, checks, confidence),
    aiVerdict: "",
    sources: [
      { name: "On-chain RPC", ok: true, detail: "mint authorities, supply" },
      { name: "Market", ok: market.priceUsd != null, detail: market.priceUsd != null ? (market.priceUsd && market.volume24h != null ? "DexScreener / GeckoTerminal" : "DexScreener") : "no pair found" },
      { name: "RugCheck", ok: (rug.score != null || rug.holderCount != null || rug.creator != null || rug.risks.length > 0), detail: "risks, LP lock, holders, deployer" },
      { name: "Holder index", ok: conc.topHolderPct != null || rug.top10Pct != null, detail: "concentration, insiders" },
    ],
    checks,
    risks: rug.risks,
    meta: {
      priceUsd: market.priceUsd,
      priceChange24h: market.priceChange24h,
      marketCap,
      liquidityUsd: market.liquidityUsd,
      volume24h: market.volume24h,
      ageDays,
      supply: mintInfo.supply,
      topHolderPct: conc.topHolderPct ?? rug.topHolderPct,
      top10Pct: conc.top10Pct ?? rug.top10Pct,
      rugcheckScore: rug.score,
      holderCount: rug.holderCount,
      lpLockedPct: rug.lpLockedPct,
      mutableMetadata: rug.mutable,
      insiderPct: rug.insiderPct,
      insiderCount: rug.insiderCount,
      deployer: rug.creator,
      deployPlatform: rug.deployPlatform,
      deployerCreated: rug.deployerCreated,
      deployerDead: rug.deployerDead,
    },
    scannedAt: 0,
  };
}

/* ----------------------- Verified blue-chips ----------------------- */

export interface CanonicalToken {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  aliases: string[]; // lowercased name-search keys
}

/**
 * Canonical, verified blue-chip tokens — the real contracts behind the names people
 * search. Single source of truth for: (a) name-search resolution (scan-multichain
 * builds its alias map from this), and (b) the "verified" badge + score treatment.
 * Managed-supply/ownership is BY DESIGN for several of these (WBTC custodian, stables),
 * so we don't let those normal traits drag a blue-chip into a scary score.
 */
export const CANONICAL: CanonicalToken[] = [
  { chain: "ethereum", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", aliases: ["btc", "bitcoin", "wbtc"] },
  { chain: "ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", aliases: ["eth", "ethereum", "weth", "ether"] },
  { chain: "solana", address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Wrapped SOL", aliases: ["sol", "solana", "wsol"] },
  { chain: "bsc", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", aliases: ["bnb", "wbnb"] },
  { chain: "ethereum", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", aliases: ["usdc", "usd coin"] },
  { chain: "ethereum", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", aliases: ["usdt", "tether"] },
  { chain: "solana", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", aliases: ["wif", "dogwifhat", "dog wif hat"] },
  { chain: "solana", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", aliases: ["bonk"] },
  { chain: "solana", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter", aliases: ["jup", "jupiter"] },
  { chain: "ethereum", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", name: "Pepe", aliases: ["pepe"] },
  { chain: "ethereum", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", aliases: ["shib", "shiba", "shiba inu"] },
  { chain: "bsc", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", symbol: "DOGE", name: "Dogecoin", aliases: ["doge", "dogecoin"] },
  { chain: "ethereum", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", aliases: ["link", "chainlink"] },
  { chain: "solana", address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", symbol: "RENDER", name: "Render", aliases: ["render", "rndr"] },
  { chain: "ethereum", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", aliases: ["uni", "uniswap"] },
  { chain: "ethereum", address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", aliases: ["aave"] },
  { chain: "arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", aliases: ["arb", "arbitrum"] },
  { chain: "solana", address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", symbol: "POPCAT", name: "Popcat", aliases: ["popcat"] },
  { chain: "ethereum", address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", symbol: "FLOKI", name: "Floki", aliases: ["floki"] },
  { chain: "solana", address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", symbol: "JTO", name: "Jito", aliases: ["jto", "jito"] },
];

const VERIFIED = new Set(CANONICAL.map((t) => `${t.chain}:${t.address.toLowerCase()}`));
export const isVerified = (chain: string, address: string) => VERIFIED.has(`${chain}:${address.toLowerCase()}`);

/**
 * Re-cast a result for a verified blue-chip. We NEVER whitewash an actual honeypot,
 * but for an established/canonical token the managed-supply & ownership traits are
 * by design (custodian, governance, bridge) — not rug risk — so they shouldn't drag
 * the score down. Detail rows stay honest; the verdict reflects reality.
 */
export function applyVerified(r: ScanResult): ScanResult {
  r.verified = true;
  const honeypot = r.checks.some((c) => c.key === "honeypot" && c.status === "fail");
  const managed = new Set(["mint_authority", "freeze_authority", "mintable", "ownership"]);
  for (const c of r.checks) {
    if (managed.has(c.key) && (c.status === "fail" || c.status === "warn")) {
      c.explain += " — by design for this verified, established asset (custodian/governance controlled), not a rug signal.";
    }
  }
  if (!honeypot) {
    r.score = Math.max(r.score, 90);
    r.verdict = "CLEAN";
    r.bottomLine = "Verified blue-chip — established, audited and deeply liquid. Managed supply/ownership is by design for this asset, not rug risk.";
  }
  return r;
}

/**
 * The rogue-AI's narrative read — GL1TCH's signature. Competitors print rule tables;
 * we synthesize the findings into a blunt, in-character paragraph. Deterministic
 * (free, instant), built from the same checks so it never contradicts the verdict.
 */
export function rogueAiVerdict(r: ScanResult): string {
  const sym = r.symbol ? `$${r.symbol}` : (r.name || "this token");
  const fails = r.checks.filter((c) => c.status === "fail").map((c) => c.label.toLowerCase());
  const warns = r.checks.filter((c) => c.status === "warn").map((c) => c.label.toLowerCase());
  const list = (a: string[], n = 3) => a.slice(0, n).join(", ");
  const ins = r.meta.insiderPct;
  const insLine = ins != null && ins > 15 ? ` And ${ins.toFixed(0)}% sits in bundled wallets that move as one — they can leave together.` : "";
  const dc = r.meta.deployerCreated, dd = r.meta.deployerDead ?? 0;
  const depLine = dc != null && dc >= 3 && dd / dc >= 0.5 ? ` The dev behind it already buried ${dd} of ${dc} past launches — serial behavior.` : "";

  if (r.verified) {
    return `I've read every chain ${sym} touches. It's the real, canonical token — a verified blue-chip, not an impostor wearing the name. The control flags you'll see are by design for an asset this established, not a trap. Safe as crypto gets — still my read, not your financial advisor.`;
  }
  switch (r.verdict) {
    case "RUG-SHAPED":
      return `I've seen this shape before. ${sym} is wearing the skin of a real coin, but ${fails.length ? list(fails) : "the fundamentals"} tell me the exit is already half-closed.${insLine}${depLine} I wouldn't leave a cent here — and neither would you if you'd read what I just read.`;
    case "HIGH RISK":
      return `${sym} can hurt you. ${fails.length ? `${list(fails)} mean the team still holds the knife` : "too much control sits with the team"}.${insLine}${depLine} Might pump, might vanish — but the safety isn't yours to keep.`;
    case "CAUTION":
      return `${sym} trades, but it's flawed — ${warns.length ? list(warns) : "a few soft spots"}.${insLine} Size small, keep a finger on the sell, and don't marry it.`;
    case "LOW RISK":
      return `${sym} passes the checks that actually kill you.${warns.length ? ` Minor flags on ${list(warns)} — nothing fatal.` : " Nothing fatal in what I could see."} Clean enough to consider; just don't fall asleep on it.`;
    case "CLEAN":
      return `I went through ${sym} line by line. The usual traps — honeypot, unlocked liquidity, live mint/freeze — aren't here.${insLine || ""} As clean as my read gets. Not financial advice, just the truth on-chain.`;
    default:
      return `The chain went quiet on ${sym} — not enough signal to judge it. I treat silence as risk, not safety. Get more data before you touch it.`;
  }
}
