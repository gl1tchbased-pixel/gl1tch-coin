import type { Metadata } from "next";
import Link from "next/link";
import { ForgeTool } from "@/components/web3/ForgeTool";
import styles from "./forge.module.css";

export const metadata: Metadata = {
  title: "Quantum Forge — quantum-inspired optimizer | GL1TCH",
  description:
    "A quantum-inspired subset optimizer (QUBO / simulated annealing). Define items with a value and a hard cap; Forge picks the best subset. Quantum-inspired, not a quantum computer. Not investment advice.",
  alternates: { canonical: "/quantum-core/forge" },
};

export default function ForgePage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Forge · quantum-inspired</span>
        <h1 className={styles.title}>Optimize under <span className={styles.signal}>your</span> constraints.</h1>
        <p className={styles.lede}>
          Give each item a value and set a hard cap. Forge maps it to a QUBO/Ising problem and solves
          it with simulated annealing — quantum-<em>inspired</em>, on classical hardware. It is
          <strong> not</strong> a quantum computer and <strong>not</strong> investment advice; it solves
          the constraints you define.
        </p>
      </header>

      <section className={styles.card}>
        <ForgeTool />
      </section>

      <div className={styles.cta}>
        <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
      </div>
    </main>
  );
}
