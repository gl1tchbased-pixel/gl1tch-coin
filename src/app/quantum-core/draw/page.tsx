import type { Metadata } from "next";
import Link from "next/link";
import { currentDraw } from "@/lib/quantum/client";
import { DrawEntry } from "@/components/web3/DrawEntry";
import styles from "./draw.module.css";

export const metadata: Metadata = {
  title: "Quantum Draw — provably-fair, quantum-seeded | GL1TCH",
  description:
    "Enter a provably-fair draw seeded by real NIST CURBy quantum randomness. Commit-reveal: your entry list is frozen and committed before the pulse exists, so no one can game it. Recompute the winner yourself.",
  alternates: { canonical: "/quantum-core/draw" },
};

export const dynamic = "force-dynamic";

const fmt = (ms: number) => new Date(ms).toUTCString().replace("GMT", "UTC");

export default async function DrawPage() {
  const draw = await currentDraw();
  const open = draw?.status === "open" && Date.now() < (draw?.closesAt ?? 0);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Draw · commit-reveal</span>
        <h1 className={styles.title}>Provably fair, seeded by a <span className={styles.signal}>real quantum pulse</span>.</h1>
        <p className={styles.lede}>
          Rank decides which pools you can enter — it never changes your odds. The winner is a pure
          function of a <em>future</em> NIST CURBy pulse and the frozen entry list. Nobody, including us,
          can bias it. Rewards are a verifiable Beacon record, not a payout (non-custodial).
        </p>
      </header>

      {!draw ? (
        <section className={styles.card}>
          <p className={styles.pending}>No draw is live yet — the executor opens the first weekly draw shortly. Check the <Link href="/quantum-core/beacon" className={styles.inlineLink}>Beacon</Link>.</p>
        </section>
      ) : (
        <section className={styles.card}>
          <div className={styles.statusRow}>
            <span className={styles.badge} data-status={draw.status}>{draw.status}</span>
            <span className={styles.drawId}>{draw.id}</span>
            <span className={styles.count}>{draw.participants.length} entered</span>
          </div>

          <div className={styles.grid}>
            <div><span className={styles.k}>window</span><span className={styles.v}>{open ? `closes ${fmt(draw.closesAt)}` : "closed"}</span></div>
            {draw.merkleRoot && <div className={styles.wide}><span className={styles.k}>committed root</span><code className={styles.v}>{draw.merkleRoot}</code></div>}
            {draw.targetAfterIndex !== undefined && <div><span className={styles.k}>targets pulse after index</span><code className={styles.v}>{draw.targetAfterIndex}</code></div>}
            {draw.pulse && <div className={styles.wide}><span className={styles.k}>revealed pulse</span><code className={styles.v}>round {draw.pulse.round} · index {draw.pulse.index} · {draw.pulse.valueHex.slice(0, 48)}…</code></div>}
            {draw.winner && <div className={styles.wide}><span className={styles.k}>winner ✓</span><code className={`${styles.v} ${styles.win}`}>{draw.winner}</code></div>}
          </div>

          <div className={styles.entryZone}>
            <DrawEntry drawId={draw.id} open={!!open} />
          </div>
        </section>
      )}

      <section className={styles.how}>
        <h2 className={styles.h2}>How it stays fair</h2>
        <ol className={styles.steps}>
          <li><strong>Enter</strong> — sign a message with your wallet (proves ownership, moves nothing). Requires a sustained Infected+ balance.</li>
          <li><strong>Freeze &amp; commit</strong> — when the window closes, the entry list is hashed into a Merkle root and published, targeting a <em>future</em> CURBy round that doesn&apos;t exist yet.</li>
          <li><strong>Reveal</strong> — once that quantum pulse is produced, the winner = <code>sha256(pulseValue ‖ merkleRoot) mod poolSize</code>. Published to the Beacon.</li>
          <li><strong>Verify</strong> — anyone can re-fetch the CURBy round and recompute the exact winner. No trust required.</li>
        </ol>
        <div className={styles.cta}>
          <Link href="/quantum-core/beacon" className={styles.btn}>Public Beacon →</Link>
          <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
        </div>
      </section>
    </main>
  );
}
