import type { Metadata } from "next";
import Link from "next/link";
import { SealTool } from "@/components/web3/SealTool";
import styles from "./seal.module.css";

export const metadata: Metadata = {
  title: "Quantum Seal — hybrid post-quantum encryption | GL1TCH",
  description:
    "Encrypt in your browser with a hybrid of X25519 + ML-KEM-768 (FIPS 203) + AES-256-GCM — the same defense-in-depth now in TLS 1.3. Watch each step, and see a wrong key get rejected. Nothing leaves your tab.",
  alternates: { canonical: "/quantum-core/seal" },
};

export default function SealPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Seal · hybrid post-quantum</span>
        <h1 className={styles.title}>Encrypt for <span className={styles.signal}>the quantum era</span> — in your browser.</h1>
        <p className={styles.lede}>
          A live, step-by-step proof of hybrid <strong>X25519 + ML-KEM-768</strong> encryption. Two
          shared secrets — one classical, one post-quantum — are combined via HKDF to key AES-256-GCM.
          An attacker has to break <strong>both</strong>. It all runs on your device; nothing is sent
          anywhere.
        </p>
      </header>

      <section className={styles.card}>
        <SealTool />
      </section>

      <section className={styles.why}>
        <h2 className={styles.h2}>Why hybrid, and what you gain</h2>
        <ul className={styles.list}>
          <li><strong>Harvest-now-decrypt-later is real.</strong> Data you encrypt today can be stored and cracked once quantum computers mature. ML-KEM-768 (NIST FIPS 203) closes that door now.</li>
          <li><strong>Defense in depth.</strong> The classical X25519 leg means even a flaw in the newer post-quantum scheme can&apos;t expose you — and vice-versa. This exact hybrid ships in TLS 1.3 (Chrome, Cloudflare, AWS).</li>
          <li><strong>Client-side only.</strong> The secret key is generated and used in your tab. A server compromise never sees plaintext.</li>
          <li><strong>No home-grown crypto.</strong> Built on the audited <code>@noble</code> libraries — we don&apos;t roll our own primitives.</li>
        </ul>
      </section>

      <div className={styles.cta}>
        <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
        <Link href="/quantum-core/vault" className={styles.btn}>Score a token →</Link>
      </div>
    </main>
  );
}
