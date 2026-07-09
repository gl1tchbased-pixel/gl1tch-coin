"use client";

import { useState } from "react";
import { vaultScore, vaultSignalsFromScan, type VaultScore } from "@/lib/quantum/vault";
import styles from "./VaultScanner.module.css";

/**
 * Quantum Vault tool — paste any token, get a quantum-readiness score. Reuses the
 * GL1TCH scanner (/api/scan) and derives the readiness signals from it, so the score
 * rides on the same on-chain intelligence. Measures PREPAREDNESS, not attack risk.
 */

const EXAMPLES = [
  { label: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { label: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
];

interface ScanResp {
  chain?: string;
  verdict?: string;
  score?: number;
  checks?: { key: string; status: string }[];
  meta?: Record<string, unknown>;
  error?: string;
}

export function VaultScanner() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ vault: VaultScore; verdict?: string; chain?: string } | null>(null);

  async function scan(addr?: string) {
    const token = (addr ?? input).trim();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch(`/api/scan?mint=${encodeURIComponent(token)}`);
      const data = (await res.json()) as ScanResp;
      if (!res.ok || data.error) {
        setErr(data.error ?? "Scan failed — check the token address.");
        return;
      }
      const signals = vaultSignalsFromScan(data);
      setResult({ vault: vaultScore(signals), verdict: data.verdict, chain: data.chain });
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.tool}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          placeholder="Token address (Solana mint or 0x…)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
        />
        <button className={styles.btn} onClick={() => scan()} disabled={busy || !input.trim()}>
          {busy ? "Scanning…" : "Score readiness"}
        </button>
      </div>
      <div className={styles.examples}>
        <span className={styles.exLabel}>try:</span>
        {EXAMPLES.map((e) => (
          <button key={e.mint} className={styles.chip} onClick={() => { setInput(e.mint); scan(e.mint); }} disabled={busy}>
            {e.label}
          </button>
        ))}
      </div>

      {err && <p className={styles.err}>{err}</p>}

      {result && (
        <div className={styles.result}>
          <div className={styles.scoreWrap} data-level={result.vault.level}>
            <div className={styles.scoreNum}>{result.vault.score}</div>
            <div className={styles.scoreMeta}>
              <span className={styles.level} data-level={result.vault.level}>{result.vault.level}</span>
              <span className={styles.scoreCap}>quantum readiness / 100</span>
              {result.verdict && <span className={styles.verdict}>scanner verdict: {result.verdict}</span>}
            </div>
          </div>
          <ul className={styles.factors}>
            {result.vault.factors.map((f) => (
              <li key={f.key} className={styles.factor}>
                <div className={styles.factorTop}>
                  <span className={styles.factorKey}>{f.key}</span>
                  <span className={styles.factorPts}>{f.points}/{f.max}</span>
                </div>
                <div className={styles.bar}><span style={{ width: `${(f.points / f.max) * 100}%` }} /></div>
                <span className={styles.factorNote}>{f.note}</span>
              </li>
            ))}
          </ul>
          <p className={styles.foot}>Readiness = cryptographic hygiene, not a live attack probability. Not financial advice.</p>
        </div>
      )}
    </div>
  );
}
