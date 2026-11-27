import { CANARY_TOKEN, CHAIN_IDS, CHAIN_LABEL, DEPTHS, ENDPOINTS, LOG_SPANS, type DepthId, type Endpoint, type EvmTruthChain, type TruthChain } from "./registry.js";
import { TRANSIENT, classifyError, fingerprintOf, gradeEndpoint, judgeProbe, median, type CallOutcome, type ErrorClass, type Grade, type ProbeJudgement, type Verdict } from "./judge.js";

/**
 * RPC Truth Monitor — one measurement pass. Every endpoint of a chain gets the same questions (same block
 * windows, same slots, same signatures), then judge.ts decides who told the truth. Read-only JSON-RPC only.
 */

export type RawResult = { ok: true; result: unknown; ms: number } | { ok: false; error: string; timeout: boolean; ms: number };
export type RpcCaller = (url: string, method: string, params: unknown[], timeoutMs: number) => Promise<RawResult>;

const UA = "gl1tch-rpc-truth/1 (+https://gl1tchbased.xyz/rpc-truth)";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
/** A sender that almost never moves USDC, so range tests are about block span, not result size. */
const RARE_SENDER = "0x000000000000000000000000000000000000000000000000000000000000dead";
const TIMEOUT_MS = 12_000;
const SOLANA_SLOT_SEC = 0.4;
const WINDOW_BLOCKS = 8;

export const fetchCaller: RpcCaller = async (url, method, params, timeoutMs) => {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await r.text();
    let j: { result?: unknown; error?: { message?: string; code?: number } } | null = null;
    try {
      j = JSON.parse(text);
    } catch {
      return { ok: false, error: `http ${r.status} ${text.slice(0, 80).replace(/\s+/g, " ")}`, timeout: false, ms: Date.now() - t0 };
    }
    if (j?.error) return { ok: false, error: String(j.error.message ?? JSON.stringify(j.error)), timeout: false, ms: Date.now() - t0 };
    if (!r.ok) return { ok: false, error: `http ${r.status}`, timeout: false, ms: Date.now() - t0 };
    return { ok: true, result: j?.result ?? null, ms: Date.now() - t0 };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const timeout = /abort|timeout/i.test(msg) || (e as Error).name === "TimeoutError";
    return { ok: false, error: timeout ? "timeout" : msg.slice(0, 120), timeout, ms: Date.now() - t0 };
  }
};

/**
 * Be a polite client: one request at a time per URL with a gap between them, and one retry after a pause when
 * an endpoint says it is rate-limited. Public endpoints are shared infrastructure; ~15 requests per endpoint
 * every 6 hours is all this monitor ever sends.
 */
export function politeCaller(call: RpcCaller, opts: { gapMs?: number; retryMs?: number; sleep?: (ms: number) => Promise<void> } = {}): RpcCaller {
  const gap = opts.gapMs ?? 1_000;
  const retry = opts.retryMs ?? 5_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const chains = new Map<string, Promise<unknown>>();
  return (url, method, params, timeoutMs) => {
    const prev = chains.get(url) ?? Promise.resolve();
    const run = prev.then(async () => {
      let r = await call(url, method, params, timeoutMs);
      if (!r.ok && !r.timeout && classifyError(r.error) === "rate_limited") {
        await sleep(retry);
        r = await call(url, method, params, timeoutMs);
      }
      await sleep(gap);
      return r;
    });
    chains.set(url, run.catch(() => undefined));
    return run;
  };
}

/* ------------------------------ report types ------------------------------ */

export interface ProbeInfo {
  id: string;
  depth: DepthId;
  method: string;
  /** Human description of the exact question asked. */
  question: string;
  exists: boolean;
  reference: ProbeJudgement["reference"];
}

export interface EndpointReport {
  id: string;
  chain: TruthChain;
  provider: string;
  url: string;
  grade: Grade;
  reach: DepthId | null;
  silentCount: number;
  headOk: boolean;
  head: number | null;
  headLagSec: number | null;
  latencyMs: number | null;
  /** EVM only: widest eth_getLogs block span that worked (null = even the smallest failed). */
  maxLogSpan?: number | null;
  logSpanLimit?: ErrorClass | "timeout" | null;
  headError?: string;
  probes: Record<string, { verdict: Verdict; size?: number; errorClass?: ErrorClass; message?: string; ms: number }>;
}

export interface ChainReport {
  chain: TruthChain;
  label: string;
  referenceHead: number | null;
  blockTimeSec: number | null;
  probes: ProbeInfo[];
  endpoints: EndpointReport[];
  note?: string;
}

export interface TruthSnapshot {
  version: 1;
  startedAt: number;
  finishedAt: number;
  chains: ChainReport[];
}

/* ------------------------------ helpers ------------------------------ */

function toOutcome(r: RawResult, parse: (result: unknown) => Promise<{ ids: string[] } | null | "invalid">): Promise<CallOutcome> {
  if (!r.ok) {
    if (r.timeout) return Promise.resolve({ kind: "timeout", ms: r.ms });
    return Promise.resolve({ kind: "error", errorClass: classifyError(r.error), message: r.error, ms: r.ms });
  }
  return parse(r.result).then(async (p) => {
    if (p === "invalid") return { kind: "error", errorClass: "other", message: "malformed response", ms: r.ms } as CallOutcome;
    if (!p || !p.ids.length) return { kind: "empty", ms: r.ms } as CallOutcome;
    return { kind: "data", fingerprint: await fingerprintOf(p.ids), size: p.ids.length, ms: r.ms } as CallOutcome;
  });
}

const hex = (n: number) => "0x" + n.toString(16);

async function sequential<T>(items: T[], fn: (x: T) => Promise<void>): Promise<void> {
  for (const x of items) await fn(x);
}

/* ------------------------------ EVM ------------------------------ */

export async function runEvmChain(chain: EvmTruthChain, endpoints: Endpoint[], call: RpcCaller): Promise<ChainReport> {
  const canary = CANARY_TOKEN[chain];
  const heads = new Map<string, { head: number | null; ok: boolean; error?: string; ms: number[] }>();

  await Promise.all(
    endpoints.map(async (ep) => {
      const ms: number[] = [];
      const cid = await call(ep.url, "eth_chainId", [], TIMEOUT_MS);
      if (cid.ok) ms.push(cid.ms);
      if (!cid.ok || parseInt(String(cid.result), 16) !== CHAIN_IDS[chain]) {
        heads.set(ep.id, { head: null, ok: false, error: cid.ok ? `wrong chain ${String(cid.result)}` : cid.error, ms });
        return;
      }
      const bn = await call(ep.url, "eth_blockNumber", [], TIMEOUT_MS);
      if (bn.ok) ms.push(bn.ms);
      const head = bn.ok ? parseInt(String(bn.result), 16) : NaN;
      heads.set(ep.id, Number.isFinite(head) ? { head, ok: true, ms } : { head: null, ok: false, error: bn.ok ? "bad block number" : bn.error, ms });
    })
  );

  const live = endpoints.filter((ep) => heads.get(ep.id)?.ok);
  const maxHead = Math.max(...live.map((ep) => heads.get(ep.id)!.head!), 0);
  const report: ChainReport = { chain, label: CHAIN_LABEL[chain], referenceHead: maxHead || null, blockTimeSec: null, probes: [], endpoints: [] };
  if (!live.length) {
    report.note = "No endpoint answered; nothing could be measured.";
    report.endpoints = endpoints.map((ep) => emptyReport(ep, heads.get(ep.id)));
    return report;
  }

  // Block time from the chain itself (some chains changed block times; never hard-code it).
  let bt: number | null = null;
  for (const ep of live) {
    const a = await call(ep.url, "eth_getBlockByNumber", [hex(maxHead - 2), false], TIMEOUT_MS);
    const b = await call(ep.url, "eth_getBlockByNumber", [hex(maxHead - 1002), false], TIMEOUT_MS);
    const ta = a.ok ? parseInt(String((a.result as { timestamp?: string } | null)?.timestamp), 16) : NaN;
    const tb = b.ok ? parseInt(String((b.result as { timestamp?: string } | null)?.timestamp), 16) : NaN;
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta > tb) {
      bt = (ta - tb) / 1000;
      break;
    }
  }
  if (!bt) {
    report.note = "Could not read block times; history windows not measured.";
    report.endpoints = endpoints.map((ep) => emptyReport(ep, heads.get(ep.id)));
    return report;
  }
  report.blockTimeSec = +bt.toFixed(3);

  // Small 8-block windows (so even endpoints with tight range caps can answer the history question), anchored a
  // couple of minutes behind the freshest head. USDC moves in every few blocks on every chain measured here.
  const anchor = maxHead - Math.ceil(120 / bt);
  const len = WINDOW_BLOCKS;
  const windows = DEPTHS.map((d) => {
    // Never ask for blocks before genesis (only matters on very young chains or in tests).
    const from = Math.max(1, anchor - Math.round(d.seconds / bt!));
    return { depth: d.id, from, to: from + len - 1 };
  });

  const outcomes: Record<string, Record<string, { provider: string; outcome: CallOutcome }>> = {};
  const spans: Record<string, { max: number | null; limit: ErrorClass | "timeout" | null }> = {};
  const ms: Record<string, number[]> = Object.fromEntries(endpoints.map((ep) => [ep.id, [...(heads.get(ep.id)?.ms ?? [])]]));

  await Promise.all(
    live.map(async (ep) => {
      await sequential(windows, async (w) => {
        const r = await call(ep.url, "eth_getLogs", [{ address: canary, topics: [TRANSFER], fromBlock: hex(w.from), toBlock: hex(w.to) }], TIMEOUT_MS);
        if (r.ok) ms[ep.id].push(r.ms);
        const o = await toOutcome(r, async (res) => {
          if (!Array.isArray(res)) return "invalid";
          const ids: string[] = [];
          for (const l of res as { address?: string; blockNumber?: string; transactionHash?: string; logIndex?: string; topics?: string[] }[]) {
            const bn = parseInt(String(l.blockNumber), 16);
            if (String(l.address).toLowerCase() !== canary || !(bn >= w.from && bn <= w.to) || l.topics?.[0] !== TRANSFER) return "invalid";
            ids.push(`${l.transactionHash}:${parseInt(String(l.logIndex), 16)}`);
          }
          return { ids };
        });
        ((outcomes[`logs-${w.depth}`] ??= {})[ep.id] = { provider: ep.provider, outcome: o });
      });
      // Range limit: widest span that works, with a filter that matches (almost) nothing.
      let max: number | null = null;
      let limit: ErrorClass | "timeout" | null = null;
      for (const span of LOG_SPANS) {
        const r = await call(ep.url, "eth_getLogs", [{ address: canary, topics: [TRANSFER, RARE_SENDER], fromBlock: hex(anchor - span + 1), toBlock: hex(anchor) }], TIMEOUT_MS);
        if (r.ok && Array.isArray(r.result)) {
          max = span;
          ms[ep.id].push(r.ms);
        } else {
          limit = r.ok ? "other" : r.timeout ? "timeout" : classifyError(r.error);
          break;
        }
      }
      spans[ep.id] = { max, limit };
    })
  );

  const judged = new Map<string, ProbeJudgement>();
  for (const w of windows) {
    const id = `logs-${w.depth}`;
    const j = judgeProbe(outcomes[id] ?? {});
    judged.set(id, j);
    report.probes.push({
      id,
      depth: w.depth,
      method: "eth_getLogs",
      question: `USDC Transfer logs in blocks ${w.from}–${w.to} (${WINDOW_BLOCKS} blocks, ${w.depth} ago)`,
      exists: j.exists,
      reference: j.reference,
    });
  }

  report.endpoints = endpoints.map((ep) => {
    const h = heads.get(ep.id);
    if (!h?.ok) return emptyReport(ep, h);
    const { probes, byDepth } = collect(report.probes, judged, ep.id);
    const g = gradeEndpoint({ headOk: true, byDepth });
    return {
      id: ep.id,
      chain: ep.chain,
      provider: ep.provider,
      url: ep.url,
      ...g,
      headOk: true,
      head: h.head,
      headLagSec: h.head != null ? +((maxHead - h.head) * bt!).toFixed(1) : null,
      latencyMs: median(ms[ep.id]),
      maxLogSpan: spans[ep.id]?.max ?? null,
      logSpanLimit: spans[ep.id]?.limit ?? null,
      probes,
    };
  });
  return report;
}

function collect(defs: ProbeInfo[], judged: Map<string, ProbeJudgement>, epId: string) {
  const probes: EndpointReport["probes"] = {};
  const byDepth: Partial<Record<DepthId, Verdict[]>> = {};
  for (const p of defs) {
    const v = judged.get(p.id)?.verdicts[epId];
    if (!v) continue;
    probes[p.id] = v;
    if (p.exists) (byDepth[p.depth] ??= []).push(v.verdict);
  }
  return { probes, byDepth };
}

function emptyReport(ep: Endpoint, h?: { head: number | null; ok: boolean; error?: string; ms?: number[] }): EndpointReport {
  const err = h?.error ?? "no answer";
  // Rate-limited at the very first question: we learned nothing about it, which is not the same as "down".
  const transient = err === "timeout" ? false : TRANSIENT.has(classifyError(err));
  return {
    id: ep.id,
    chain: ep.chain,
    provider: ep.provider,
    url: ep.url,
    grade: transient ? "unreliable" : "down",
    reach: null,
    silentCount: 0,
    headOk: false,
    head: null,
    headLagSec: null,
    latencyMs: null,
    headError: err.slice(0, 160),
    probes: {},
  };
}

/* ------------------------------ Solana ------------------------------ */

const SOL_BLOCK_OPTS = (details: "none" | "signatures") => ({ encoding: "json", transactionDetails: details, rewards: false, maxSupportedTransactionVersion: 1, commitment: "finalized" });
const SOL_TX_OPTS = { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "finalized" };

export async function runSolana(endpoints: Endpoint[], call: RpcCaller): Promise<ChainReport> {
  const heads = new Map<string, { head: number | null; ok: boolean; error?: string; ms: number[] }>();
  await Promise.all(
    endpoints.map(async (ep) => {
      const r = await call(ep.url, "getSlot", [{ commitment: "finalized" }], TIMEOUT_MS);
      const slot = r.ok ? Number(r.result) : NaN;
      heads.set(ep.id, Number.isFinite(slot) && slot > 0 ? { head: slot, ok: true, ms: [r.ms] } : { head: null, ok: false, error: r.ok ? "bad slot" : r.error, ms: [] });
    })
  );
  const live = endpoints.filter((ep) => heads.get(ep.id)?.ok);
  const maxHead = Math.max(...live.map((ep) => heads.get(ep.id)!.head!), 0);
  const report: ChainReport = { chain: "solana", label: CHAIN_LABEL.solana, referenceHead: maxHead || null, blockTimeSec: SOLANA_SLOT_SEC, probes: [], endpoints: [] };
  if (!live.length) {
    report.note = "No endpoint answered; nothing could be measured.";
    report.endpoints = endpoints.map((ep) => emptyReport(ep, heads.get(ep.id)));
    return report;
  }

  // Find a real (non-skipped) block at each depth, and one transaction + its fee payer inside it.
  interface Target { depth: DepthId; slot: number; blockFound: boolean; sig?: string; payer?: string }
  const targets: Target[] = [];
  const anchor = maxHead - 300; // ~2 minutes behind the freshest finalized slot
  for (const d of DEPTHS) {
    const base = anchor - Math.round(d.seconds / SOLANA_SLOT_SEC);
    const t: Target = { depth: d.id, slot: base, blockFound: false };
    search: for (let k = 0; k < 6; k++) {
      for (const ep of live) {
        const r = await call(ep.url, "getBlock", [base + k, SOL_BLOCK_OPTS("signatures")], TIMEOUT_MS * 2);
        const blk = r.ok ? (r.result as { blockhash?: string; signatures?: string[] } | null) : null;
        if (blk?.blockhash && Array.isArray(blk.signatures)) {
          t.slot = base + k;
          t.blockFound = true;
          // Pick a deterministic transaction from the middle of the block.
          const sigs = blk.signatures;
          for (let i = Math.floor(sigs.length / 2); i < sigs.length && !t.sig; i++) {
            const tx = await call(ep.url, "getTransaction", [sigs[i], SOL_TX_OPTS], TIMEOUT_MS);
            const keys = (tx.ok ? (tx.result as { transaction?: { message?: { accountKeys?: string[] } } } | null)?.transaction?.message?.accountKeys : null) ?? null;
            if (keys?.length) {
              t.sig = sigs[i];
              t.payer = keys[0];
            }
            if (i - Math.floor(sigs.length / 2) > 3) break;
          }
          break search;
        }
      }
    }
    targets.push(t);
  }

  const outcomes: Record<string, Record<string, { provider: string; outcome: CallOutcome }>> = {};
  const ms: Record<string, number[]> = Object.fromEntries(endpoints.map((ep) => [ep.id, [...(heads.get(ep.id)?.ms ?? [])]]));
  const probeDefs: ProbeInfo[] = [];
  for (const t of targets) {
    probeDefs.push({ id: `block-${t.depth}`, depth: t.depth, method: "getBlock", question: `Block at slot ${t.slot} (${t.depth} ago)`, exists: false, reference: null });
    if (t.sig && t.depth !== "1h") {
      probeDefs.push({ id: `tx-${t.depth}`, depth: t.depth, method: "getTransaction", question: `Transaction ${t.sig.slice(0, 12)}… from slot ${t.slot} (${t.depth} ago)`, exists: false, reference: null });
      probeDefs.push({ id: `sigs-${t.depth}`, depth: t.depth, method: "getSignaturesForAddress", question: `The 5 signatures of ${t.payer!.slice(0, 8)}… just before that transaction (${t.depth} ago)`, exists: false, reference: null });
    }
  }

  await Promise.all(
    live.map(async (ep) => {
      await sequential(targets, async (t) => {
        const b = await call(ep.url, "getBlock", [t.slot, SOL_BLOCK_OPTS("none")], TIMEOUT_MS);
        if (b.ok) ms[ep.id].push(b.ms);
        ((outcomes[`block-${t.depth}`] ??= {})[ep.id] = {
          provider: ep.provider,
          outcome: await toOutcome(b, async (res) => {
            if (res === null) return null;
            const blk = res as { blockhash?: string; parentSlot?: number };
            return typeof blk.blockhash === "string" ? { ids: [`${blk.blockhash}:${blk.parentSlot}`] } : "invalid";
          }),
        });
        if (!t.sig || t.depth === "1h") return;
        const tx = await call(ep.url, "getTransaction", [t.sig, SOL_TX_OPTS], TIMEOUT_MS);
        if (tx.ok) ms[ep.id].push(tx.ms);
        ((outcomes[`tx-${t.depth}`] ??= {})[ep.id] = {
          provider: ep.provider,
          outcome: await toOutcome(tx, async (res) => {
            if (res === null) return null;
            const r = res as { slot?: number; transaction?: { signatures?: string[] } };
            return r.transaction?.signatures?.[0] === t.sig ? { ids: [`${t.sig}:${r.slot}`] } : "invalid";
          }),
        });
        const sg = await call(ep.url, "getSignaturesForAddress", [t.payer, { before: t.sig, limit: 5, commitment: "finalized" }], TIMEOUT_MS);
        if (sg.ok) ms[ep.id].push(sg.ms);
        ((outcomes[`sigs-${t.depth}`] ??= {})[ep.id] = {
          provider: ep.provider,
          outcome: await toOutcome(sg, async (res) => {
            if (!Array.isArray(res)) return "invalid";
            return { ids: (res as { signature?: string }[]).map((s) => String(s.signature)) };
          }),
        });
      });
    })
  );

  const judged = new Map<string, ProbeJudgement>();
  for (const p of probeDefs) {
    const j = judgeProbe(outcomes[p.id] ?? {});
    judged.set(p.id, j);
    p.exists = j.exists;
    p.reference = j.reference;
  }
  report.probes = probeDefs;
  report.endpoints = endpoints.map((ep) => {
    const h = heads.get(ep.id);
    if (!h?.ok) return emptyReport(ep, h);
    const { probes, byDepth } = collect(probeDefs, judged, ep.id);
    return {
      id: ep.id,
      chain: ep.chain,
      provider: ep.provider,
      url: ep.url,
      ...gradeEndpoint({ headOk: true, byDepth }),
      headOk: true,
      head: h.head,
      headLagSec: h.head != null ? +((maxHead - h.head) * SOLANA_SLOT_SEC).toFixed(1) : null,
      latencyMs: median(ms[ep.id]),
      probes,
    };
  });
  return report;
}

/* ------------------------------ full pass ------------------------------ */

export async function runTruthPass(
  opts: { call?: RpcCaller; endpoints?: Endpoint[]; now?: () => number; polite?: Parameters<typeof politeCaller>[1] } = {}
): Promise<TruthSnapshot> {
  const call = politeCaller(opts.call ?? fetchCaller, opts.polite);
  const eps = opts.endpoints ?? ENDPOINTS;
  const now = opts.now ?? Date.now;
  const startedAt = now();
  const byChain = (c: TruthChain) => eps.filter((e) => e.chain === c);
  const chains = await Promise.all(
    (["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"] as TruthChain[])
      .filter((c) => byChain(c).length)
      .map((c) =>
        (c === "solana" ? runSolana(byChain(c), call) : runEvmChain(c, byChain(c), call)).catch(
          (e): ChainReport => ({ chain: c, label: CHAIN_LABEL[c], referenceHead: null, blockTimeSec: null, probes: [], endpoints: [], note: `Measurement failed: ${(e as Error).message}` })
        )
      )
  );
  return { version: 1, startedAt, finishedAt: now(), chains };
}
