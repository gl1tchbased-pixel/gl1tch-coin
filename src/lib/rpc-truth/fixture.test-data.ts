import type { TruthView } from "./types";

/** A small but realistic measurement (shapes taken from a real pass on 27 Nov 2026), shared by the tests. */
export const NOW = 1_795_800_000_000;

export const VIEW: TruthView = {
  version: 1,
  startedAt: NOW - 60_000,
  finishedAt: NOW,
  intervalMs: 6 * 3_600_000,
  nextRunAt: NOW + 6 * 3_600_000,
  chains: [
    {
      chain: "base",
      label: "Base",
      referenceHead: 62_854_593,
      blockTimeSec: 0.2,
      probes: [
        { id: "logs-1h", depth: "1h", method: "eth_getLogs", question: "USDC Transfer logs in blocks 1–8 (8 blocks, 1h ago)", exists: true, reference: { fingerprint: "a", size: 30, providers: 3 } },
        { id: "logs-1d", depth: "1d", method: "eth_getLogs", question: "USDC Transfer logs in blocks 9–16 (8 blocks, 1d ago)", exists: true, reference: { fingerprint: "b", size: 25, providers: 2 } },
        { id: "logs-7d", depth: "7d", method: "eth_getLogs", question: "USDC Transfer logs in blocks 17–24 (8 blocks, 7d ago)", exists: true, reference: { fingerprint: "c", size: 20, providers: 2 } },
        { id: "logs-30d", depth: "30d", method: "eth_getLogs", question: "USDC Transfer logs in blocks 25–32 (8 blocks, 30d ago)", exists: false, reference: null },
      ],
      endpoints: [
        {
          id: "base:publicnode", chain: "base", provider: "publicnode", url: "https://base-rpc.publicnode.com", grade: "honest_limited", reach: "1d", silentCount: 0,
          headOk: true, head: 62_854_591, headLagSec: 0.4, latencyMs: 150, maxLogSpan: 50_000, logSpanLimit: "range_limit",
          probes: {
            "logs-1h": { verdict: "ok", size: 30, ms: 140 },
            "logs-1d": { verdict: "ok", size: 25, ms: 150 },
            "logs-7d": { verdict: "refused", errorClass: "paid_plan_required", message: "Archive requests require a personal token", ms: 90 },
            "logs-30d": { verdict: "refused", errorClass: "paid_plan_required", message: "Archive requests require a personal token", ms: 90 },
          },
        },
        {
          id: "base:tenderly", chain: "base", provider: "tenderly", url: "https://gateway.tenderly.co/public/base", grade: "trusted", reach: "7d", silentCount: 0,
          headOk: true, head: 62_854_593, headLagSec: 0, latencyMs: 210, maxLogSpan: 1_000, logSpanLimit: "other",
          probes: {
            "logs-1h": { verdict: "ok", size: 30, ms: 200 },
            "logs-1d": { verdict: "ok", size: 25, ms: 210 },
            "logs-7d": { verdict: "ok", size: 20, ms: 220 },
            "logs-30d": { verdict: "refused", errorClass: "other", message: "invalid params", ms: 80 },
          },
        },
        {
          id: "base:drpc", chain: "base", provider: "drpc", url: "https://base.drpc.org", grade: "trusted", reach: "7d", silentCount: 0,
          headOk: true, head: 62_854_593, headLagSec: 0, latencyMs: 145, maxLogSpan: null, logSpanLimit: "paid_plan_required",
          probes: { "logs-1h": { verdict: "ok", size: 30, ms: 140 }, "logs-1d": { verdict: "ok", size: 25, ms: 145 }, "logs-7d": { verdict: "ok", size: 20, ms: 150 } },
        },
        {
          id: "base:shady", chain: "base", provider: "shady", url: "https://shady.example/rpc", grade: "silent_failure", reach: "1d", silentCount: 1,
          headOk: true, head: 62_854_590, headLagSec: 0.6, latencyMs: 300, maxLogSpan: 10_000, logSpanLimit: "range_limit",
          probes: { "logs-1h": { verdict: "ok", size: 30, ms: 300 }, "logs-1d": { verdict: "ok", size: 25, ms: 300 }, "logs-7d": { verdict: "silent_empty", size: 0, ms: 280 } },
        },
        {
          id: "base:busy", chain: "base", provider: "busy", url: "https://busy.example", grade: "unreliable", reach: null, silentCount: 0,
          headOk: true, head: 62_854_593, headLagSec: 0, latencyMs: 400, maxLogSpan: null, logSpanLimit: "rate_limited",
          probes: { "logs-1h": { verdict: "throttled", errorClass: "rate_limited", message: "http 429", ms: 50 } },
        },
        {
          id: "base:gone", chain: "base", provider: "gone", url: "https://gone.example", grade: "down", reach: null, silentCount: 0,
          headOk: false, head: null, headLagSec: null, latencyMs: null, headError: "fetch failed", probes: {},
        },
      ],
    },
    {
      chain: "solana",
      label: "Solana",
      referenceHead: 400_000_000,
      blockTimeSec: 0.4,
      probes: [
        { id: "block-1h", depth: "1h", method: "getBlock", question: "Block at slot 399991000 (1h ago)", exists: true, reference: { fingerprint: "s", size: 1, providers: 2 } },
        { id: "tx-1d", depth: "1d", method: "getTransaction", question: "Transaction 5abc… from slot 399784000 (1d ago)", exists: true, reference: null },
      ],
      endpoints: [
        {
          id: "solana:solana-foundation", chain: "solana", provider: "solana-foundation", url: "https://api.mainnet-beta.solana.com", grade: "trusted", reach: "1d", silentCount: 0,
          headOk: true, head: 400_000_000, headLagSec: 0, latencyMs: 300, probes: { "block-1h": { verdict: "ok", size: 1, ms: 300 }, "tx-1d": { verdict: "ok", size: 1, ms: 310 } },
        },
        {
          id: "solana:publicnode", chain: "solana", provider: "publicnode", url: "https://solana-rpc.publicnode.com", grade: "silent_failure", reach: "1h", silentCount: 1,
          headOk: true, head: 400_000_000, headLagSec: 0, latencyMs: 150, probes: { "block-1h": { verdict: "ok", size: 1, ms: 150 }, "tx-1d": { verdict: "silent_empty", size: 0, ms: 140 } },
        },
      ],
    },
  ],
  records: {
    "base:publicnode": { runs7d: 28, silentRuns7d: 0, trustedRuns7d: 0, downRuns7d: 0, lastSilentAt: null, firstSeenAt: NOW - 7 * 86_400_000 },
    "base:tenderly": { runs7d: 28, silentRuns7d: 0, trustedRuns7d: 28, downRuns7d: 0, lastSilentAt: null, firstSeenAt: NOW - 7 * 86_400_000 },
    "base:drpc": { runs7d: 28, silentRuns7d: 2, trustedRuns7d: 26, downRuns7d: 0, lastSilentAt: NOW - 86_400_000, firstSeenAt: NOW - 7 * 86_400_000 },
    "base:shady": { runs7d: 28, silentRuns7d: 9, trustedRuns7d: 0, downRuns7d: 0, lastSilentAt: NOW, firstSeenAt: NOW - 7 * 86_400_000 },
    "base:busy": { runs7d: 1, silentRuns7d: 0, trustedRuns7d: 0, downRuns7d: 0, lastSilentAt: null, firstSeenAt: NOW },
    "base:gone": { runs7d: 28, silentRuns7d: 0, trustedRuns7d: 0, downRuns7d: 28, lastSilentAt: null, firstSeenAt: NOW - 7 * 86_400_000 },
  },
};
