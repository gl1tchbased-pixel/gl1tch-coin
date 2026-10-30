/**
 * Solana RPC WebSocket (`logsSubscribe`) live pool listener for Rug Radar.
 *
 * Watches Pump.fun and Raydium AMM / CPMM program logs in real time so newly initialized
 * pools and token launches surface immediately without waiting for the hourly sweep.
 * Read-only: never signs or sends transactions.
 */

export const RADAR_PROGRAMS = {
  PUMP_FUN: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  RAYDIUM_AMM_V4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp",
  RAYDIUM_CPMM: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
} as const;

export type RadarProgramId = (typeof RADAR_PROGRAMS)[keyof typeof RADAR_PROGRAMS];

export interface LivePoolEvent {
  signature: string;
  program: RadarProgramId;
  programLabel: "pump.fun" | "Raydium AMM" | "Raydium CPMM";
  slot: number;
  detectedAt: number;
  instruction: string;
}

const PROGRAM_LABELS: Record<RadarProgramId, LivePoolEvent["programLabel"]> = {
  [RADAR_PROGRAMS.PUMP_FUN]: "pump.fun",
  [RADAR_PROGRAMS.RAYDIUM_AMM_V4]: "Raydium AMM",
  [RADAR_PROGRAMS.RAYDIUM_CPMM]: "Raydium CPMM",
};

const POOL_INIT_PATTERNS = [
  /Instruction:\s*Create\b/i,
  /Instruction:\s*Initialize2?\b/i,
  /initialize2/i,
  /init_pc_amount/i,
];

/**
 * Pure parser: extracts a `LivePoolEvent` from a Solana `logsNotification` JSON-RPC frame
 * if it represents a non-errored pool creation / token launch on a watched program.
 */
export function parsePoolLogNotification(
  raw: unknown,
  programFallback: RadarProgramId = RADAR_PROGRAMS.PUMP_FUN,
  now = Date.now(),
): LivePoolEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as {
    method?: string;
    params?: {
      result?: {
        context?: { slot?: number };
        value?: {
          signature?: string;
          err?: unknown;
          logs?: string[];
        };
      };
    };
  };

  if (msg.method !== "logsNotification") return null;
  const val = msg.params?.result?.value;
  if (!val || val.err != null) return null;

  const signature = typeof val.signature === "string" ? val.signature : "";
  if (!signature || signature.length < 32) return null;

  const logs = Array.isArray(val.logs) ? val.logs : [];
  if (logs.length === 0) return null;

  // Detect which watched program was invoked in the log stream.
  let detectedProgram: RadarProgramId = programFallback;
  for (const line of logs) {
    for (const prog of Object.values(RADAR_PROGRAMS)) {
      if (line.includes(prog)) {
        detectedProgram = prog;
        break;
      }
    }
  }

  let matchedInstruction: string | null = null;
  for (const line of logs) {
    for (const pat of POOL_INIT_PATTERNS) {
      const m = line.match(pat);
      if (m) {
        matchedInstruction = m[0];
        break;
      }
    }
    if (matchedInstruction) break;
  }

  if (!matchedInstruction) return null;

  const slot = Number(msg.params?.result?.context?.slot) || 0;
  return {
    signature,
    program: detectedProgram,
    programLabel: PROGRAM_LABELS[detectedProgram],
    slot,
    detectedAt: now,
    instruction: matchedInstruction,
  };
}

export type PoolEventSubscriber = (event: LivePoolEvent) => void;

const RING_CAP = 50;

export class RadarLiveListener {
  private recent: LivePoolEvent[] = [];
  private seenSigs = new Set<string>();
  private subscribers = new Set<PoolEventSubscriber>();

  /** Push a verified pool event into the ring buffer and fan out to subscribers. */
  ingest(ev: LivePoolEvent): boolean {
    if (this.seenSigs.has(ev.signature)) return false;
    this.seenSigs.add(ev.signature);
    this.recent.unshift(ev);
    if (this.recent.length > RING_CAP) {
      const popped = this.recent.pop();
      if (popped) this.seenSigs.delete(popped.signature);
    }
    for (const sub of this.subscribers) {
      try {
        sub(ev);
      } catch {
        /* subscriber error must not break fan-out */
      }
    }
    return true;
  }

  /** Subscribe to live pool events. Returns an unsubscribe function. */
  subscribe(fn: PoolEventSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /** Latest `limit` events (newest first). */
  latest(limit = 20): LivePoolEvent[] {
    return this.recent.slice(0, limit);
  }

  /** Build the JSON-RPC `logsSubscribe` payloads for all watched programs. */
  buildSubscriptionFrames(): string[] {
    return Object.values(RADAR_PROGRAMS).map((mentions, idx) =>
      JSON.stringify({
        jsonrpc: "2.0",
        id: idx + 1,
        method: "logsSubscribe",
        params: [{ mentions: [mentions] }, { commitment: "confirmed" }],
      }),
    );
  }
}

export const radarLiveListener = new RadarLiveListener();

