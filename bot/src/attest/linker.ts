import { Connection, PublicKey } from "@solana/web3.js";
import type { AttestStore } from "./store.js";
import { recentMemoHints, verifyAnchorOrReject } from "./chain.js";

/** How far back sealed sweeps are looked for: the runner seals sweeps up to 7 days old. */
const LINK_WINDOW_MS = 7 * 86_400_000;
/** Transactions checked per tick. Anyone can copy a pending sweep's memo, so without a cap a flood of copies
 *  would turn every tick into thousands of RPC calls (on the scanner's RPC quota). */
const LINK_BUDGET = 40;

/** Signatures already shown not to be ours. A finalized transaction never changes, so they are never re-checked;
 *  the oldest are forgotten past `max` so memory stays bounded. */
export class RejectedSigs {
  private readonly set = new Set<string>();
  constructor(private readonly max: number) {}
  has(sig: string): boolean {
    return this.set.has(sig);
  }
  add(sig: string): void {
    this.set.add(sig);
    if (this.set.size > this.max) this.set.delete(this.set.values().next().value as string);
  }
}

/**
 * Links sealed sweeps to their transactions by reading the attester's public history. The bot holds no key and
 * takes nobody's word for it: each match is re-checked from the finalized transaction (attester-signed, one memo).
 * The history is read back over the whole window, so a flood of other transactions can't hide our anchors, and
 * each tick checks at most `budget` new transactions, so a flood of copies only delays a link, tick by tick.
 */
export async function linkOnce(
  conn: Connection,
  attester: PublicKey,
  store: AttestStore,
  opts: { now?: number; pageSize?: number; budget?: number; rejected?: RejectedSigs } = {}
): Promise<number> {
  const now = opts.now ?? Date.now();
  const { hints, complete } = await recentMemoHints(conn, attester, { commitment: "finalized", sinceMs: now - LINK_WINDOW_MS, pageSize: opts.pageSize });
  if (!complete) console.warn("[attest] attester history is flooded past the read limit; older anchors may link late");
  const rejected = opts.rejected ?? new RejectedSigs(5000);
  let budget = opts.budget ?? LINK_BUDGET;
  let linked = 0;
  for (const h of hints) {
    if (!store.isPending(h.root) || rejected.has(h.sig)) continue;
    if (budget-- <= 0) break;
    let r: Awaited<ReturnType<typeof verifyAnchorOrReject>>;
    try {
      r = await verifyAnchorOrReject(conn, h.sig, attester, "finalized");
    } catch {
      continue; // one failed check doesn't end the tick
    }
    if (r === "rejected") rejected.add(h.sig);
    else if (r && store.markAnchored(r)) linked++;
  }
  return linked;
}

export function startAttestLinker(store: AttestStore, opts: { rpc: string; attester: string; minutes?: number }): void {
  const conn = new Connection(opts.rpc, "finalized");
  const attester = new PublicKey(opts.attester);
  const minutes = Math.max(2, Math.min(60, opts.minutes ?? 10));
  const rejected = new RejectedSigs(5000);
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const n = await linkOnce(conn, attester, store, { rejected });
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
