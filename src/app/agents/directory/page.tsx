import type { Metadata } from "next";
import Link from "next/link";
import { agentDirectory } from "@/lib/agent-trust";
import styles from "../agents.module.css";

export const metadata: Metadata = {
  title: "Agent Directory — Know Your Agent — GL1TCH",
  description:
    "The public registry of on-chain agents GL1TCH has assessed — verified agents you can trust, and flagged actors caught by the Signal Graph. Know Your Agent (KYA).",
  alternates: { canonical: "/agents/directory" },
};

const LVL: Record<string, { label: string; cls: string }> = {
  trusted: { label: "TRUSTED", cls: "flagOn" },
  neutral: { label: "NEUTRAL", cls: "flagOff" },
  caution: { label: "CAUTION", cls: "flagOff" },
  serial: { label: "SERIAL", cls: "flagOff" },
  watch: { label: "WATCH", cls: "flagOff" },
  unknown: { label: "UNKNOWN", cls: "flagOff" },
};
const short = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export const revalidate = 60;

export default async function AgentDirectoryPage() {
  const { verified, flagged } = await agentDirectory();

  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 820 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Agent Directory · KYA</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          The registry of <span className={styles.accent}>on-chain agents</span>.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 620, margin: "var(--space-4) auto 0" }}>
          Every agent GL1TCH has assessed — the verified ones you can trust, and the flagged
          actors the Signal Graph has caught. Know the good and the bad before you transact.
        </p>
      </div>

      <section className={styles.block}>
        <h2 className={styles.h2}>✓ Verified agents</h2>
        {verified.length === 0 ? (
          <p className={styles.cardD}>
            No agents have registered yet. Be the first — an agent signs to prove ownership and
            appears here. <Link href="/agents">How registration works →</Link>
          </p>
        ) : (
          <div className={styles.rows}>
            {verified.map((a) => (
              <Link key={`${a.chain}:${a.address}`} href={`/agents/${a.chain}-${a.address}`} className={styles.row}>
                <span className={styles.rowName}>{a.label || short(a.address)}</span>
                <span className={styles.rowMeta}>{a.chain} · verified</span>
                <span className={`${styles.rowScore} ${styles.flagOn}`}>{LVL[a.level || "neutral"]?.label} {a.score}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>⚠ Flagged actors</h2>
        {flagged.length === 0 ? (
          <p className={styles.cardD}>
            None flagged yet — the Signal Graph is still accruing. As the hourly Rug Radar sweeps
            fresh tokens, repeat-rug deployers surface here automatically.
          </p>
        ) : (
          <div className={styles.rows}>
            {flagged.map((a) => (
              <Link key={`${a.chain}:${a.address}`} href={`/agents/${a.chain}-${a.address}`} className={styles.row}>
                <span className={styles.rowName}>{short(a.address)}</span>
                <span className={styles.rowMeta}>{a.chain} · {a.tokensSeen} seen</span>
                <span className={`${styles.rowScore} ${styles.flagOff}`}>⚠ {a.flaggedCount} flagged</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className={styles.cta}>
        <Link href="/agents" className={styles.ctaGhost}>← Check an agent</Link>
        <Link href="/agents" className={styles.ctaGhost}>What is Know Your Agent? ↗</Link>
      </div>
    </main>
  );
}
