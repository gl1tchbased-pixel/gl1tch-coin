"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResult } from "@/lib/scan";
import { CHAIN_LABEL } from "@/lib/scan-multichain";
import { fmtPrice, fmtUsd } from "@/lib/market";
import styles from "./CompareTool.module.css";

const TONE: Record<string, string> = {
  CLEAN: styles.vClean, "LOW RISK": styles.vLow, CAUTION: styles.vCaution,
  "HIGH RISK": styles.vHigh, "RUG-SHAPED": styles.vRug, UNKNOWN: styles.vUnknown,
};
const RANK: Record<string, number> = { CLEAN: 5, "LOW RISK": 4, CAUTION: 3, "HIGH RISK": 2, "RUG-SHAPED": 1, UNKNOWN: 0 };
const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const chainName = (c: string) => CHAIN_LABEL[c] || c.charAt(0).toUpperCase() + c.slice(1);
const ICON: Record<string, string> = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };
// the checks worth comparing head-to-head
const KEY = ["honeypot", "lp_lock", "mint_authority", "freeze_authority", "insiders", "deployer", "liquidity", "concentration"];

async function resolve(q: string): Promise<ScanResult | null> {
  const t = q.trim();
  if (!t) return null;
  try {
    if (isAddress(t)) {
      const r = await fetch(`/api/scan?mint=${encodeURIComponent(t)}`);
      const d = await r.json();
      return d?.verdict ? d : null;
    }
    const s = await (await fetch(`/api/scan?q=${encodeURIComponent(t)}`)).json();
    const top = (s.candidates || [])[0];
    if (!top) return null;
    const d = await (await fetch(`/api/scan?mint=${top.address}&chain=${top.chain}`)).json();
    return d?.verdict ? d : null;
  } catch { return null; }
}

function Column({ r }: { r: ScanResult | null }) {
  if (!r) return <div className={styles.col}><div className={styles.empty}>no result</div></div>;
  return (
    <div className={styles.col}>
      <div className={styles.colHead}>
        <div className={styles.sym}>{r.symbol ? `$${r.symbol}` : r.name || "token"}{r.verified ? <span className={styles.verified}>✓</span> : null}</div>
        <div className={styles.chain}>{chainName(r.chain)}</div>
      </div>
      <div className={`${styles.verdict} ${TONE[r.verdict] || styles.vUnknown}`}>{r.verdict}<span className={styles.score}>{r.score}/100</span></div>
      <div className={styles.metaLine}>{fmtPrice(r.meta.priceUsd)} · mcap {fmtUsd(r.meta.marketCap)} · liq {fmtUsd(r.meta.liquidityUsd)}</div>
      <div className={styles.checks}>
        {KEY.map((k) => { const c = r.checks.find((x) => x.key === k); if (!c) return null; return (
          <div key={k} className={`${styles.check} ${styles["s_" + c.status]}`}>
            <span className={styles.ci}>{ICON[c.status]}</span><span className={styles.cl}>{c.label}</span><span className={styles.cv}>{c.value}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

export function CompareTool({ initialA, initialB }: { initialA?: string; initialB?: string } = {}) {
  const [a, setA] = useState(initialA || "");
  const [b, setB] = useState(initialB || "");
  const [ra, setRa] = useState<ScanResult | null>(null);
  const [rb, setRb] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const didInit = useRef(false);

  const run = useCallback(async (qa: string, qb: string) => {
    if (!qa.trim() || !qb.trim()) return;
    setLoading(true); setDone(false); setRa(null); setRb(null);
    const [x, y] = await Promise.all([resolve(qa), resolve(qb)]);
    setRa(x); setRb(y); setLoading(false); setDone(true);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("a", qa); u.searchParams.set("b", qb);
      window.history.replaceState(null, "", u.toString());
    }
  }, []);

  useEffect(() => {
    if (didInit.current) return; didInit.current = true;
    if (initialA && initialB) run(initialA, initialB);
  }, [initialA, initialB, run]);

  const winner = ra && rb ? (
    (ra.verified !== rb.verified) ? (ra.verified ? "a" : "b")
      : (RANK[ra.verdict] !== RANK[rb.verdict]) ? (RANK[ra.verdict] > RANK[rb.verdict] ? "a" : "b")
        : (ra.score === rb.score ? "tie" : ra.score > rb.score ? "a" : "b")
  ) : null;

  return (
    <div className={styles.tool}>
      <form className={styles.inputs} onSubmit={(e) => { e.preventDefault(); run(a, b); }}>
        <input className={styles.input} value={a} onChange={(e) => setA(e.target.value)} placeholder="token A — name or contract" spellCheck={false} />
        <span className={styles.vs}>VS</span>
        <input className={styles.input} value={b} onChange={(e) => setB(e.target.value)} placeholder="token B — name or contract" spellCheck={false} />
        <button className={styles.btn} type="submit" disabled={loading || !a.trim() || !b.trim()}>{loading ? "scanning…" : "COMPARE"}</button>
      </form>

      {done && (ra || rb) && (
        <>
          {winner && winner !== "tie" && (ra && rb) && (
            <div className={styles.winner}>
              Safer pick: <strong>{(winner === "a" ? ra : rb).symbol ? `$${(winner === "a" ? ra : rb).symbol}` : "token " + winner.toUpperCase()}</strong> — {(winner === "a" ? ra : rb).verdict} {(winner === "a" ? ra : rb).score}/100
            </div>
          )}
          {winner === "tie" && <div className={styles.winner}>Dead heat — both score the same. Read the checks.</div>}
          <div className={styles.grid}>
            <Column r={ra} />
            <Column r={rb} />
          </div>
          <p className={styles.disc}>GL1TCH read both on-chain. Not financial advice.</p>
        </>
      )}
    </div>
  );
}
