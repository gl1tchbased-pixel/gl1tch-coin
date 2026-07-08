import type { Metadata } from "next";
import Link from "next/link";
import { networkMetrics } from "@/lib/network";
import styles from "./network.module.css";

export const metadata: Metadata = {
  title: "The GL1TCH Risk Intelligence Network — live traction",
  description:
    "GL1TCH is crypto risk-intelligence infrastructure: a multi-chain safety scanner + the Signal Graph (a growing deployer-reputation database) + a Know Your Agent trust layer. Live numbers — tokens scanned, deployers mapped, rugs caught, agents assessed.",
  alternates: { canonical: "/network" },
};

export const revalidate = 60;
const n = (x: number | undefined) => (typeof x === "number" ? x.toLocaleString("en-US") : "—");

export default async function NetworkPage() {
  const m = await networkMetrics();

  const stats = [
    { v: n(m?.scans.total), l: "tokens scanned", s: "across Solana + EVM chains" },
    { v: n(m?.signalGraph.deployers), l: "deployers mapped", s: "the Signal Graph — our moat" },
    { v: n(m?.scans.flagged), l: "rugs flagged", s: "high-risk / rug-shaped verdicts" },
    { v: n(m?.signalGraph.flaggedActors), l: "flagged actors", s: "deployers with flagged tokens" },
    { v: n(m?.agents.registered), l: "agents assessed", s: "Know Your Agent registry" },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Risk Intelligence Network · live</span>
        <h1 className={styles.title}>
          Not a memecoin — <span className={styles.signal}>crypto risk-intelligence infrastructure</span>.
        </h1>
        <p className={styles.lede}>
          A multi-chain safety scanner, the <strong>Signal Graph</strong> (a growing deployer-reputation
          database — the same class of entity-relationship intelligence that is the moat in this
          sector), and a <strong>Know Your Agent</strong> trust layer. One risk-data engine, two markets:
          transaction-guardrail for wallets &amp; dapps, and reputation scoring for AI agents.
        </p>
      </header>

      <section className={styles.statBand}>
        {stats.map((s) => (
          <div key={s.l} className={styles.stat}>
            <div className={styles.statV}>{s.v}</div>
            <div className={styles.statL}>{s.l}</div>
            <div className={styles.statS}>{s.s}</div>
          </div>
        ))}
        <p className={styles.live}>
          {m ? "● live — updates continuously" : "○ metrics temporarily unavailable"}
          {m?.at ? ` · as of ${new Date(m.at).toUTCString().replace("GMT", "UTC")}` : ""}
        </p>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>The moat</span>
        <h2 className={styles.h2}>Intelligence that compounds.</h2>
        <p className={styles.body}>
          Every scan — from the website, the Telegram bot, or the hourly Rug Radar — is remembered
          against the wallet that deployed the token. The Signal Graph gets denser and sharper with
          use: a repeat rugger is flagged on its next launch, before it has a chart. That accumulated,
          cross-scan reputation data is the defensible asset — the leaders in on-chain security
          (Chainalysis, TRM, Blockaid) win on exactly this class of graph intelligence, not on any
          single check.
        </p>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>The API</span>
        <h2 className={styles.h2}>Risk data, one call.</h2>
        <p className={styles.body}>
          The same engine is a public API. Wallets and dapps use it as a pre-transaction guardrail;
          agent frameworks use it to score counterparties before delegating funds. Free to start.
        </p>
        <div className={styles.apiRow}>
          <Link href="/agents/docs" className={styles.apiBtn}>Agent trust API →</Link>
          <Link href="/scan" className={styles.apiBtn}>Token risk scanner →</Link>
          <a href="/llms.txt" className={styles.apiBtn}>Machine-readable /llms.txt ↗</a>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Honest</span>
        <h2 className={styles.h2}>Early, and building in the open.</h2>
        <p className={styles.body}>
          These numbers are small and growing — we publish them because a serious project shows its
          traction, not just its slogans. The token is a utility for access and reputation, not a
          speculation vehicle. GL1TCH is a reputation &amp; provenance signal, never key custody. Not
          financial advice.
        </p>
        <div className={styles.apiRow}>
          <Link href="/thesis" className={styles.apiBtn}>Read the thesis →</Link>
          <Link href="/agents" className={styles.apiBtn}>Know Your Agent →</Link>
        </div>
      </section>
    </main>
  );
}
