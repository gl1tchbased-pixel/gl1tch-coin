import type { Metadata } from "next";
import Link from "next/link";
import { VaultScanner } from "@/components/web3/VaultScanner";
import styles from "./vault.module.css";

export const metadata: Metadata = {
  title: "Quantum Vault — token quantum-readiness score | GL1TCH",
  description:
    "Paste any token and get a 0–100 quantum-readiness score: authority hygiene, custody, deployer track record, verification, transparency. Measures preparedness, not attack risk. Free.",
  alternates: { canonical: "/quantum-core/vault" },
};

export default function VaultPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Vault · readiness score</span>
        <h1 className={styles.title}>How <span className={styles.signal}>quantum-ready</span> is a token?</h1>
        <p className={styles.lede}>
          A 0–100 score from five cryptographic-hygiene signals — authority, custody, deployer track
          record, verification, transparency — derived from the GL1TCH scanner. It measures
          <strong> preparedness</strong>, not a live attack probability.
        </p>
      </header>

      <section className={styles.card}>
        <VaultScanner />
      </section>

      <div className={styles.cta}>
        <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
        <Link href="/scan" className={styles.btn}>Full token scan →</Link>
      </div>
    </main>
  );
}
