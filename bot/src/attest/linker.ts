import { Connection, PublicKey } from "@solana/web3.js";
import type { AttestStore } from "./store.js";
import { recentMemoHints, verifyAnchorOrReject } from "./chain.js";
import { PINNED_ATTESTER, type Cluster } from "./guard.js";

/** How far back sealed sweeps are looked for: the runner seals sweeps up to 7 days old. */
const LINK_WINDOW_MS = 7 * 86_400_000;
/** History-fallback checks per tick, and per root per tick. Anyone can copy a pending sweep's memo, so without
 *  caps a flood of copies would turn every tick into thousands of RPC calls (on the scanner's RPC quota). */
const LINK_BUDGET = 40;
const LINK_PER_ROOT = 3;
/** Ticks a reported anchor waits for finalization before it is dropped (the history fallback still covers it). */
const REPORT_TRIES = 12;
const REPORT_QUEUE_MAX = 100;

const ROOT_RE = /^[0-9a-f]{64}$/;
const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

/** Signatures already shown not to be ours. A fetched transaction that isn't an attester-signed memo never becomes
 *  one, so they are never re-checked; the oldest are forgotten past `max` so memory stays bounded. */
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

/** Which key the bot links anchors from: the pinned attester on mainnet (a wrong env can't make it trust another
 *  key's memos), the env key on devnet. */
export function linkerAttester(cluster: Cluster, envAttester: string): { attester: string | null; warning?: string } {
  const env = envAttester.trim();
  if (cluster === "mainnet-beta") {
    return env && env !== PINNED_ATTESTER
      ? { attester: PINNED_ATTESTER, warning: `ATTESTER_PUBKEY ${env} ignored on mainnet; linking from the pinned attester ${PINNED_ATTESTER}` }
      : { attester: PINNED_ATTESTER };
  }
  return { attester: env || null };
}

/**
 * History fallback: links sealed sweeps by reading the attester's public history. The bot holds no key and takes
 * nobody's word for it: each match is re-checked from the finalized transaction (attester-signed, one memo). It
 * reads back over the whole window and checks at most `budget` new transactions per tick and LINK_PER_ROOT per
 * root, so a flood of copies costs a bounded amount of work. Copies newer than the anchor can still delay this
 * path, which is why the runner also reports each anchor it sends (Linker.report).
 */
export async function linkOnce(
  conn: Connection,
  attester: PublicKey,
  store: AttestStore,
  opts: { now?: number; pageSize?: number; budget?: number; rejected?: RejectedSigs } = {}
): Promise<number> {
  const now = opts.now ?? Date.now();
  let budget = opts.budget ?? LINK_BUDGET;
  if (budget <= 0) return 0;
  const { hints, complete } = await recentMemoHints(conn, attester, { commitment: "finalized", sinceMs: now - LINK_WINDOW_MS, pageSize: opts.pageSize });
  if (!complete) console.warn("[attest] attester history is flooded past the read limit; older anchors may link late");
  const rejected = opts.rejected ?? new RejectedSigs(5000);
  const perRoot = new Map<string, number>();
  let linked = 0;
  for (const h of hints) {
    if (!store.isPending(h.root) || rejected.has(h.sig)) continue;
    const tried = perRoot.get(h.root) ?? 0;
    if (tried >= LINK_PER_ROOT) continue;
    if (budget-- <= 0) break;
    perRoot.set(h.root, tried + 1);
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

export type ReportResult = "queued" | "invalid" | "not_pending" | "rejected" | "not_found";

/**
 * Links anchors the runner reports right after sending them ({root, sig}), so a flood of copied memos in the
 * history can't hold a sweep unlinked. A report is trusted for nothing: the transaction is fetched and must be an
 * attester-signed memo of that root (only the attester's key can make one), and it is linked only once finalized.
 * Anything else is refused, and a transaction shown not to be ours is never fetched again.
 */
export class Linker {
  private readonly queue = new Map<string, { sig: string; tries: number }>();
  constructor(
    private readonly conn: Connection,
    private readonly attester: PublicKey,
    private readonly store: AttestStore,
    private readonly rejected = new RejectedSigs(5000)
  ) {}

  async report(body: unknown): Promise<ReportResult> {
    const b = (body ?? {}) as { root?: unknown; sig?: unknown };
    if (typeof b.root !== "string" || !ROOT_RE.test(b.root) || typeof b.sig !== "string" || !SIG_RE.test(b.sig)) return "invalid";
    const { root, sig } = b;
    if (!this.store.isPending(root)) return "not_pending";
    if (this.rejected.has(sig)) return "rejected";
    let r: Awaited<ReturnType<typeof verifyAnchorOrReject>>;
    try {
      r = await verifyAnchorOrReject(this.conn, sig, this.attester, "confirmed");
    } catch {
      return "not_found";
    }
    if (r === null) return "not_found";
    if (r === "rejected" || r.root !== root) {
      this.rejected.add(sig);
      return "rejected";
    }
    if (this.queue.size < REPORT_QUEUE_MAX || this.queue.has(root)) this.queue.set(root, { sig, tries: 0 });
    return "queued";
  }

  /** Links reported anchors that have finalized, then runs the history fallback. */
  async tick(opts: { now?: number; pageSize?: number; budget?: number } = {}): Promise<number> {
    let linked = 0;
    for (const [root, q] of this.queue) {
      if (!this.store.isPending(root)) {
        this.queue.delete(root);
        continue;
      }
      let r: Awaited<ReturnType<typeof verifyAnchorOrReject>> = null;
      try {
        r = await verifyAnchorOrReject(this.conn, q.sig, this.attester, "finalized");
      } catch {
        // retry next tick
      }
      if (r && r !== "rejected" && r.root === root) {
        if (this.store.markAnchored(r)) linked++;
        this.queue.delete(root);
      } else if (r === "rejected" || (r && r.root !== root) || ++q.tries >= REPORT_TRIES) {
        this.queue.delete(root);
      }
    }
    return linked + (await linkOnce(this.conn, this.attester, this.store, { ...opts, rejected: this.rejected }));
  }
}

export function startAttestLinker(store: AttestStore, opts: { rpc: string; attester: string; minutes?: number }): Linker {
  const linker = new Linker(new Connection(opts.rpc, "finalized"), new PublicKey(opts.attester), store);
  const minutes = Math.max(2, Math.min(60, opts.minutes ?? 10));
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const n = await linker.tick();
      if (n) console.log(`[attest] linked ${n} sealed sweep(s)`);
    } catch (e) {
      console.warn("[attest] link failed:", (e as Error).message);
    } finally {
      busy = false;
    }
  };
  setInterval(tick, minutes * 60_000).unref?.();
  void tick();
  return linker;
}
