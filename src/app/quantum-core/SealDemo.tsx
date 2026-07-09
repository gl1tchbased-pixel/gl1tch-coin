"use client";

import { useState } from "react";
import { sealKeypair, seal, unseal, type SealedRecord } from "@/lib/quantum/seal";
import styles from "./quantum.module.css";

/**
 * Live, in-browser proof that Quantum Seal works: a real ML-KEM-768 (FIPS 203)
 * key exchange + AES-256-GCM, running entirely client-side. Nothing is sent to a
 * server — the point is that decryption never leaves the user's device.
 */
export function SealDemo() {
  const [msg, setMsg] = useState("The rug pull happens at midnight. Trust no deployer.");
  const [sealed, setSealed] = useState<SealedRecord | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kp, setKp] = useState<{ publicKey: string; secretKey: string } | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setOpened(null);
    try {
      const keypair = kp ?? sealKeypair();
      if (!kp) setKp(keypair);
      const rec = await seal(keypair.publicKey, msg);
      setSealed(rec);
      const back = await unseal(keypair.secretKey, rec);
      setOpened(back);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "seal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.demo}>
      <label className={styles.demoLabel} htmlFor="seal-input">Your secret</label>
      <textarea
        id="seal-input"
        className={styles.demoInput}
        value={msg}
        maxLength={280}
        onChange={(e) => setMsg(e.target.value)}
        rows={2}
      />
      <button className={styles.demoBtn} onClick={run} disabled={busy || !msg.trim()}>
        {busy ? "Encrypting…" : "Seal & unseal (ML-KEM-768)"}
      </button>
      {err && <p className={styles.demoErr}>{err}</p>}
      {sealed && (
        <div className={styles.demoOut}>
          <div className={styles.demoRow}>
            <span className={styles.demoK}>algorithm</span>
            <code className={styles.demoV}>{sealed.alg}</code>
          </div>
          <div className={styles.demoRow}>
            <span className={styles.demoK}>ciphertext</span>
            <code className={styles.demoV}>{sealed.ciphertext.slice(0, 48)}…</code>
          </div>
          {opened !== null && (
            <div className={styles.demoRow}>
              <span className={styles.demoK}>decrypted ✓</span>
              <code className={`${styles.demoV} ${styles.demoOk}`}>{opened}</code>
            </div>
          )}
        </div>
      )}
      <p className={styles.demoNote}>
        Runs 100% in your browser. The key never leaves this tab; a server compromise never sees plaintext.
      </p>
    </div>
  );
}
