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

      <section className={styles.why}>
        <h2 className={styles.h2}>How it works, and where it wins</h2>
        <ul className={styles.list}>
          <li><strong>QUBO / Ising.</strong> Your items + cap become an energy landscape where the best subset is the lowest-energy state — the universal language of quantum optimization.</li>
          <li><strong>Simulated annealing.</strong> A solver inspired by quantum/thermal tunnelling explores that landscape and settles into a near-optimal answer. Deterministic (seeded), so results are reproducible.</li>
          <li><strong>Where it wins.</strong> Genuinely multi-constraint, combinatorial problems — not simple sorts. A plain classical solver can beat it on well-structured cases; we say so.</li>
          <li><strong>Future-ready.</strong> Because the problem is already in QUBO form, the same input could later be sent to real quantum hardware and compared — no rewrite.</li>
        </ul>
        <p className={styles.note}>Quantum-inspired, on classical hardware — not a quantum computer, and not investment advice.</p>
      </section>

      <div className={styles.cta}>
        <Link href="/quantum-core" className={styles.btn}>← Quantum Core</Link>
        <Link href="/quantum-core/seal" className={styles.btn}>Quantum Seal →</Link>
      </div>
    </main>
  );
}
