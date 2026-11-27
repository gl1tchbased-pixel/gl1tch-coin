import type { ChainReport, DepthId, EndpointReport, ErrorClass, Grade, TruthChain, TruthView, Verdict } from "./types";

/** Pure presentation helpers for the RPC Truth page, the free JSON API and the MCP tool. */

export const DEPTHS: DepthId[] = ["1h", "1d", "7d", "30d"];
export const GRADE_ORDER: Grade[] = ["trusted", "honest_limited", "unreliable", "silent_failure", "down"];
export type Tone = "good" | "ok" | "warn" | "bad" | "off";

export const GRADE_META: Record<Grade, { label: string; tone: Tone; meaning: string }> = {
  trusted: { label: "Correct", tone: "good", meaning: "Answered every history check whose data we could prove exists." },
  honest_limited: { label: "Honest, limited", tone: "ok", meaning: "Has gaps, but says so with a clear error instead of pretending there is nothing." },
  unreliable: { label: "Inconclusive", tone: "warn", meaning: "Rate-limited or timed out on this pass, so we could not tell." },
  silent_failure: { label: "Silent failure", tone: "bad", meaning: "Returned nothing (or less) where other providers proved the data exists. Your code would read that as “no activity”." },
  down: { label: "Down", tone: "off", meaning: "Did not answer the basic chain-id / latest-block check." },
};

export const ERROR_TEXT: Record<ErrorClass | "timeout", string> = {
  paid_plan_required: "needs a paid plan or key",
  auth_required: "needs an API key",
  result_limit: "too many results",
  range_limit: "block range too wide",
  history_unavailable: "history not kept",
  rate_limited: "rate-limited",
  method_unsupported: "method not available",
  discontinued: "endpoint discontinued",
  http_error: "HTTP error",
  other: "error",
  timeout: "timed out",
};

export type CellState = "ok" | "silent" | "refused" | "inconclusive" | "unproven" | "none";

export interface DepthCell {
  state: CellState;
  /** Short text inside the cell. */
  text: string;
  /** Longer explanation (title / screen readers). */
  detail: string;
}

/** Combine every probe an endpoint answered at one depth into one cell. */
export function depthCell(chain: ChainReport, ep: EndpointReport, depth: DepthId): DepthCell {
  const defs = chain.probes.filter((p) => p.depth === depth);
  const rows = defs.map((p) => ({ p, r: ep.probes[p.id] })).filter((x) => x.r);
  if (!rows.length) return { state: "none", text: "—", detail: ep.headOk ? "Not measured" : "Endpoint down" };
  const silent = rows.find((x) => x.r.verdict === "silent_empty" || x.r.verdict === "mismatch");
  if (silent) {
    const what = silent.r.verdict === "silent_empty" ? "returned nothing" : `returned ${silent.r.size ?? "a different"} result(s) instead of ${silent.p.reference?.size ?? "the agreed answer"}`;
    return { state: "silent", text: "✗ silent", detail: `${silent.p.question}: ${what}, although the data exists.` };
  }
  // Only questions whose data was proven to exist are judged (see bot/src/rpc-truth/judge.ts).
  const proven = rows.filter((x) => x.p.exists);
  if (!proven.length) return { state: "unproven", text: "?", detail: "No free endpoint could show this data, so nothing is judged here." };
  if (proven.every((x) => x.r.verdict === "ok")) return { state: "ok", text: "✓", detail: `Correct: ${proven.map((x) => x.p.question).join("; ")}` };
  if (proven.every((x) => x.r.verdict === "ok" || x.r.verdict === "refused")) {
    const refused = proven.find((x) => x.r.verdict === "refused")!;
    const why = ERROR_TEXT[refused.r.errorClass ?? "other"];
    return { state: "refused", text: "says no", detail: `Clear error: ${why}${refused.r.message ? ` (“${refused.r.message}”)` : ""}` };
  }
  const v = proven.find((x) => x.r.verdict !== "ok" && x.r.verdict !== "refused")!.r;
  return { state: "inconclusive", text: "…", detail: v.verdict === "timeout" ? "Timed out" : `Inconclusive: ${ERROR_TEXT[v.errorClass ?? "other"]}` };
}

const reachRank = (d: DepthId | null) => (d ? DEPTHS.indexOf(d) + 1 : 0);

export function sortEndpoints(list: EndpointReport[]): EndpointReport[] {
  return [...list].sort(
    (a, b) =>
      GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) ||
      reachRank(b.reach) - reachRank(a.reach) ||
      (b.maxLogSpan ?? 0) - (a.maxLogSpan ?? 0) ||
      (a.latencyMs ?? 1e9) - (b.latencyMs ?? 1e9) ||
      a.id.localeCompare(b.id)
  );
}

export function spanText(ep: EndpointReport): string {
  if (ep.chain === "solana") return "n/a";
  if (!ep.headOk) return "—";
  if (ep.maxLogSpan == null) return ep.logSpanLimit ? "< 1,000" : "—";
  if (ep.maxLogSpan >= 100_000 && !ep.logSpanLimit) return "≥ 100,000";
  return ep.maxLogSpan.toLocaleString("en-US");
}

export function reachText(d: DepthId | null): string {
  return d ? `${d} back` : "none";
}

export interface Finding {
  chain: TruthChain;
  chainLabel: string;
  endpointId: string;
  provider: string;
  url: string;
  depth: DepthId;
  method: string;
  question: string;
  verdict: Extract<Verdict, "silent_empty" | "mismatch">;
  /** How many results the honest answer had. */
  expected: number | null;
  got: number;
}

/** Every silent empty / mismatch of the latest pass, deepest-first within each chain. */
export function findings(view: TruthView): Finding[] {
  const out: Finding[] = [];
  for (const c of view.chains) {
    for (const e of c.endpoints) {
      for (const p of c.probes) {
        const r = e.probes[p.id];
        if (!r || (r.verdict !== "silent_empty" && r.verdict !== "mismatch")) continue;
        out.push({
          chain: c.chain,
          chainLabel: c.label,
          endpointId: e.id,
          provider: e.provider,
          url: e.url,
          depth: p.depth,
          method: p.method,
          question: p.question,
          verdict: r.verdict,
          expected: p.reference?.size ?? null,
          got: r.size ?? 0,
        });
      }
    }
  }
  return out;
}

export interface Summary {
  endpoints: number;
  chains: number;
  correct: number;
  silent: number;
  down: number;
}

export function summarize(view: TruthView): Summary {
  const all = view.chains.flatMap((c) => c.endpoints);
  return {
    endpoints: all.length,
    chains: view.chains.length,
    correct: all.filter((e) => e.grade === "trusted").length,
    silent: all.filter((e) => e.grade === "silent_failure").length,
    down: all.filter((e) => e.grade === "down").length,
  };
}

export function isDepth(x: unknown): x is DepthId {
  return typeof x === "string" && (DEPTHS as string[]).includes(x);
}

export interface Recommendation {
  url: string;
  provider: string;
  grade: Grade;
  reach: DepthId | null;
  maxLogSpan: number | null;
  latencyMs: number | null;
  silentRuns7d: number;
  runs7d: number;
}

/**
 * Endpoints worth using on `chain` right now: never one with silent failures in the last 7 days, never one that
 * is down or inconclusive on the latest pass; optionally only those that served `depth` of history, and (EVM)
 * whose eth_getLogs span reached `minSpan` blocks.
 */
export function recommend(view: TruthView, chain: TruthChain, opts: { depth?: DepthId; minSpan?: number } = {}): Recommendation[] {
  const c = view.chains.find((x) => x.chain === chain);
  if (!c) return [];
  return sortEndpoints(c.endpoints)
    .filter((e) => e.grade === "trusted" || e.grade === "honest_limited")
    .filter((e) => (view.records[e.id]?.silentRuns7d ?? 0) === 0)
    .filter((e) => !opts.depth || reachRank(e.reach) >= reachRank(opts.depth))
    .filter((e) => !opts.minSpan || chain === "solana" || (e.maxLogSpan ?? 0) >= opts.minSpan)
    .map((e) => ({
      url: e.url,
      provider: e.provider,
      grade: e.grade,
      reach: e.reach,
      maxLogSpan: e.maxLogSpan ?? null,
      latencyMs: e.latencyMs,
      silentRuns7d: view.records[e.id]?.silentRuns7d ?? 0,
      runs7d: view.records[e.id]?.runs7d ?? 0,
    }));
}

export function recordText(r: TruthView["records"][string] | undefined): string {
  if (!r || r.runs7d <= 1) return "new";
  if (r.silentRuns7d === 0) return `0 silent in ${r.runs7d} checks`;
  return `silent in ${r.silentRuns7d} of ${r.runs7d} checks`;
}

export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
