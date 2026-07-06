import Link from "next/link";
import styles from "./AgentBanner.module.css";

/**
 * Homepage flagship banner — surfaces the premium Agent Trust Layer (Know Your Agent) to the
 * highest-traffic page, so investors and dev visitors meet our most differentiated card first,
 * without disrupting the meme-brand hero above it.
 */
export function AgentBanner() {
  return (
    <div className="container">
      <section className={styles.banner} aria-label="Agent Trust Layer">
        <div className={styles.left}>
          <span className={styles.tag}>NEW · FLAGSHIP</span>
          <h2 className={styles.title}>
            Know Your Agent — the trust layer for the <span className={styles.signal}>AI-agent economy</span>.
          </h2>
          <p className={styles.sub}>
            AI agents now hold wallets and trade on-chain. GL1TCH verifies any agent&apos;s identity,
            provenance &amp; reputation — free, one call. The same data engine that scans rugs, pointed
            at agents.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/agents" className={styles.primary}>Know Your Agent →</Link>
          <Link href="/thesis" className={styles.ghost}>Read the thesis</Link>
        </div>
      </section>
    </div>
  );
}
