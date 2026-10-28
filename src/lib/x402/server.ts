/**
 * The x402 resource server behind the paid agent API. Coinbase (when CDP keys are set) and/or PayAI verify and
 * settle payments (see facilitators.ts); USDC on Solana and on Base. Every settled payment is
 * reported to the public revenue ledger. GL1TCH holds no key: the facilitator broadcasts the
 * payer's own signed transfer to our receive address.
 */

import { x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { facilitatorConfigs } from "./facilitators";
import { readSelfPayers } from "./config";
import { settleInputFromContext } from "./settle";
import { recordRevenue, revenueEntryFromSettle } from "@/lib/revenue";

let server: x402ResourceServer | null = null;

export function getX402Server(): x402ResourceServer {
  if (server) return server;
  const selfPayers = readSelfPayers(process.env);
  const s = new x402ResourceServer(facilitatorConfigs(process.env).map((c) => new HTTPFacilitatorClient(c)))
    .register("solana:*", new ExactSvmScheme())
    .register("eip155:*", new ExactEvmScheme());
  s.registerExtension(bazaarResourceServerExtension);
  s.onAfterSettle(async (ctx) => {
    const input = settleInputFromContext(ctx);
    const entry = input ? revenueEntryFromSettle(input, selfPayers) : null;
    if (entry) recordRevenue(entry);
    else console.warn("[x402] settlement not recorded in the ledger:", JSON.stringify(input?.result ?? null));
  });
  server = s;
  return s;
}
