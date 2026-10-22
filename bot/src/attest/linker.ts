import { Connection, PublicKey } from "@solana/web3.js";
import type { AttestStore } from "./store.js";
import { recentMemoHints, verifyAnchor } from "./chain.js";

/**
 * Links sealed sweeps to their transactions by reading the attester's public history. The bot holds no key and
 * takes nobody's word for it: each match is re-checked from the finalized transaction (attester-signed, one memo).
 */
export async function linkOnce(conn: Connection, attester: PublicKey, store: AttestStore): Promise<number> {
  const hints = await recentMemoHints(conn, attester, { commitment: "finalized", limit: 100 });
  let linked = 0;
  for (const h of hints) {
    if (!store.isPending(h.root)) continue;
    const a = await verifyAnchor(conn, h.sig, attester, "finalized");
    if (a && store.markAnchored(a)) linked++;
  }
  return linked;
}

export function startAttestLinker(store: AttestStore, opts: { rpc: string; attester: string; minutes?: number }): void {
  const conn = new Connection(opts.rpc, "finalized");
  const attester = new PublicKey(opts.attester);
  const minutes = Math.max(2, Math.min(60, opts.minutes ?? 10));
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const n = await linkOnce(conn, attester, store);
      if (n) console.log(`[attest] linked ${n} sealed sweep(s)`);
    } catch (e) {
      console.warn("[attest] link failed:", (e as Error).message);
    } finally {
      busy = false;
    }
  };
  setInterval(tick, minutes * 60_000).unref?.();
  void tick();
}
