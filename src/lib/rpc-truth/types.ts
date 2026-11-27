/** RPC Truth Monitor — shape of the bot's GET /rpc-truth (bot/src/rpc-truth/store.ts → TruthView). */

export type TruthChain = "solana" | "ethereum" | "base" | "bsc" | "arbitrum" | "polygon";
export type DepthId = "1h" | "1d" | "7d" | "30d";
export type Grade = "trusted" | "honest_limited" | "unreliable" | "silent_failure" | "down";
export type Verdict = "ok" | "silent_empty" | "mismatch" | "refused" | "throttled" | "timeout" | "unverified";
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

export interface ProbeResult {
  verdict: Verdict;
  size?: number;
  errorClass?: ErrorClass;
  message?: string;
  ms: number;
}

export interface ProbeInfo {
  id: string;
  depth: DepthId;
  method: string;
  question: string;
  exists: boolean;
  reference: { fingerprint: string; size: number; providers: number } | null;
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
  maxLogSpan?: number | null;
  logSpanLimit?: ErrorClass | "timeout" | null;
  headError?: string;
  probes: Record<string, ProbeResult>;
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

export interface EndpointRecord {
  runs7d: number;
  silentRuns7d: number;
  trustedRuns7d: number;
  downRuns7d: number;
  lastSilentAt: number | null;
  firstSeenAt: number;
}

export interface TruthView {
  version: 1;
  startedAt: number;
  finishedAt: number;
  intervalMs: number;
  nextRunAt: number;
  chains: ChainReport[];
  records: Record<string, EndpointRecord>;
}
