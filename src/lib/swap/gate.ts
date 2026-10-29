/**
 * The safety gate in front of Safe Swap. A buy runs only on a token's current verdict: CLEAN and
 * LOW RISK go through, CAUTION needs the buyer to confirm they read the warnings, and HIGH RISK,
 * RUG-SHAPED or a partial read are refused. A sell is never gated: getting out of a risky token is
 * the point of a safety tool. The gate is the same with or without a GL1TCH fee.
 */

export type SwapSide = "buy" | "sell";

export type GateResult =
  | { ok: true; warning: string | null }
  | { ok: false; needsAck: boolean; reason: string };

/** Below this confidence too few checks ran to trust the verdict for a buy. */
export const MIN_BUY_CONFIDENCE = 60;

export function swapGate(side: SwapSide, verdict: string, confidence: number | null, ack: boolean): GateResult {
  if (side === "sell") return { ok: true, warning: null };
  if (confidence != null && confidence < MIN_BUY_CONFIDENCE) {
    return { ok: false, needsAck: false, reason: `Only ${confidence}% of the checks could run on this token, so GL1TCH won't route a buy into it. Selling stays open.` };
  }
  switch (verdict) {
    case "CLEAN":
    case "LOW RISK":
      return { ok: true, warning: null };
    case "CAUTION":
      return ack
        ? { ok: true, warning: "This token reads CAUTION. You confirmed you read the warnings." }
        : { ok: false, needsAck: true, reason: "This token reads CAUTION. Read the warnings above, then confirm to buy." };
    case "HIGH RISK":
    case "RUG-SHAPED":
      return { ok: false, needsAck: false, reason: `This token reads ${verdict}, so GL1TCH won't route a buy into it. Selling stays open.` };
    default:
      return { ok: false, needsAck: false, reason: "GL1TCH couldn't judge this token, so it won't route a buy into it. Selling stays open." };
  }
}
