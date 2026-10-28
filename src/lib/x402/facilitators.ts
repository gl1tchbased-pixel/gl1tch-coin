/**
 * Which facilitators verify and settle paid-API payments, in order of preference. x402 uses the first one that
 * supports a payment kind and falls back to the next if one is down at startup. Coinbase's (CDP) comes first when
 * its keys are set: settling through it is what lists the endpoints in the Coinbase Bazaar, the largest x402
 * catalog. PayAI needs no signup and stays as the fallback (and the only one without CDP keys).
 */

import type { FacilitatorConfig } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { facilitator as payai } from "@payai/facilitator";

export function facilitatorConfigs(env: Record<string, string | undefined>): FacilitatorConfig[] {
  const id = (env.CDP_API_KEY_ID ?? "").trim();
  const secret = (env.CDP_API_KEY_SECRET ?? "").trim();
  return id && secret ? [createFacilitatorConfig(id, secret), payai] : [payai];
}
