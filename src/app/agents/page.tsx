import type { Metadata } from "next";
import Link from "next/link";
import { AgentCheck } from "@/components/web3/AgentCheck";
import styles from "./agents.module.css";

export const metadata: Metadata = {
  title: "Agent Trust Layer — GL1TCH",
  description:
    "The trust layer for the AI-agent economy. Autonomous agents transact on-chain, but nobody can verify one is legit, reputable, or safe to let near funds. GL1TCH scores agent wallets — identity + on-chain track record — so you know before you trust.",
  alternates: { canonical: "/agents" },
};

const primitives = [
  { t: "Identity", d: "An agent proves it controls its wallet with a signature — no fund access, just proof it is who it claims. The verification rail we already run for holders, pointed at agents." },
  { t: "Reputation", d: "The Signal Graph already remembers every deployer and outcome we've scanned. An agent wallet linked to flagged tokens or serial-rug behaviour inherits that record — a track record you can't fake." },
  { t: "Guardrail", d: "One call before you transact with, hire, or fund an agent: 'is this safe?' — a plain-English trust verdict powered by our scan engine + the graph." },
];

export default function AgentsPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 900 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
        <span className="t-eyebrow">Agent Trust Layer · v0</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          The trust layer for the <span className={styles.accent}>AI-agent economy</span>.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          Autonomous agents now hold wallets and transact on-chain — but nobody can tell if an
          agent is legit, reputable, or safe to let near funds. That&apos;s the missing layer.
          GL1TCH already built it for tokens; we&apos;re pointing it at agents.
        </p>
      </div>

      {/* The live lookup — real, working v0 */}
      <section className={styles.lookup}>
        <h2 className={styles.lookupTitle}>Check an agent&apos;s trust</h2>
        <p className={styles.lookupSub}>Paste an on-chain agent wallet. Get a trust verdict — identity + deploy track record.</p>
        <AgentCheck />
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Three primitives — already ours</h2>
        <div className={styles.grid}>
          {primitives.map((p) => (
            <div key={p.t} className={styles.card}>
              <h3 className={styles.cardT}>{p.t}</h3>
              <p className={styles.cardD}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.thesis}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>Why this, why us</h2>
          <p className={styles.cardD}>
            The 2026 agent economy&apos;s hardest unsolved problem is <strong>bounded autonomy</strong> —
            letting agents act without making markets opaque or unaccountable. That is a trust,
            identity, and reputation problem. We spent this whole build turning rug detection into
            a reputation graph, a scan engine, and a signature-based identity rail. The same
            primitives, aimed at agents, are a moat: copying us means rebuilding our data.
          </p>
          <p className={styles.cardD}>
            Free to check. Deeper queries, agent registration, and the guardrail API tie to
            holding — usage becomes revenue, revenue funds the token. No points, no airdrop loops.
          </p>
        </div>
      </section>

      <div className={styles.cta}>
        <Link href="/scan" className={styles.ctaGhost}>See the token scanner it grew from →</Link>
        <Link href="/security" className={styles.ctaGhost}>Our security posture ↗</Link>
      </div>
    </main>
  );
}
