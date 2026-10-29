import styles from "@/app/yield/yield.module.css";
import type { YieldOpportunity } from "@/lib/yield/types";

/** "Don't trust, verify": the exact public JSON-RPC request behind the number, and the raw values GL1TCH read. */
export function VerifyBlock({ o }: { o: YieldOpportunity }) {
  const curl = `curl -s ${o.verify.rpc} -X POST -H 'content-type: application/json' --data '${o.verify.body}'`;
  return (
    <div>
      <p className={styles.p}>Paste this into a terminal. It asks a public node for the same value GL1TCH used. No account, no key, no wallet.</p>
      <pre className={styles.pre}>{curl}</pre>
      <p className={styles.p}>{o.verify.read}</p>
      <details>
        <summary className={styles.dim} style={{ cursor: "pointer" }}>Raw inputs GL1TCH read</summary>
        <dl className={styles.kv} style={{ marginTop: "var(--space-3)" }}>
          {Object.entries(o.inputs).map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
