import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL } from "@/lib/scan";
import styles from "./learn.module.css";

export const metadata: Metadata = {
  title: "Learn — Crypto Safety Guides (Rug Pulls, Honeypots) | GL1TCH",
  description:
    "Free, plain-English guides to crypto safety: how to spot a rug pull, what a honeypot is, and how to check if any token is safe before you buy. Then scan any token for free.",
  alternates: { canonical: "/learn" },
};

const guides = [
  { href: "/learn/how-to-spot-a-rug-pull", t: "How to spot a rug pull", d: "The 7 on-chain red flags every rug leaves behind — and how to check them in a minute." },
  { href: "/learn/what-is-a-honeypot", t: "What is a honeypot?", d: "The scam that lets you buy but not sell — how it works and how to detect one for free." },
  { href: "/learn/how-to-check-if-a-token-is-safe", t: "How to check if a token is safe", d: "An 8-point on-chain checklist to verify any token before you buy, on any chain." },
];

export default function LearnPage() {
  const popular = CANONICAL.filter((t) => t.symbol).slice(0, 10);
  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-10)", maxWidth: 680, marginInline: "auto" }}>
        <span className="t-eyebrow">Learn</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>Don&apos;t get rugged. Learn the signs.</h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", marginTop: "var(--space-4)" }}>
          Plain-English guides to reading a token before you buy — then a free, non-custodial
          scanner to check any of them in seconds.
        </p>
      </div>

      <div className={styles.grid}>
        {guides.map((g) => (
          <Link key={g.href} href={g.href} className={styles.card}>
            <h2 className={styles.cardTitle}>{g.t}</h2>
            <p className={styles.cardDesc}>{g.d}</p>
            <span className={styles.cardCta}>Read the guide →</span>
          </Link>
        ))}
      </div>

      <section className={styles.popular}>
        <h2 className={styles.popularH}>Check a popular token</h2>
        <div className={styles.chips}>
          {popular.map((t) => (
            <Link key={`${t.chain}-${t.address}`} href={`/scan/${t.chain}-${t.address}`} className={styles.chip}>
              Is ${t.symbol} safe?
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.cta}>
        <Link href="/scan" className={styles.ctaBtn}>Scan any token — free →</Link>
      </div>
    </main>
  );
}
