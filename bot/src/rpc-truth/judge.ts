import type { DepthId } from "./registry.js";

/**
 * RPC Truth Monitor — the judging rules, kept pure so every verdict on the public page is reproducible.
 *
 * Every endpoint of a chain gets the exact same question. Two kinds of proof decide the answer:
 *  - existence: any endpoint returning well-formed data for the asked range proves the data exists, so an
 *    endpoint answering "nothing" for that same question is a SILENT EMPTY (the dangerous failure: wallets show
 *    "no activity", scanners say "clean");
 *  - completeness: the reference answer is the one at least two DIFFERENT providers returned byte-for-byte
 *    (same count + same ids). Only then can a different non-empty answer be called a MISMATCH.
 * An explicit error is honest ("I can't serve that") and is never counted against an endpoint's truthfulness.
 */

export type ErrorClass =
  | "paid_plan_required"
  | "auth_required"
  | "result_limit"
  | "range_limit"
  | "history_unavailable"
  | "rate_limited"
  | "method_unsupported"
  | "discontinued"
  | "http_error"
  | "other";

export type CallOutcome =
  | { kind: "data"; fingerprint: string; size: number; ms: number }
  | { kind: "empty"; ms: number }
  | { kind: "error"; errorClass: ErrorClass; message: string; ms: number }
  | { kind: "timeout"; ms: number };

/** throttled = rate-limited / transient HTTP error: no conclusion either way. */
export type Verdict = "ok" | "silent_empty" | "mismatch" | "refused" | "throttled" | "timeout" | "unverified";

export interface ProbeJudgement {
  /** Any endpoint returned well-formed data → the data exists. */
  exists: boolean;
  /** Answer agreed byte-for-byte by ≥2 distinct providers, if any. */
  reference: { fingerprint: string; size: number; providers: number } | null;
  verdicts: Record<string, { verdict: Verdict; size?: number; errorClass?: ErrorClass; message?: string; ms: number }>;
}

const ORDERED: [ErrorClass, RegExp][] = [
  // Order matters: "Rate limit exceeded. Upgrade your plan" is a rate limit, "ranges over 100 blocks are not
  // supported on free plan" is a range limit, "Archive requests require a personal token" is a paid plan.
  ["rate_limited", /rate[- ]?limit|too many requests|\b429\b|limit exceeded|limit reached|quota|throttl/i],
  ["discontinued", /discontinued|deprecated endpoint|no longer (available|supported)/i],
  ["result_limit", /max(imum)? results|response size|too many results|exceeds limit of \d+|more than \d+ (logs|results)|log response size/i],
  ["range_limit", /range|max(imum)? (number of )?blocks|too many blocks|limited to \d+|exceed(s|ed)? .*block|block span/i],
  ["paid_plan_required", /free plan|free tier|upgrade|paid plan|personal token|premium/i],
  ["auth_required", /api[ -]?key|unauthori[sz]ed|forbidden|\b40[13]\b|authenticate|access denied/i],
  ["method_unsupported", /method not (found|supported|available)|unsupported method|method .* (is )?not supported/i],
  ["history_unavailable", /archive|pruned|missing trie|header not found|not available|history|before first available|was skipped|cleaned up|not found/i],
  ["http_error", /^http \d{3}/i],
];

/** Errors that say nothing about what the endpoint can serve: try again later, judge nothing. */
export const TRANSIENT: ReadonlySet<ErrorClass> = new Set<ErrorClass>(["rate_limited", "http_error"]);

export function classifyError(message: string): ErrorClass {
  for (const [cls, re] of ORDERED) if (re.test(message)) return cls;
  return "other";
}

export function judgeProbe(outcomes: Record<string, { provider: string; outcome: CallOutcome }>): ProbeJudgement {
  const entries = Object.entries(outcomes);
  const data = entries.filter(([, v]) => v.outcome.kind === "data") as [string, { provider: string; outcome: Extract<CallOutcome, { kind: "data" }> }][];

  const groups = new Map<string, { size: number; providers: Set<string> }>();
  for (const [, v] of data) {
    const g = groups.get(v.outcome.fingerprint) ?? { size: v.outcome.size, providers: new Set<string>() };
    g.providers.add(v.provider);
    groups.set(v.outcome.fingerprint, g);
  }
  let reference: ProbeJudgement["reference"] = null;
  for (const [fingerprint, g] of groups) {
    if (g.providers.size < 2) continue;
    if (!reference || g.size > reference.size || (g.size === reference.size && g.providers.size > reference.providers)) {
      reference = { fingerprint, size: g.size, providers: g.providers.size };
    }
  }
  const exists = data.length > 0;

  const verdicts: ProbeJudgement["verdicts"] = {};
  for (const [id, { outcome: o }] of entries) {
    if (o.kind === "data") {
      const verdict: Verdict = !reference || o.fingerprint === reference.fingerprint ? "ok" : "mismatch";
      verdicts[id] = { verdict, size: o.size, ms: o.ms };
    } else if (o.kind === "empty") {
      verdicts[id] = { verdict: exists ? "silent_empty" : "unverified", size: 0, ms: o.ms };
    } else if (o.kind === "error") {
      verdicts[id] = { verdict: TRANSIENT.has(o.errorClass) ? "throttled" : "refused", errorClass: o.errorClass, message: o.message.slice(0, 160), ms: o.ms };
    } else {
      verdicts[id] = { verdict: "timeout", ms: o.ms };
    }
  }
  return { exists, reference, verdicts };
}

export type Grade = "trusted" | "honest_limited" | "unreliable" | "silent_failure" | "down";

export const GRADE_ORDER: Grade[] = ["trusted", "honest_limited", "unreliable", "silent_failure", "down"];

export interface GradeInput {
  headOk: boolean;
  /** Verdicts of the history probes at each depth whose data was PROVEN to exist (probe.exists). Depths where no
   *  endpoint could show the data are left out: refusing what nobody can serve is not a failure. */
  byDepth: Partial<Record<DepthId, Verdict[]>>;
}

export interface GradeResult {
  grade: Grade;
  /** Deepest depth at which every probe (and every shallower one) answered correctly; null if none. */
  reach: DepthId | null;
  silentCount: number;
}

const DEPTH_ORDER: DepthId[] = ["1h", "1d", "7d", "30d"];

export function gradeEndpoint(input: GradeInput): GradeResult {
  const measured = DEPTH_ORDER.filter((d) => (input.byDepth[d]?.length ?? 0) > 0);
  const all = measured.flatMap((d) => input.byDepth[d]!);
  const silentCount = all.filter((v) => v === "silent_empty" || v === "mismatch").length;
  let reach: DepthId | null = null;
  for (const d of measured) {
    if (input.byDepth[d]!.every((v) => v === "ok")) reach = d;
    else break;
  }
  if (!input.headOk) return { grade: "down", reach, silentCount };
  if (silentCount > 0) return { grade: "silent_failure", reach, silentCount };
  const misses = all.filter((v) => v !== "ok");
  if (!all.length) return { grade: "unreliable", reach, silentCount };
  if (!misses.length) return { grade: "trusted", reach, silentCount };
  // It either said plainly that it can't serve that history (honest), or we couldn't tell (throttled / timeouts).
  return { grade: misses.every((v) => v === "refused") ? "honest_limited" : "unreliable", reach, silentCount };
}

/** Stable short fingerprint of a list of ids (order-independent). */
export async function fingerprintOf(ids: string[]): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex").slice(0, 16);
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
