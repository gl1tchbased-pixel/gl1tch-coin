"use client";

import { useState } from "react";
import { verifyDrawIndependently, fetchCurbyRound, type DrawVerification } from "@/lib/quantum/verify";
import type { Draw } from "@/lib/quantum/client";
import styles from "./DrawVerifier.module.css";

/**
 * Zero-trust, in-browser draw verifier. For a revealed draw it re-fetches the
 * CURBy round directly from random.colorado.edu (CORS-open) and recomputes the
 * winner from first principles — the user never has to trust GL1TCH.
 */
export function DrawVerifier({ draw }: { draw: Draw }) {
  const [result, setResult] = useState<DrawVerification | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<string | null>(null);

  const revealed = draw.status === "revealed";

  async function verify() {
    setBusy(true);
    try {
      setResult(await verifyDrawIndependently(draw));
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setProbe(null);
    try {
      const target = (draw.targetAfterIndex ?? 0) + 1;
      const r = await fetchCurbyRound(draw.pulse?.index ?? target);
      setProbe(
        r
          ? `✓ Reached CURBy directly from your browser — round ${r.round}, index ${r.index}. When this draw reveals, the winner will recompute from exactly this source.`
          : "Couldn’t reach CURBy right now — try again in a moment."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <span className={styles.badge}>zero-trust</span>
        <span className={styles.title}>Verify it yourself — in your browser</span>
      </div>

      {revealed ? (
        <>
          <p className={styles.copy}>
            This re-fetches the CURBy quantum round straight from random.colorado.edu and recomputes
            the winner. Nothing here trusts GL1TCH — the math is done on your device.
          </p>
          <button className={styles.btn} onClick={verify} disabled={busy}>
            {busy ? "Verifying…" : "Independently verify this draw"}
          </button>
          {result && (
            <ul className={styles.checks}>
              {result.checks.map((c) => (
                <li key={c.key} className={styles.check} data-ok={c.ok ? "1" : "0"}>
                  <span className={styles.mark}>{c.ok ? "✓" : "✗"}</span>
                  <span className={styles.label}>{c.label}</span>
                  <code className={styles.detail}>{c.detail}</code>
                </li>
              ))}
              <li className={styles.verdict} data-ok={result.verified ? "1" : "0"}>
                {result.verified
                  ? "✅ Verified independently — the winner is provably correct."
                  : "✗ Verification did not pass — do not trust this result."}
              </li>
            </ul>
          )}
        </>
      ) : (
        <>
          <p className={styles.copy}>
            This draw hasn’t been revealed yet. When it is, you’ll recompute the winner here from the
            live CURBy pulse — zero trust in GL1TCH. Test the connection now:
          </p>
          <button className={styles.btn} onClick={testConnection} disabled={busy}>
            {busy ? "Contacting CURBy…" : "Test the CURBy connection"}
          </button>
          {probe && <p className={styles.probe}>{probe}</p>}
        </>
      )}
    </div>
  );
}
