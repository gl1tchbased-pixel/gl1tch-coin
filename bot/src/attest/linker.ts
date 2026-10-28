import { Connection, PublicKey } from "@solana/web3.js";
import type { AttestStore } from "./store.js";
import { recentMemoHints, verifyAnchor } from "./chain.js";

/** How far back sealed sweeps are looked for: the runner seals sweeps up to 7 days old. */
const LINK_WINDOW_MS = 7 * 86_400_000;

/**
 * Links sealed sweeps to their transactions by reading the attester's public history. The bot holds no key and
 * takes nobody's word for it: each match is re-checked from the finalized transaction (attester-signed, one memo).
 * The history is read back over the whole window, so a flood of other transactions can't hide our anchors.
 */
export async function linkOnce(
  conn: Connection,
  attester: PublicKey,
  store: AttestStore,
  opts: { now?: number; pageSize?: number } = {}
): Promise<number> {
  const now = opts.now ?? Date.now();
  const { hints, complete } = await recentMemoHints(conn, attester, { commitment: "finalized", sinceMs: now - LINK_WINDOW_MS, pageSize: opts.pageSize });
  if (!complete) console.warn("[attest] attester history is flooded past the read limit; older anchors may link late");
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
