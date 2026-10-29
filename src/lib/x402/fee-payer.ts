/**
 * One Solana fee payer for every instance. Coinbase's facilitator hands each /supported call one
 * fee payer from its pool (we saw two different ones across sixteen live 402 answers on
 * 29 Oct 2026). The fee payer is part of the payment requirements and must match exactly, so a
 * payment quoted by one instance and retried on another fails with "No matching payment
 * requirements". Every instance therefore pins the same one: the first, in sorted order, of the
 * facilitator's own published signers for that network. When the signer list doesn't contain the
 * offered fee payer (an unknown format), the kind is left as the facilitator sent it.
 */

import type { SupportedResponse } from "@x402/core/types";

export function pinSvmFeePayer(supported: SupportedResponse): SupportedResponse {
  const signers = supported.signers ?? {};
  const kinds = supported.kinds.map((kind) => {
    const offered = kind.extra?.feePayer;
    if (!String(kind.network).startsWith("solana:") || typeof offered !== "string") return kind;
    const pool = signers[kind.network] ?? signers["solana:*"] ?? [];
    if (!pool.includes(offered)) return kind;
    const pinned = [...pool].sort()[0];
    return pinned === offered ? kind : { ...kind, extra: { ...kind.extra, feePayer: pinned } };
  });
  return { ...supported, kinds };
}
