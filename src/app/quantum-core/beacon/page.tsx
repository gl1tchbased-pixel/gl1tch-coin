import type { Metadata } from "next";
import Link from "next/link";
import { beaconLog } from "@/lib/quantum/client";
import styles from "./beacon.module.css";

export const metadata: Metadata = {
  title: "Quantum Beacon — public draw transparency log | GL1TCH",
  description:
    "The public, gate-free Quantum Beacon: every draw event (opened, committed, revealed) recorded so anyone can independently recompute the winner from the CURBy pulse and the frozen entry list.",
  alternates: { canonical: "/quantum-core/beacon" },
};

export const dynamic = "force-dynamic";

const fmt = (ms: number) => new Date(ms).toUTCString().replace("GMT", "UTC");

function detailLine(event: string, d: Record<string, unknown>): string {
  if (event === "committed") return `merkleRoot ${String(d.merkleRoot).slice(0, 16)}… · pool ${d.poolSize} · targetAfterIndex ${d.targetAfterIndex}`;
  if (event === "revealed") return `winner ${String(d.winner).slice(0, 8)}… · pulse round ${d.pulseRound} (index ${d.pulseIndex})`;
  if (event === "opened") return `closes ${d.closesAt ? fmt(Number(d.closesAt)) : "—"}`;
  if (event === "void") return `voided: ${d.reason ?? "—"}`;
  return "";
}

export default async function BeaconPage() {
  const log = await beaconLog(100);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Beacon · public · gate-free</span>
        <h1 className={styles.title}>Every draw, in the open.</h1>
        <p className={styles.lede}>
          An append-only log of every draw event. Each <strong>revealed</strong> entry publishes the
          CURBy pulse and the frozen Merkle root, so anyone can recompute the winner:
          <code className={styles.formula}>winnerIndex = sha256(pulseValue ‖ merkleRoot) mod poolSize</code>
        </p>
      </header>

      {log.length === 0 ? (
        <p className={styles.empty}>No draw events yet — the first weekly draw opens shortly. Check back.</p>
      ) : (
        <ol className={styles.log}>
          {log.map((e, i) => (
            <li key={`${e.at}-${i}`} className={styles.entry} data-event={e.event}>
              <div className={styles.entryTop}>
                <span className={styles.badge} data-event={e.event}>{e.event}</span>
                <span className={styles.drawId}>{e.drawId}</span>
                <span className={styles.time}>{fmt(e.at)}</span>
              </div>
              <code className={styles.detail}>{detailLine(e.event, e.detail)}</code>
            </li>
          ))}
        </ol>
      )}

      <div className={styles.cta}>
        <Link href="/quantum-core/draw" className={styles.btn}>Current draw →</Link>
        <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
      </div>
    </main>
  );
}
