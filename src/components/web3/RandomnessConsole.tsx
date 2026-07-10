"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { verifyRandomResult, type FulfilledRecord, type RandomSpec, type VerifyReport } from "@/lib/quantum/random";
import styles from "./RandomnessConsole.module.css";

/**
 * Quantum Randomness console — request holder-gated verifiable RNG (raw numbers OR a
 * provably-fair giveaway/allocation over a named entrant list), watch it commit to a
 * future drand round, reveal, then VERIFY it in your own browser. A request produces a
 * shareable proof link anyone can open + verify. Nothing trusts GL1TCH.
 */

type Kind = "ints" | "shuffle" | "pick" | "allocation";
type ApiRecord = FulfilledRecord & {
  ok?: boolean;
  error?: string;
  availableInMs?: number;
};

const KEY_LS = "gl1tch_api_key";

export function RandomnessConsole({ initialId }: { initialId?: string } = {}) {
  const [apiKey, setApiKey] = useState("");
  const [kind, setKind] = useState<Kind>("allocation");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(5);
  const [n, setN] = useState(50);
  const [k, setK] = useState(5);
  const [entrantsText, setEntrantsText] = useState("");
  const [winners, setWinners] = useState(3);
  const [salt, setSalt] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<ApiRecord | null>(null);
  const [eta, setEta] = useState(0);
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => { if (poll.current) { clearInterval(poll.current); poll.current = null; } }, []);

  const refresh = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/random/${id}`, { cache: "no-store" });
      const data = (await res.json()) as ApiRecord;
      if (data && data.id) {
        setRec(data);
        setEta(Math.ceil((data.availableInMs ?? 0) / 1000));
        if (data.status === "fulfilled" || data.status === "void") stopPoll();
        return data;
      }
    } catch { /* transient — keep polling */ }
    return null;
  }, [stopPoll]);

  // Load a saved key + (if present) a proof id (path prop or ?id= query) → read-only verify.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(KEY_LS) : null;
    if (saved) setApiKey(saved);
    const url = new URL(window.location.href);
    const id = initialId ?? url.searchParams.get("id");
    if (id && /^[0-9a-f]{64}$/.test(id)) {
      setReadOnly(true);
      refresh(id).then((d) => {
        if (d && d.status === "pending") poll.current = setInterval(() => refresh(id), 3000);
      });
    }
  }, [refresh, initialId]);

  useEffect(() => stopPoll, [stopPoll]);

  const buildPayload = (): Record<string, unknown> => {
    if (kind === "allocation") {
      const labels = entrantsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      return { labels, winners, salt: salt.trim() || undefined };
    }
    let spec: RandomSpec;
    if (kind === "ints") spec = { kind: "ints", min, max, count };
    else if (kind === "shuffle") spec = { kind: "shuffle", n };
    else spec = { kind: "pick", n, k };
    return { spec, salt: salt.trim() || undefined };
  };

  async function request() {
    setBusy(true); setErr(null); setRec(null); setReport(null); stopPoll();
    try {
      window.localStorage.setItem(KEY_LS, apiKey.trim());
      const res = await fetch("/api/random/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gl1tch-key": apiKey.trim() },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await res.json()) as ApiRecord;
      if (!res.ok || !data.ok) {
        setErr(data?.error ?? "Request failed. Check your key and inputs.");
        return;
      }
      setRec(data);
      setEta(Math.ceil((data.availableInMs ?? 0) / 1000));
      poll.current = setInterval(() => refresh(data.id), 3000);
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!rec || rec.status !== "pending" || eta <= 0) return;
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 1000);
    return () => clearInterval(t);
  }, [rec, eta]);

  function doVerify() {
    if (rec) setReport(verifyRandomResult(rec));
  }

  const entrantCount = entrantsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).length;
  const specLabel =
    kind === "ints" ? `${count} × int in [${min}, ${max}]`
    : kind === "shuffle" ? `shuffle 0…${n - 1}`
    : kind === "pick" ? `pick ${k} of ${n}`
    : `draw ${winners} of ${entrantCount || "?"}`;

  const shareUrl = rec ? `${typeof window !== "undefined" ? window.location.origin : ""}/quantum-core/random/${rec.id}` : "";
  const isAlloc = rec?.mode === "allocation";

  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <span className={styles.badge}>holder-gated · verifiable</span>
        <span className={styles.title}>{readOnly ? "Randomness proof" : "Quantum Randomness console"}</span>
      </div>

      {!readOnly && (
        <>
          <label className={styles.field}>
            <span className={styles.flabel}>Your $GL1TCH API key</span>
            <input className={styles.input} type="text" placeholder="gk_…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} spellCheck={false} autoComplete="off" />
          </label>
          <p className={styles.hint}>
            No key yet? <Link href="/token" className={styles.link}>Mint one free</Link> with a sustained Infected+ balance — it gates rate, never funds.
          </p>

          <div className={styles.kinds}>
            {(["allocation", "ints", "shuffle", "pick"] as Kind[]).map((kk) => (
              <button key={kk} className={styles.kindBtn} data-active={kind === kk ? "1" : "0"} onClick={() => setKind(kk)} type="button">
                {kk === "allocation" ? "Giveaway / Allocation" : kk === "ints" ? "Random ints" : kk === "shuffle" ? "Shuffle" : "Pick k of n"}
              </button>
            ))}
          </div>

          {kind === "allocation" ? (
            <>
              <label className={styles.field}>
                <span className={styles.flabel}>Entrants — one per line (wallets, handles, emails…)</span>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  placeholder={"alice.sol\nbob.sol\n@carol\n…"}
                  value={entrantsText}
                  onChange={(e) => setEntrantsText(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className={styles.params}>
                <Num label="winners" value={winners} set={setWinners} min={1} max={Math.max(1, entrantCount)} />
                <span className={styles.entrantTally}>{entrantCount} entrants</span>
              </div>
            </>
          ) : (
            <div className={styles.params}>
              {kind === "ints" && (<><Num label="min" value={min} set={setMin} /><Num label="max" value={max} set={setMax} /><Num label="count" value={count} set={setCount} min={1} max={1000} /></>)}
              {kind === "shuffle" && <Num label="n (0…n-1)" value={n} set={setN} min={1} max={100000} />}
              {kind === "pick" && (<><Num label="n" value={n} set={setN} min={1} max={100000} /><Num label="k" value={k} set={setK} min={1} max={n} /></>)}
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.flabel}>Salt / domain tag (optional)</span>
            <input className={styles.input} type="text" placeholder="e.g. mint-round-3" value={salt} onChange={(e) => setSalt(e.target.value)} maxLength={256} />
          </label>

          <button className={styles.btn} onClick={request} disabled={busy || !apiKey.trim() || (kind === "allocation" && entrantCount < 2)} type="button">
            {busy ? "Committing…" : `Request · ${specLabel}`}
          </button>
          {err && <p className={styles.err}>{err}</p>}
        </>
      )}

      {rec && (
        <div className={styles.state}>
          <Row k="request id" v={<code className={styles.mono}>{short(rec.id)}</code>} />
          <Row k="status" v={<span className={styles.status} data-s={rec.status}>{rec.status}</span>} />
          <Row k="seed source" v={<span>drand quicknet · round {rec.targetRound}</span>} />
          {isAlloc && <Row k="entrants" v={<span>{rec.entrants?.length ?? 0} · root <code className={styles.mono}>{short(rec.listRoot ?? "")}</code></span>} />}

          {rec.status === "pending" && (
            <p className={styles.pending}>
              🔒 Committed. The seeding round <b>doesn’t exist yet</b> — that’s the guarantee no one (not even us)
              can bias it. Revealing in ~{eta}s…
            </p>
          )}

          {/* Shareable proof link */}
          {shareUrl && (
            <div className={styles.share}>
              <span className={styles.flabel}>Shareable proof link</span>
              <div className={styles.shareRow}>
                <code className={styles.shareUrl}>{shareUrl}</code>
                <button className={styles.copy} type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? "copied ✓" : "copy"}
                </button>
              </div>
            </div>
          )}

          {rec.status === "fulfilled" && rec.result && (
            <>
              {isAlloc && rec.winners ? (
                <div className={styles.resultBox}>
                  <span className={styles.resultTag}>🏆 winners</span>
                  <ol className={styles.winners}>
                    {rec.winners.map((w, i) => (<li key={i} className={styles.winner}>{w}</li>))}
                  </ol>
                </div>
              ) : (
                <div className={styles.resultBox}>
                  <span className={styles.resultTag}>result</span>
                  <div className={styles.values}>
                    {rec.result.values.slice(0, 200).map((v, i) => (<span key={i} className={styles.chip}>{v}</span>))}
                    {rec.result.values.length > 200 && <span className={styles.more}>+{rec.result.values.length - 200} more</span>}
                  </div>
                </div>
              )}

              {rec.proof && (
                <details className={styles.proof}>
                  <summary>Proof (drand round {rec.proof.round})</summary>
                  <Row k="randomness" v={<code className={styles.mono}>{short(rec.proof.randomness)}</code>} />
                  <Row k="signature" v={<code className={styles.mono}>{short(rec.proof.signature)}</code>} />
                  <Row k="commitment" v={<code className={styles.monoWrap}>{rec.commitmentString}</code>} />
                </details>
              )}

              <button className={styles.verifyBtn} onClick={doVerify} type="button">Verify in your browser (zero-trust)</button>
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
                      ? "✅ Verified on your device — the drand seed is BLS-valid, the entrant list matches its committed root, and the winners re-derive exactly."
                      : "✗ Verification failed — do not trust this result."}
                  </li>
                </ul>
              )}
            </>
          )}

          {readOnly && (
            <p className={styles.hint} style={{ marginTop: "var(--space-4)" }}>
              <Link href="/quantum-core/random" className={styles.link}>Run your own →</Link>
            </p>
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
      <input className={styles.numInput} type="number" value={value} min={min} max={max} onChange={(e) => set(Math.trunc(Number(e.target.value) || 0))} />
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
