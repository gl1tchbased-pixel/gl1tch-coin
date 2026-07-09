"use client";

import { useState } from "react";
import styles from "./ForgeTool.module.css";

/**
 * Quantum Forge tool — a quantum-inspired subset optimizer. You define items with a
 * "value" and a hard count cap; Forge (QUBO / simulated annealing on the server) picks
 * the best subset. NOT investment advice — a constraint solver over YOUR numbers.
 */

interface Row { label: string; score: string }

const DEFAULT: Row[] = [
  { label: "Position A", score: "10" },
  { label: "Position B", score: "6" },
  { label: "Position C", score: "9" },
  { label: "Position D", score: "3" },
  { label: "Position E", score: "8" },
];

export function ForgeTool() {
  const [rows, setRows] = useState<Row[]>(DEFAULT);
  const [cap, setCap] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ chosen: number[]; total: number } | null>(null);

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const addRow = () => setRows((r) => (r.length < 24 ? [...r, { label: `Position ${String.fromCharCode(65 + r.length)}`, score: "5" }] : r));
  const delRow = (i: number) => setRows((r) => (r.length > 2 ? r.filter((_, j) => j !== i) : r));

  async function optimize() {
    const scores = rows.map((r) => Number(r.score));
    if (scores.some((n) => !Number.isFinite(n))) { setErr("Every value must be a number."); return; }
    if (cap < 1 || cap > rows.length) { setErr("Cap must be between 1 and the number of items."); return; }
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch("/api/quantum-core/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, maxCount: cap, seed: 7 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setErr(data.error ?? "Optimization failed."); return; }
      setResult({ chosen: data.chosen ?? [], total: data.total ?? 0 });
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = new Set(result?.chosen ?? []);

  return (
    <div className={styles.tool}>
      <div className={styles.rows}>
        {rows.map((row, i) => (
          <div key={i} className={`${styles.row} ${chosen.has(i) ? styles.picked : ""}`}>
            <input className={styles.label} value={row.label} onChange={(e) => setRow(i, { label: e.target.value })} aria-label={`item ${i + 1} label`} />
            <input className={styles.score} type="number" value={row.score} onChange={(e) => setRow(i, { score: e.target.value })} aria-label={`item ${i + 1} value`} />
            <button className={styles.del} onClick={() => delRow(i)} aria-label="remove" disabled={rows.length <= 2}>✕</button>
            {chosen.has(i) && <span className={styles.pick}>✓ chosen</span>}
          </div>
        ))}
      </div>
      <button className={styles.add} onClick={addRow} disabled={rows.length >= 24}>+ add item</button>

      <div className={styles.controls}>
        <label className={styles.capLabel}>
          keep at most
          <input className={styles.cap} type="number" min={1} max={rows.length} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
          of {rows.length}
        </label>
        <button className={styles.optimize} onClick={optimize} disabled={busy}>
          {busy ? "Optimizing…" : "Optimize (quantum-inspired)"}
        </button>
      </div>

      {err && <p className={styles.err}>{err}</p>}
      {result && (
        <div className={styles.result}>
          <span className={styles.resTotal}>total value: <b>{result.total}</b></span>
          <span className={styles.resChosen}>{result.chosen.length} of {rows.length} selected · QUBO / simulated annealing</span>
        </div>
      )}
      <p className={styles.foot}>Runs a QUBO / simulated-annealing solver on the server. Not investment advice — it solves the constraints you define.</p>
    </div>
  );
}
