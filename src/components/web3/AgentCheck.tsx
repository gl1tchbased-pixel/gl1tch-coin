"use client";

import { useState } from "react";
import styles from "./AgentCheck.module.css";

interface Assessment {
  address: string;
  chain: string;
  score: number;
  level: "unknown" | "caution" | "neutral" | "trusted";
  reasons: string[];
  registered: boolean;
  verified: boolean;
}

const LEVEL_META: Record<string, { label: string; cls: string; icon: string }> = {
  trusted: { label: "TRUSTED", cls: "lvlTrusted", icon: "✓" },
  neutral: { label: "NEUTRAL", cls: "lvlNeutral", icon: "○" },
  caution: { label: "CAUTION", cls: "lvlCaution", icon: "⚠" },
  unknown: { label: "UNKNOWN", cls: "lvlUnknown", icon: "?" },
};

export function AgentCheck() {
  const [addr, setAddr] = useState("");
  const [chain, setChain] = useState("solana");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Assessment | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const a = addr.trim();
    if (!a) return;
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const r = await fetch(`/api/agent/check?address=${encodeURIComponent(a)}&chain=${encodeURIComponent(chain)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "check failed");
      setData(j as Assessment);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "check failed");
    } finally {
      setLoading(false);
    }
  }

  const meta = data ? LEVEL_META[data.level] : null;

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={run}>
        <input
          className={styles.input}
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="Paste an agent wallet address…"
          spellCheck={false}
          aria-label="Agent wallet address"
        />
        <select className={styles.select} value={chain} onChange={(e) => setChain(e.target.value)} aria-label="Chain">
          <option value="solana">Solana</option>
          <option value="ethereum">Ethereum</option>
          <option value="base">Base</option>
          <option value="bsc">BSC</option>
        </select>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check trust"}
        </button>
      </form>

      {err && <p className={styles.err}>{err}</p>}

      {data && meta && (
        <div className={`${styles.result} ${styles[meta.cls]}`}>
          <div className={styles.head}>
            <span className={styles.badge}>{meta.icon} {meta.label}</span>
            <span className={styles.score}>{data.score}<small>/100</small></span>
          </div>
          <div className={styles.flags}>
            <span className={data.verified ? styles.on : styles.off}>{data.verified ? "✓ identity verified" : "identity unverified"}</span>
            <span className={data.registered ? styles.on : styles.off}>{data.registered ? "✓ registered" : "not registered"}</span>
          </div>
          <ul className={styles.reasons}>
            {data.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className={styles.foot}>Trust signal from GL1TCH — identity + on-chain deploy track record (Signal Graph). Not financial advice.</p>
        </div>
      )}
    </div>
  );
}
