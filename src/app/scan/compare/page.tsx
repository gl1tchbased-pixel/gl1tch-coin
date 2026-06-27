import type { Metadata } from "next";
import Link from "next/link";
import { CompareTool } from "@/components/web3/CompareTool";
import styles from "../scan.module.css";

export const metadata: Metadata = {
  title: "Compare two tokens — GL1TCH Scanner",
  description: "Scan two tokens side by side: verdict, score, honeypot, LP lock, mint/freeze, insiders & deployer — and see which is the safer pick. Non-custodial, any chain.",
  alternates: { canonical: "/scan/compare" },
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <span className="t-eyebrow"><span className={styles.pulse} aria-hidden="true" /> GL1TCH Scanner</span>
        <h1 className={styles.title}>Which one&apos;s safer?</h1>
        <p className={styles.sub}>
          Two tokens, side by side — verdict, the degen intel, and the safer pick called straight.
          Paste names or contracts, <em>any chain</em>.
        </p>
      </header>

      <CompareTool initialA={sp.a} initialB={sp.b} />

      <section className={styles.cta} style={{ marginTop: 48 }}>
        <p>Want the full breakdown on one token? Run a single deep scan.</p>
        <div className={styles.ctaRow}>
          <Link href="/scan" className={styles.ctaBtn}>Single scan →</Link>
          <Link href="/ranks" className={styles.ctaAlt}>Holder perks</Link>
        </div>
      </section>
    </main>
  );
}
