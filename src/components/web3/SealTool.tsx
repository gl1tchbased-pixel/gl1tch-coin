"use client";

import { useState } from "react";
import { sealKeypair, seal, unseal, type SealedRecord } from "@/lib/quantum/seal";
import styles from "./SealTool.module.css";

/**
 * Quantum Seal — premium, step-by-step, in-browser proof of HYBRID post-quantum
 * encryption. X25519 (classical ECDH) + ML-KEM-768 (FIPS 203) shared secrets are
 * combined via HKDF to key AES-256-GCM, all client-side. Proves security tangibly:
 * a DIFFERENT key cannot decrypt (AEAD authentication fails).
 */

interface Steps {
  keypair: { publicKey: string; secretKey: string };
  sealed: SealedRecord;
  opened: string;
  wrongKeyFailed: boolean;
}

const short = (s: string, n = 44) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function SealTool() {
  const [msg, setMsg] = useState("The rug pull happens at midnight. Trust no deployer.");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [steps, setSteps] = useState<Steps | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setSteps(null);
    try {
      const keypair = sealKeypair();
      const sealed = await seal(keypair.publicKey, msg);
      const opened = await unseal(keypair.secretKey, sealed);
      // Prove it's secure: a different keypair must NOT be able to decrypt.
      const attacker = sealKeypair();
      let wrongKeyFailed = false;
      try {
        await unseal(attacker.secretKey, sealed);
      } catch {
        wrongKeyFailed = true;
      }
      setSteps({ keypair, sealed, opened, wrongKeyFailed });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "seal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.tool}>
      <label className={styles.label} htmlFor="seal-input">Your secret</label>
      <textarea
        id="seal-input"
        className={styles.input}
        value={msg}
        maxLength={280}
        onChange={(e) => setMsg(e.target.value)}
        rows={2}
      />
      <button className={styles.btn} onClick={run} disabled={busy || !msg.trim()}>
        {busy ? "Encrypting…" : "Generate keypair & encrypt (X25519 + ML-KEM-768)"}
      </button>
      {err && <p className={styles.err}>{err}</p>}

      {steps && (
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.num}>1</span>
            <div className={styles.body}>
              <span className={styles.stepTitle}>Fresh hybrid keypair — X25519 + ML-KEM-768</span>
              <div className={styles.kv}><span>public key</span><code>{short(steps.keypair.publicKey)}</code></div>
              <div className={styles.kv}><span>secret key</span><code className={styles.secret}>{short(steps.keypair.secretKey)}</code></div>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.num}>2</span>
            <div className={styles.body}>
              <span className={styles.stepTitle}>Two legs → HKDF → AES-256-GCM</span>
              <div className={styles.kv}><span>classical (X25519)</span><code>{short(steps.sealed.ephPub)}</code></div>
              <div className={styles.kv}><span>post-quantum (ML-KEM)</span><code>{short(steps.sealed.kemCt)}</code></div>
              <div className={styles.kv}><span>ciphertext</span><code>{short(steps.sealed.ciphertext)}</code></div>
              <div className={styles.kv}><span>algorithm</span><code>{steps.sealed.alg}</code></div>
            </div>
          </li>
          <li className={styles.step}>
            <span className={`${styles.num} ${styles.ok}`}>✓</span>
            <div className={styles.body}>
              <span className={styles.stepTitle}>Decrypted with the right key</span>
              <div className={styles.kv}><span>plaintext</span><code className={styles.good}>{steps.opened}</code></div>
            </div>
          </li>
          <li className={styles.step}>
            <span className={`${styles.num} ${steps.wrongKeyFailed ? styles.ok : styles.bad}`}>{steps.wrongKeyFailed ? "🛡" : "✗"}</span>
            <div className={styles.body}>
              <span className={styles.stepTitle}>A different key cannot decrypt</span>
              <div className={styles.kv}>
                <span>attacker</span>
                <code className={steps.wrongKeyFailed ? styles.good : styles.badText}>
                  {steps.wrongKeyFailed ? "rejected — AEAD authentication failed ✓" : "unexpectedly succeeded"}
                </code>
              </div>
            </div>
          </li>
        </ol>
      )}
      <p className={styles.note}>
        Hybrid X25519 + ML-KEM-768 — the same defense-in-depth scheme now in TLS 1.3 (Chrome,
        Cloudflare). An attacker must break BOTH classical <em>and</em> post-quantum crypto. Runs
        100% in your browser; the secret key never leaves this tab.
      </p>
    </div>
  );
}
