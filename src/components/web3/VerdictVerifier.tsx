"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ATTESTER_WALLET, OFFICIAL } from "@/lib/official";
import { parseProofFile, verifyEntry, type ProofEntry, type Verification } from "@/lib/attest/verify";
import styles from "./VerdictVerifier.module.css";

/**
 * Zero-trust verdict verifier (A3). Fetches a token's sealed verdicts, then on the visitor's device recomputes each
 * Merkle proof and reads the seal straight from a Solana RPC of their choice. GL1TCH's servers only carry data
 * here; every check that matters runs in the browser.
 */

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const SPEC_URL = `${OFFICIAL.GITHUB_URL}/blob/main/docs/verdict-anchoring.md`;

type Row = { entry: ProofEntry; result: Verification | null };
type View = { status: "idle" | "loading" | "done" | "error"; error?: string; rows: Row[] };

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;
const utc = (ms: number) => new Date(ms).toUTCString().replace(" GMT", " UTC");

function tone(verdict: string): "good" | "warn" | "bad" | "ok" {
  if (verdict === "RUG-SHAPED" || verdict === "HIGH RISK") return "bad";
  if (verdict === "CAUTION") return "warn";
  if (verdict === "CLEAN" || verdict === "LOW RISK") return "good";
  return "ok";
}

async function verifyRows(entries: ProofEntry[], rpcUrl: string, update: (v: View) => void): Promise<void> {
  let rows: Row[] = entries.map((entry) => ({ entry, result: null }));
  update({ status: entries.length ? "loading" : "done", rows });
  for (let i = 0; i < entries.length; i++) {
    const result = await verifyEntry(entries[i], { attester: ATTESTER_WALLET, rpcUrl });
    rows = rows.map((r, j) => (j === i ? { ...r, result } : r));
    update({ status: i === entries.length - 1 ? "done" : "loading", rows });
  }
}

async function lookupAndVerify(chain: string, mint: string, rpcUrl: string, update: (v: View) => void): Promise<void> {
  let entries: ProofEntry[];
  try {
    const r = await fetch(`/api/attest/proof?chain=${encodeURIComponent(chain)}&mint=${encodeURIComponent(mint)}`);
    const j = (await r.json()) as { ok?: boolean; error?: string; proofs?: unknown[] };
    if (!r.ok || !j.ok) return update({ status: "error", error: j.error ?? "lookup failed", rows: [] });
    entries = (j.proofs ?? []).map((p) => parseProofFile(JSON.stringify(p))).filter((e): e is ProofEntry => !!e);
  } catch {
    return update({ status: "error", error: "the proof service isn't reachable right now", rows: [] });
  }
  await verifyRows(entries, rpcUrl, update);
}

function download(entry: ProofEntry) {
  const blob = new Blob([JSON.stringify({ spec: SPEC_URL, ...entry }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gl1tch-proof-${entry.record.mint.slice(0, 8)}-${entry.sweepMs}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function VerdictVerifier({ initialMint = "", initialChain = "solana" }: { initialMint?: string; initialChain?: string }) {
  const [mint, setMint] = useState(initialMint);
  const [rpc, setRpc] = useState(DEFAULT_RPC);
  const [pasted, setPasted] = useState("");
  const [view, setView] = useState<View>({ status: initialMint ? "loading" : "idle", rows: [] });

  useEffect(() => {
    if (!initialMint) return;
    let alive = true;
    void lookupAndVerify(initialChain, initialMint, DEFAULT_RPC, (v) => alive && setView(v));
    return () => {
      alive = false;
    };
  }, [initialMint, initialChain]);

  function onLookup(e: FormEvent) {
    e.preventDefault();
    const m = mint.trim();
    if (!m) return;
    setView({ status: "loading", rows: [] });
    window.history.replaceState(null, "", `?mint=${encodeURIComponent(m)}`);
    void lookupAndVerify(initialChain, m, rpc.trim() || DEFAULT_RPC, setView);
  }

  function onPasted(e: FormEvent) {
    e.preventDefault();
    const entry = parseProofFile(pasted);
    if (!entry) return setView({ status: "error", error: "that isn't a GL1TCH proof file", rows: [] });
    void verifyRows([entry], rpc.trim() || DEFAULT_RPC, setView);
  }

  const busy = view.status === "loading";

  return (
    <div className={styles.wrap}>
      {!ATTESTER_WALLET && (
        <p className={styles.notice}>
          On-chain sealing goes live soon. Until the attester&apos;s address is published here, this page checks each
          verdict&apos;s Merkle proof; the Solana seal check switches on with it.
        </p>
      )}

      <form className={styles.form} onSubmit={onLookup}>
        <label className={styles.label} htmlFor="vs-mint">
          Token address
        </label>
        <div className={styles.row}>
          <input
            id="vs-mint"
            className={styles.input}
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="Solana token address from the Rug Radar"
            spellCheck={false}
            autoComplete="off"
          />
          <button className={styles.btn} type="submit" disabled={busy || !mint.trim()}>
            {busy ? "Verifying…" : "Verify"}
          </button>
        </div>
        <details className={styles.advanced}>
          <summary>Use your own Solana RPC</summary>
          <input
            className={styles.input}
            value={rpc}
            onChange={(e) => setRpc(e.target.value)}
            aria-label="Solana RPC URL"
            spellCheck={false}
          />
          <p className={styles.hint}>The seal is read from this node, straight from your browser. Default: Solana&apos;s public mainnet RPC.</p>
        </details>
      </form>

      <div aria-live="polite">
        {view.status === "error" && <p className={styles.error}>{view.error}</p>}
        {view.status === "done" && view.rows.length === 0 && (
          <p className={styles.hint}>
            No recorded verdicts for this token. Only tokens the Rug Radar has swept are recorded.
          </p>
        )}
        {view.rows.map(({ entry, result }) => {
          const t = tone(entry.record.verdict);
          return (
            <article key={`${entry.root}-${entry.record.mint}`} className={styles.card}>
              <header className={styles.cardHead}>
                <span className={`${styles.verdict} ${styles[`v_${t}`]}`}>{entry.record.verdict}</span>
                <span className={styles.score}>{entry.record.score}/100</span>
                <span className={styles.meta}>
                  {short(entry.record.mint)} · scanned {utc(entry.record.scannedAt)}
                </span>
              </header>
              {!result ? (
                <p className={styles.hint}>Checking on your device…</p>
              ) : (
                <>
                  <ul className={styles.checks}>
                    {result.checks.map((c) => {
                      const waiting = !c.ok && c.key === "sealed" && result.pendingSeal;
                      return (
                        <li key={c.key} className={styles.check} data-ok={c.ok ? "1" : waiting ? "p" : "0"}>
                          <span className={styles.mark}>{c.ok ? "✓" : waiting ? "…" : "✗"}</span>
                          <span className={styles.checkLabel}>{c.label}</span>
                          <code className={styles.detail}>{c.detail}</code>
                        </li>
                      );
                    })}
                  </ul>
                  <p className={styles.result} data-ok={result.verified ? "1" : result.pendingSeal ? "p" : "0"}>
                    {result.verified
                      ? "✅ Verified on your device: GL1TCH recorded this verdict at that time, and it hasn't changed since."
                      : result.pendingSeal
                        ? "The proof checks out. The Solana seal isn't there yet."
                        : "✗ This record did not verify. Don't rely on it."}
                  </p>
                </>
              )}
              <div className={styles.actions}>
                <button type="button" className={styles.link} onClick={() => download(entry)}>
                  Download proof
                </button>
                {entry.anchor && (
                  <a className={styles.link} href={`https://explorer.solana.com/tx/${entry.anchor.sig}`} target="_blank" rel="noopener noreferrer">
                    Seal on Solana Explorer ↗
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <form className={styles.paste} onSubmit={onPasted}>
        <label className={styles.label} htmlFor="vs-paste">
          Verify a saved proof file (works even if GL1TCH is offline)
        </label>
        <textarea
          id="vs-paste"
          className={styles.textarea}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder='{"record": {...}, "proof": [...], "root": "...", "anchor": {...}}'
          spellCheck={false}
          rows={4}
        />
        <button className={styles.btn} type="submit" disabled={busy || !pasted.trim()}>
          Verify this file
        </button>
      </form>

      <p className={styles.hint}>
        How it works, and how to check it without this page:{" "}
        <a className={styles.inline} href={SPEC_URL} target="_blank" rel="noopener noreferrer">
          the verdict-anchoring spec ↗
        </a>
      </p>
    </div>
  );
}
