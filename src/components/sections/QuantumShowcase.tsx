"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { latestDrand, type DrandPulse } from "@/lib/quantum/drand";
import styles from "./QuantumShowcase.module.css";

/**
 * Homepage CROWN-JEWEL section — the premium flagship showcase for Quantum Core.
 * A live CURBy quantum pulse (fetched client-side, animated) proves the system is
 * alive; the four pillars are presented as a cinematic, honestly-labelled grid.
 */

interface Pulse {
  ready?: boolean;
  round?: number;
  index?: number;
  valueHex?: string;
  verified?: boolean;
}

const PILLARS = [
  { k: "A", name: "Vault", tag: "readiness score", line: "Cryptographic-hygiene score, 0–100.", tech: "hygiene analysis" },
  { k: "B", name: "Draw", tag: "verifiable randomness", line: "Provably-fair draws seeded by a real quantum pulse.", tech: "NIST CURBy" },
  { k: "C", name: "Seal", tag: "post-quantum encryption", line: "Holder data encrypted with ML-KEM-768, today.", tech: "FIPS 203 · ML-KEM" },
  { k: "D", name: "Forge", tag: "quantum-inspired", line: "Combinatorial optimization via QUBO annealing.", tech: "QUBO / annealing" },
];

export function QuantumShowcase() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [drand, setDrand] = useState<DrandPulse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/quantum-core/pulse", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => alive && setPulse(d))
        .catch(() => {});
      // drand is fetched + BLS-verified right here in the browser (CORS-open).
      latestDrand()
        .then((d) => alive && setDrand(d))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const live = pulse?.ready && pulse?.verified;

  return (
    <div className="container">
      <section className={styles.showcase} aria-label="GL1TCH Quantum Core">
        <div className={styles.grid2} aria-hidden="true" />
        <div className={styles.glowA} aria-hidden="true" />
        <div className={styles.glowB} aria-hidden="true" />

        <div className={styles.head}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} data-live={live ? "1" : "0"} />
            GL1TCH Quantum Core · {live ? "live" : "connecting"}
          </span>
          <h2 className={styles.title}>
            Real quantum technology.<br />
            <span className={styles.signal}>Honestly labelled.</span>
          </h2>
          <p className={styles.sub}>
            Four components that actually work today — a readiness Vault, verifiable quantum Draw,
            post-quantum Seal, and quantum-inspired Forge. Holder-gated. Non-custodial. Every claim
            maps to a technology that produces measurable value now.
          </p>
        </div>

        {/* Two independent, live, verifiable randomness sources */}
        <div className={styles.sources}>
          <div className={styles.pulse}>
            <div className={styles.pulseLabel}>
              <span className={styles.pulseDot} data-live={live ? "1" : "0"} />
              CURBy · quantum (Bell-test)
            </div>
            <div className={styles.pulseData}>
              {pulse?.ready ? (
                <>
                  <span className={styles.pulseK}>round</span><b className={styles.pulseV}>{pulse.round}</b>
                  <span className={styles.pulseK}>value</span>
                  <code className={styles.pulseHash}>{(pulse.valueHex ?? "").slice(0, 32)}…</code>
                  <span className={styles.srcTag} data-ok={live ? "1" : "0"}>{live ? "✓ signed" : "…"}</span>
                </>
              ) : (
                <span className={styles.pulseWait}>fetching finalized quantum round…</span>
              )}
            </div>
          </div>
          <div className={styles.pulse}>
            <div className={styles.pulseLabel}>
              <span className={styles.pulseDot} data-live={drand?.verified ? "1" : "0"} />
              drand · threshold-BLS (League of Entropy)
            </div>
            <div className={styles.pulseData}>
              {drand ? (
                <>
                  <span className={styles.pulseK}>round</span><b className={styles.pulseV}>{drand.round}</b>
                  <span className={styles.pulseK}>value</span>
                  <code className={styles.pulseHash}>{drand.randomness.slice(0, 32)}…</code>
                  <span className={styles.srcTag} data-ok={drand.verified ? "1" : "0"}>{drand.verified ? "✓ BLS-verified in your browser" : "unverified"}</span>
                </>
              ) : (
                <span className={styles.pulseWait}>fetching + verifying drand round…</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.pillars}>
          {PILLARS.map((p) => (
            <article key={p.k} className={styles.pillar}>
              <span className={styles.pKey}>{p.k}</span>
              <h3 className={styles.pName}>{p.name}</h3>
              <span className={styles.pTag}>{p.tag}</span>
              <p className={styles.pLine}>{p.line}</p>
              <span className={styles.pTech}>{p.tech}</span>
            </article>
          ))}
        </div>

        <div className={styles.formula}>
          <span className={styles.formulaLabel}>provably fair</span>
          <code>winner = sha256(quantumPulse ‖ merkleRoot) mod entries</code>
        </div>

        <div className={styles.actions}>
          <Link href="/quantum-core" className={styles.primary}>Enter the Quantum Core →</Link>
          <Link href="/quantum-core/draw" className={styles.ghost}>Provably-fair Draw</Link>
          <Link href="/quantum-core/beacon" className={styles.ghost}>Public Beacon</Link>
        </div>
        <p className={styles.foot}>Non-custodial — winners get a verifiable Beacon record, never a payout. Not financial advice.</p>
      </section>
    </div>
  );
}
