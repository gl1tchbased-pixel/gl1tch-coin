import type { Metadata } from "next";
import Link from "next/link";
import { latestPulse } from "@/lib/quantum/curby";
import { SealDemo } from "./SealDemo";
import styles from "./quantum.module.css";

export const metadata: Metadata = {
  title: "GL1TCH Quantum Core — real quantum tech, holder-gated",
  description:
    "Four working quantum components: Vault (readiness score), Draw (NIST CURBy verifiable quantum randomness), Seal (post-quantum ML-KEM encryption), Forge (quantum-inspired optimization). Honestly labelled, GL1TCH-holder-gated.",
  alternates: { canonical: "/quantum-core" },
};

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    key: "A",
    name: "Quantum Vault",
    tag: "readiness score",
    body: "A 0–100 quantum-readiness score from cryptographic-hygiene signals — authority, custody, deployer track record, verification, transparency. Measures preparedness, not a live attack probability.",
    real: "Cryptography hygiene analysis",
  },
  {
    key: "B",
    name: "Quantum Draw",
    tag: "verifiable randomness",
    body: "Fair draws seeded by real quantum randomness from NIST CURBy — a Bell-test beacon. Commit-reveal: the participant list is frozen and committed before the pulse exists, so no one can game the outcome. Anyone can recompute the winner.",
    real: "NIST CURBy — certified quantum beacon",
  },
  {
    key: "C",
    name: "Quantum Seal",
    tag: "post-quantum encryption",
    body: "Holder data encrypted with ML-KEM-768 (FIPS 203) + AES-256-GCM — real post-quantum cryptography, today. Decryption is client-side, so a server compromise never sees plaintext.",
    real: "NIST ML-KEM (Kyber), @noble/post-quantum",
  },
  {
    key: "D",
    name: "Quantum Forge",
    tag: "quantum-inspired optimization",
    body: "Combinatorial optimization via simulated annealing over QUBO/Ising — quantum-inspired, running on classical hardware. Not a quantum computer; honestly labelled, and useful only on genuinely multi-constraint problems.",
    real: "Quantum-inspired (QUBO / simulated annealing)",
  },
];

const TIERS = [
  { name: "Infected", amt: "100K+", gets: "Draw entry · Vault base score" },
  { name: "Signal Bearer", amt: "1M+", gets: "+ Seal archive · Forge tool · Draw history" },
  { name: "Core Node", amt: "5M+", gets: "+ Compare · report export · multi-constraint Forge" },
  { name: "Ghost Node", amt: "10M+", gets: "+ API keys · priority pools · Forge API" },
];

export default async function QuantumCorePage() {
  const pulse = await latestPulse();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Core · holder-gated</span>
        <h1 className={styles.title}>
          Real quantum tech — <span className={styles.signal}>honestly labelled</span>.
        </h1>
        <p className={styles.lede}>
          Four components that actually work today: a readiness <strong>Vault</strong>, verifiable
          quantum <strong>Draw</strong> (NIST CURBy), post-quantum <strong>Seal</strong> (ML-KEM), and
          quantum-inspired <strong>Forge</strong>. No hand-waving — every claim maps to a technology
          that produces measurable value now, labelled exactly for what it is.
        </p>
      </header>

      <section className={styles.pulseCard} aria-label="Live quantum pulse">
        <div className={styles.pulseHead}>
          <span className={styles.pulseDot} data-live={pulse?.verified ? "1" : "0"} />
          <span className={styles.pulseTitle}>Live CURBy quantum pulse</span>
          <a className={styles.pulseSrc} href="https://random.colorado.edu" target="_blank" rel="noreferrer">
            random.colorado.edu ↗
          </a>
        </div>
        {pulse ? (
          <div className={styles.pulseGrid}>
            <div><span className={styles.pk}>round</span><code className={styles.pv}>{pulse.round}</code></div>
            <div><span className={styles.pk}>index</span><code className={styles.pv}>{pulse.index}</code></div>
            <div><span className={styles.pk}>timestamp</span><code className={styles.pv}>{pulse.timestamp}</code></div>
            <div className={styles.pulseWide}><span className={styles.pk}>value (SHA-512)</span><code className={styles.pv}>{pulse.valueHex.slice(0, 64)}…</code></div>
            <div className={styles.pulseWide}><span className={styles.pk}>signed / verified</span><code className={styles.pv}>{pulse.verified ? "✓ signed, finalized round" : "pending finalization"}</code></div>
          </div>
        ) : (
          <p className={styles.pulsePending}>Current round is still being finalized — a draw would defer, never use a stale value.</p>
        )}
      </section>

      <section className={styles.pillars}>
        {PILLARS.map((p) => (
          <article key={p.key} className={styles.pillar}>
            <div className={styles.pillarTop}>
              <span className={styles.pillarKey}>{p.key}</span>
              <div>
                <h2 className={styles.pillarName}>{p.name}</h2>
                <span className={styles.pillarTag}>{p.tag}</span>
              </div>
            </div>
            <p className={styles.pillarBody}>{p.body}</p>
            <p className={styles.pillarReal}>Real tech: {p.real}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Try it — live, in your browser</span>
        <h2 className={styles.h2}>Quantum Seal (post-quantum encryption)</h2>
        <p className={styles.body}>
          Real ML-KEM-768. Encrypt a note to a freshly-generated post-quantum keypair and decrypt it
          back — all client-side, nothing sent anywhere.
        </p>
        <SealDemo />
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Access</span>
        <h2 className={styles.h2}>Gated by sustained $GL1TCH holding.</h2>
        <p className={styles.body}>
          Every function re-verifies a 7-day average balance server-side (Proof-of-Signal) — a flash-buy
          doesn&apos;t unlock anything. Rank decides which pools you may enter; it never changes your odds
          in a Draw.
        </p>
        <div className={styles.matrix}>
          {TIERS.map((t) => (
            <div key={t.name} className={styles.tier}>
              <div className={styles.tierName}>{t.name}</div>
              <div className={styles.tierAmt}>{t.amt}</div>
              <div className={styles.tierGets}>{t.gets}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Honesty</span>
        <h2 className={styles.h2}>What is and isn&apos;t live.</h2>
        <ul className={styles.honestyList}>
          <li><strong>Live now:</strong> Vault scoring, the CURBy quantum pulse, Seal (ML-KEM) in your browser, and the Forge optimizer — all real and testable.</li>
          <li><strong>Next:</strong> the full commit-reveal Draw executor + public Beacon log (the transparency ledger), scheduled server-side so no user can influence timing.</li>
          <li><strong>Deliberately deferred (founder-gated + audited):</strong> any SOL reward pool or on-chain NFT. GL1TCH is a reputation &amp; provenance signal — <em>never</em> key custody. Phase-1 winners get a verifiable Beacon record, not a payout.</li>
          <li>Forge is quantum-<em>inspired</em>, not a quantum computer. It is not investment advice. Not financial advice.</li>
        </ul>
        <div className={styles.ctaRow}>
          <Link href="/scan" className={styles.ctaBtn}>Token scanner →</Link>
          <Link href="/agents" className={styles.ctaBtn}>Know Your Agent →</Link>
          <Link href="/network" className={styles.ctaBtn}>Network stats →</Link>
        </div>
      </section>
    </main>
  );
}
