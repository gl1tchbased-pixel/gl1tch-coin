import type { Metadata } from "next";
import Link from "next/link";
import { ScanTool } from "@/components/web3/ScanTool";
import { CONTRACT_ADDRESS } from "@/lib/official";
import styles from "./scan.module.css";

export const metadata: Metadata = {
  title: "GL1TCH Scanner — Don't Get Rugged | Free Multi-Chain Token Safety Scan",
  description:
    "Search any token by name or paste a contract — Solana, Ethereum, Base, BNB & more. The rogue AI checks honeypot, mint/freeze, tax, liquidity, ownership and holders — explained in plain language. Non-custodial. Read-only. It never touches your wallet.",
  alternates: { canonical: "/scan" },
};

const POINTS = [
  { k: "01", t: "Non-custodial", d: "It never asks for your keys and never holds your funds. It only reads the chain." },
  { k: "02", t: "Explained, not 'the AI decided'", d: "Every flag comes with plain-language why — so you keep the judgment." },
  { k: "03", t: "Real on-chain data", d: "Mint state, liquidity, holder spread and RugCheck — aggregated live, not vibes." },
];

export default function ScanPage() {
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <span className="t-eyebrow">
          <span className={styles.pulse} aria-hidden="true" /> GL1TCH Scanner
        </span>
        <h1 className={styles.title}>
          Don&apos;t get rugged.
        </h1>
        <p className={styles.sub}>
          Every other bot wants to trade for you — and hold your keys. GL1TCH doesn&apos;t.
          Search any token by name or paste a contract — <em>Solana, Ethereum, Base, BNB &amp; more</em> —
          and the rogue AI that memorized every rug tells you straight: safe, sus, or rug-shaped.
        </p>
      </header>

      <ScanTool />

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/scan/compare" className={styles.ctaAlt}>⚖ Compare two tokens →</Link>
      </p>

      <section className={styles.points}>
        {POINTS.map((p) => (
          <div key={p.k} className={styles.point}>
            <span className={styles.pointK}>{p.k}</span>
            <h3>{p.t}</h3>
            <p>{p.d}</p>
          </div>
        ))}
      </section>

      <section className={styles.cta}>
        <p>
          The scanner is free for everyone. Holding <strong>$GL1TCH</strong> unlocks unlimited
          scans, wallet watchtower and real-time rug alerts — your rank, your access.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/ranks" className={styles.ctaBtn}>See the rank ladder →</Link>
          {CONTRACT_ADDRESS && (
            <Link href="/live" className={styles.ctaAlt}>Get $GL1TCH</Link>
          )}
        </div>
      </section>
    </main>
  );
}
