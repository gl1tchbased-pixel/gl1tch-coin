"use client";

import { useMemo } from "react";
import { verifyBeaconChain } from "@/lib/quantum/verify";
import type { BeaconEntry } from "@/lib/quantum/client";
import styles from "./BeaconChainStatus.module.css";

/**
 * In-browser tamper-evidence check for the Beacon. The log is a Twine-style hash
 * chain: each entry's hash links to the previous one. This recomputes the whole
 * chain on the user's device — any edit, deletion, or insertion breaks it. No key,
 * no on-chain transaction: cryptographic tamper-evidence with zero custody.
 */
export function BeaconChainStatus({ entries }: { entries: BeaconEntry[] }) {
  const result = useMemo(() => verifyBeaconChain(entries), [entries]);
  const chained = entries.some((e) => typeof e.hash === "string");

  if (!chained) return null;

  return (
    <div className={styles.box} data-ok={result.ok ? "1" : "0"}>
      <span className={styles.mark}>{result.ok ? "✓" : "✗"}</span>
      <div className={styles.text}>
        <span className={styles.title}>
          {result.ok
            ? `Hash chain intact — ${result.length} entr${result.length === 1 ? "y" : "ies"} verified in your browser`
            : `Chain integrity FAILED at entry ${result.brokenAt} (${result.reason})`}
        </span>
        <span className={styles.sub}>
          Twine-style tamper-evidence: each entry is hash-linked to the previous. Recomputed here on your
          device — no key, no on-chain transaction, zero custody.
        </span>
      </div>
    </div>
  );
}
