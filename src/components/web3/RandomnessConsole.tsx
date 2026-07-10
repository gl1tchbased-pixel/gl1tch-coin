"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { verifyRandomResult, type FulfilledRecord, type RandomSpec, type VerifyReport } from "@/lib/quantum/random";
import styles from "./RandomnessConsole.module.css";

/**
 * Quantum Randomness console — request holder-gated verifiable RNG, watch it commit to a
 * future drand round, then reveal, then VERIFY it in your own browser (BLS-check the seed
 * + re-derive the output). Nothing trusts GL1TCH; the proof is checked on your device.
 */

type Kind = "ints" | "shuffle" | "pick";
type ApiRecord = FulfilledRecord & {
  ok?: boolean;
  error?: string;
  availableInMs?: number;
  recipe?: string;
  source?: string;
};

const KEY_LS = "gl1tch_api_key";

export function RandomnessConsole() {
  const [apiKey, setApiKey] = useState("");
  const [kind, setKind] = useState<Kind>("ints");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(5);
  const [n, setN] = useState(50);
  const [k, setK] = useState(5);
  const [salt, setSalt] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<ApiRecord | null>(null);
  const [eta, setEta] = useState(0);
  const [report, setReport] = useState<VerifyReport | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(KEY_LS) : null;
    if (saved) setApiKey(saved);
  }, []);

  const buildSpec = (): RandomSpec => {
    if (kind === "ints") return { kind: "ints", min, max, count };
    if (kind === "shuffle") return { kind: "shuffle", n };
    return { kind: "pick", n, k };
  };

  const stopPoll = () => { if (poll.current) { clearInterval(poll.current); poll.current = null; } };
  useEffect(() => stopPoll, []);

  const refresh = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/random/${id}`, { cache: "no-store" });
      const data = (await res.json()) as ApiRecord;
      if (data && data.id) {
        setRec(data);
        setEta(Math.ceil((data.availableInMs ?? 0) / 1000));
        if (data.status === "fulfilled" || data.status === "void") stopPoll();
      }
    } catch { /* transient — keep polling */ }
  }, []);

  async function request() {
    setBusy(true); setErr(null); setRec(null); setReport(null); stopPoll();
    try {
      window.localStorage.setItem(KEY_LS, apiKey.trim());
      const res = await fetch("/api/random/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gl1tch-key": apiKey.trim() },
        body: JSON.stringify({ spec: buildSpec(), salt: salt.trim() || undefined }),
      });
      const data = (await res.json()) as ApiRecord;
      if (!res.ok || !data.ok) {
        setErr(data?.error ?? "Request failed. Check your key and inputs.");
        return;
      }
      setRec(data);
      setEta(Math.ceil((data.availableInMs ?? 0) / 1000));
      // Poll for the reveal (the bot reveals on target-round maturity).
      poll.current = setInterval(() => refresh(data.id), 3000);
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  // Local ETA countdown (visual only; real reveal is gated by the drand round).
  useEffect(() => {
    if (!rec || rec.status !== "pending" || eta <= 0) return;
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 1000);
    return () => clearInterval(t);
  }, [rec, eta]);

  function doVerify() {
    if (!rec) return;
    setReport(verifyRandomResult(rec));
  }

  const specLabel = kind === "ints" ? `${count} × int in [${min}, ${max}]` : kind === "shuffle" ? `shuffle 0…${n - 1}` : `pick ${k} of ${n}`;

  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <span className={styles.badge}>holder-gated · verifiable</span>
        <span className={styles.title}>Quantum Randomness console</span>
      </div>

      {/* API key */}
      <label className={styles.field}>
        <span className={styles.flabel}>Your $GL1TCH API key</span>
        <input
          className={styles.input}
          type="text"
          placeholder="gk_…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <p className={styles.hint}>
        No key yet? <Link href="/token" className={styles.link}>Mint one free</Link> with a sustained Infected+ balance — it gates rate, never funds.
      </p>

      {/* Spec builder */}
      <div className={styles.kinds}>
        {(["ints", "shuffle", "pick"] as Kind[]).map((kk) => (
          <button key={kk} className={styles.kindBtn} data-active={kind === kk ? "1" : "0"} onClick={() => setKind(kk)} type="button">
            {kk === "ints" ? "Random ints" : kk === "shuffle" ? "Shuffle" : "Pick k of n"}
          </button>
        ))}
      </div>

      <div className={styles.params}>
        {kind === "ints" && (
          <>
            <Num label="min" value={min} set={setMin} />
            <Num label="max" value={max} set={setMax} />
            <Num label="count" value={count} set={setCount} min={1} max={1000} />
          </>
        )}
        {kind === "shuffle" && <Num label="n (0…n-1)" value={n} set={setN} min={1} max={100000} />}
        {kind === "pick" && (
          <>
            <Num label="n" value={n} set={setN} min={1} max={100000} />
            <Num label="k" value={k} set={setK} min={1} max={n} />
          </>
        )}
      </div>

      <label className={styles.field}>
        <span className={styles.flabel}>Salt / domain tag (optional)</span>
        <input className={styles.input} type="text" placeholder="e.g. mint-round-3" value={salt} onChange={(e) => setSalt(e.target.value)} maxLength={256} />
      </label>

      <button className={styles.btn} onClick={request} disabled={busy || !apiKey.trim()} type="button">
        {busy ? "Committing…" : `Request randomness · ${specLabel}`}
      </button>
      {err && <p className={styles.err}>{err}</p>}

      {/* Live state */}
      {rec && (
        <div className={styles.state}>
          <Row k="request id" v={<code className={styles.mono}>{short(rec.id)}</code>} />
          <Row k="status" v={<span className={styles.status} data-s={rec.status}>{rec.status}</span>} />
          <Row k="seed source" v={<span>drand quicknet · round {rec.targetRound}</span>} />
          {rec.status === "pending" && (
            <p className={styles.pending}>
              🔒 Committed. The seeding round <b>doesn’t exist yet</b> — that’s the guarantee no one (not even us)
              can bias it. Revealing in ~{eta}s…
            </p>
          )}

          {rec.status === "fulfilled" && rec.result && (
            <>
              <div className={styles.resultBox}>
                <span className={styles.resultTag}>result</span>
                <div className={styles.values}>
                  {rec.result.values.slice(0, 200).map((v, i) => (
                    <span key={i} className={styles.chip}>{v}</span>
                  ))}
                  {rec.result.values.length > 200 && <span className={styles.more}>+{rec.result.values.length - 200} more</span>}
                </div>
              </div>

              {rec.proof && (
                <details className={styles.proof}>
                  <summary>Proof (drand round {rec.proof.round})</summary>
                  <Row k="randomness" v={<code className={styles.mono}>{short(rec.proof.randomness)}</code>} />
                  <Row k="signature" v={<code className={styles.mono}>{short(rec.proof.signature)}</code>} />
                  <Row k="commitment" v={<code className={styles.monoWrap}>{rec.commitmentString}</code>} />
                </details>
              )}

              <button className={styles.verifyBtn} onClick={doVerify} type="button">
                Verify in your browser (zero-trust)
              </button>
              {report && (
                <ul className={styles.checks}>
                  {report.checks.map((c) => (
                    <li key={c.label} className={styles.check} data-ok={c.ok ? "1" : "0"}>
                      <span className={styles.mark}>{c.ok ? "✓" : "✗"}</span>
                      <span className={styles.clabel}>{c.label}</span>
                      {c.detail && <code className={styles.cdetail}>{c.detail}</code>}
                    </li>
                  ))}
                  <li className={styles.verdict} data-ok={report.ok ? "1" : "0"}>
                    {report.ok
                      ? "✅ Verified on your device — the drand seed is BLS-valid and the output re-derives exactly."
                      : "✗ Verification failed — do not trust this result."}
                  </li>
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Num({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <label className={styles.num}>
      <span className={styles.numLabel}>{label}</span>
      <input
        className={styles.numInput}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => set(Math.trunc(Number(e.target.value) || 0))}
      />
    </label>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className={styles.srow}>
      <span className={styles.sk}>{k}</span>
      <span className={styles.sv}>{v}</span>
    </div>
  );
}

const short = (s: string) => (s.length > 20 ? `${s.slice(0, 10)}…${s.slice(-8)}` : s);
