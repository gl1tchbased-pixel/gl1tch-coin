import { describe, it, expect, vi } from "vitest";
import {
  RADAR_PROGRAMS,
  RadarLiveListener,
  parsePoolLogNotification,
} from "./listener.js";

describe("RadarLiveListener & parsePoolLogNotification", () => {
  it("parses a valid pump.fun pool Create logsNotification", () => {
    const frame = {
      jsonrpc: "2.0",
      method: "logsNotification",
      params: {
        result: {
          context: { slot: 312_000_123 },
          value: {
            signature: "5KtPn1LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
            err: null,
            logs: [
              `Program ${RADAR_PROGRAMS.PUMP_FUN} invoke [1]`,
              "Program log: Instruction: Create",
              `Program ${RADAR_PROGRAMS.PUMP_FUN} success`,
            ],
          },
        },
      },
    };

    const ev = parsePoolLogNotification(frame, RADAR_PROGRAMS.PUMP_FUN, 1_700_000_000_000);
    expect(ev).toEqual({
      signature: "5KtPn1LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
      program: RADAR_PROGRAMS.PUMP_FUN,
      programLabel: "pump.fun",
      slot: 312_000_123,
      detectedAt: 1_700_000_000_000,
      instruction: "Instruction: Create",
    });
  });

  it("parses a Raydium AMM v4 initialize2 notification", () => {
    const frame = {
      jsonrpc: "2.0",
      method: "logsNotification",
      params: {
        result: {
          context: { slot: 312_000_500 },
          value: {
            signature: "3XyZ91LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
            err: null,
            logs: [
              `Program ${RADAR_PROGRAMS.RAYDIUM_AMM_V4} invoke [1]`,
              "Program log: initialize2: InitializeInstruction2 { nonce: 254, open_time: 0, init_pc_amount: 1000 }",
            ],
          },
        },
      },
    };

    const ev = parsePoolLogNotification(frame);
    expect(ev?.program).toBe(RADAR_PROGRAMS.RAYDIUM_AMM_V4);
    expect(ev?.programLabel).toBe("Raydium AMM");
  });

  it("ignores failed transactions and ordinary swap logs", () => {
    const failed = {
      method: "logsNotification",
      params: {
        result: {
          context: { slot: 1 },
          value: {
            signature: "5KtPn1LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
            err: { InstructionError: [0, "Custom"] },
            logs: ["Program log: Instruction: Create"],
          },
        },
      },
    };
    expect(parsePoolLogNotification(failed)).toBeNull();

    const ordinarySwap = {
      method: "logsNotification",
      params: {
        result: {
          context: { slot: 2 },
          value: {
            signature: "5KtPn1LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
            err: null,
            logs: ["Program log: Instruction: Swap"],
          },
        },
      },
    };
    expect(parsePoolLogNotification(ordinarySwap)).toBeNull();
  });

  it("deduplicates signatures and fans out to subscribers", () => {
    const listener = new RadarLiveListener();
    const fn = vi.fn();
    const unsub = listener.subscribe(fn);

    const ev = {
      signature: "5KtPn1LGuxhFiwjxErkxTb3X2N8a9yJvR4mK7qP1wZ8x9L2mN3pQ4rS5tU6vW7xY",
      program: RADAR_PROGRAMS.PUMP_FUN,
      programLabel: "pump.fun" as const,
      slot: 100,
      detectedAt: 1000,
      instruction: "Instruction: Create",
    };

    expect(listener.ingest(ev)).toBe(true);
    expect(listener.ingest(ev)).toBe(false); // duplicate ignored
    expect(fn).toHaveBeenCalledTimes(1);
    expect(listener.latest()).toHaveLength(1);

    unsub();
    expect(listener.buildSubscriptionFrames()).toHaveLength(3);
  });
});

