"use client";

import { useMemo, useState } from "react";
import { IntentLink } from "@/components/ui/IntentLink";
import styles from "@/app/yield/yield.module.css";
import { pct, usd } from "@/lib/yield/format";
import type { YieldRow } from "@/lib/yield/view";

type SortKey = "risk" | "tvl" | "apy";
const RISK_LABEL = { low: "Low", moderate: "Moderate", elevated: "Elevated", high: "High" } as const;

/** Filterable Yield X-Ray table. Default order is lowest risk first — never "biggest number first". */
export function YieldTable({ rows }: { rows: YieldRow[] }) {
  const chains = useMemo(() => [...new Map(rows.map((r) => [r.chain, r.chainLabel])).entries()], [rows]);
  const kinds = useMemo(() => [...new Map(rows.map((r) => [r.kind, r.kindLabel])).entries()], [rows]);
  const [chain, setChain] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [stableOnly, setStableOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("risk");

  const shown = useMemo(() => {
    const list = rows.filter((r) => (!chain || r.chain === chain) && (!kind || r.kind === kind) && (!stableOnly || r.stable));
    const by: Record<SortKey, (a: YieldRow, b: YieldRow) => number> = {
      risk: (a, b) => a.riskScore - b.riskScore || (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0),
      tvl: (a, b) => (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1),
      apy: (a, b) => (b.apy ?? -Infinity) - (a.apy ?? -Infinity),
    };
    return [...list].sort(by[sort]);
  }, [rows, chain, kind, stableOnly, sort]);

  return (
    <div>
      <div className={styles.filters} role="group" aria-label="Filters">
        <button type="button" className={styles.chip} aria-pressed={chain === null} onClick={() => setChain(null)}>All chains</button>
        {chains.map(([id, label]) => (
          <button key={id} type="button" className={styles.chip} aria-pressed={chain === id} onClick={() => setChain(chain === id ? null : id)}>{label}</button>
        ))}
      </div>
      <div className={styles.filters} role="group" aria-label="Type">
        <button type="button" className={styles.chip} aria-pressed={kind === null} onClick={() => setKind(null)}>All types</button>
        {kinds.map(([id, label]) => (
          <button key={id} type="button" className={styles.chip} aria-pressed={kind === id} onClick={() => setKind(kind === id ? null : id)}>{label}</button>
        ))}
        <button type="button" className={styles.chip} aria-pressed={stableOnly} onClick={() => setStableOnly(!stableOnly)}>Stablecoins only</button>
        <label className={styles.sort}>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="risk">Risk (lowest first)</option>
            <option value="tvl">Size</option>
            <option value="apy">APY</option>
          </select>
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Opportunity</th>
              <th scope="col">Chain</th>
              <th scope="col">APY</th>
              <th scope="col">Deposits</th>
              <th scope="col">Risk</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  <IntentLink href={`/yield/${r.id}`}>{r.name}</IntentLink>
                  {r.stale && <span className={styles.stale}>stale</span>}
                  <div className={styles.dim}>{r.protocolName} · {r.kindLabel}</div>
                </td>
                <td>{r.chainLabel}</td>
                <td className={styles.num}>
                  {r.apy == null ? <span className={styles.dim}>measuring…</span> : pct(r.apy)}
                  {r.apy != null && r.window && <div className={styles.dim}>{r.kind === "dex-lp" ? "fee APR · " : ""}{r.window}</div>}
                </td>
                <td className={styles.num}>{usd(r.tvlUsd)}</td>
                <td>
                  <span className={`${styles.pill} ${styles[r.riskLevel]}`}>{RISK_LABEL[r.riskLevel]} · {r.riskScore}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className={styles.empty}>Nothing matches these filters.</div>}
      </div>
    </div>
  );
}
