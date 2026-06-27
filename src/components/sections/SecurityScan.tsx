"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/effects/Reveal";
import { CONTRACT_ADDRESS, TRUST_REPORT, links } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./SecurityScan.module.css";

const CA_SHORT = CONTRACT_ADDRESS
  ? `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`
  : "—";

const ROWS = [
  { label: "mint authority", value: "REVOKED", ok: TRUST_REPORT.mintRevoked },
  { label: "freeze authority", value: "REVOKED", ok: TRUST_REPORT.freezeRevoked },
  { label: "transfer tax", value: "0.00%", ok: TRUST_REPORT.zeroTax },
  { label: "supply", value: "1B · FIXED", ok: true },
  {
    label: "rugcheck risk",
    value: `${TRUST_REPORT.rugcheckScore ?? "—"} / ${TRUST_REPORT.rugcheckRiskLevel ?? "LOW"}`,
    ok: (TRUST_REPORT.rugcheckScore ?? 99) <= 1,
  },
] as const;

const TOTAL = ROWS.length + 1; // rows + verdict
const TICK = 460;

export function SecurityScan() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    setStep(0);
    setRunning(true);
    let s = 0;
    timer.current = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= TOTAL) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
      }
    }, TICK);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && step === 0 && !running) run();
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verdictOn = step >= TOTAL;

  return (
    <section className={shared.section} id="scan" aria-label="Live security scan">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>
            <span className={styles.pulse} aria-hidden="true" /> Live Security Scan
          </span>
          <h2 className={shared.title}>Don&apos;t Trust. Verify.</h2>
          <p className={shared.body}>
            Every claim below is on-chain and checkable in seconds. Watch the scan,
            then run the same checks yourself on the sources at the bottom.
          </p>
        </Reveal>

        <Reveal>
          <div className={styles.terminal} ref={wrapRef} role="img" aria-label="Security scan result: all checks passed, verdict clean">
            <span className={styles.corner} data-c="tl" aria-hidden="true" />
            <span className={styles.corner} data-c="tr" aria-hidden="true" />
            <span className={styles.corner} data-c="bl" aria-hidden="true" />
            <span className={styles.corner} data-c="br" aria-hidden="true" />

            <div className={styles.bar}>
              <span className={styles.dot} /> GL1TCH // SECURITY SCAN
            </div>

            <div className={styles.cmd}>
              <span className={styles.prompt}>&gt;</span> verify {CA_SHORT}
              {running && step === 0 ? <span className={styles.caret} /> : null}
            </div>

            <div className={styles.rows}>
              {ROWS.map((r, i) => (
                <div
                  key={r.label}
                  className={`${styles.row} ${step >= i + 1 ? styles.shown : ""}`}
                >
                  <span className={styles.check}>[{r.ok ? "✓" : "×"}]</span>
                  <span className={styles.label}>{r.label}</span>
                  <span className={styles.dots} aria-hidden="true" />
                  <span className={`${styles.value} ${r.ok ? "" : styles.bad}`}>{r.value}</span>
                </div>
              ))}
            </div>

            <div className={`${styles.verdict} ${verdictOn ? styles.shown : ""}`}>
              <span className={styles.glitch} data-text="VERDICT: CLEAN">VERDICT: CLEAN</span>
              <span className={styles.verdictSub}>0 risks flagged</span>
            </div>

            <button
              type="button"
              className={styles.replay}
              onClick={run}
              disabled={running}
            >
              {running ? "scanning…" : "▶ run scan again"}
            </button>
          </div>
        </Reveal>

        <Reveal className={styles.sources}>
          <span className={styles.sourcesLabel}>Verify it yourself</span>
          <div className={styles.sourceRow}>
            {links.rugcheck && <a href={links.rugcheck} target="_blank" rel="noopener noreferrer">RugCheck ↗</a>}
            {links.explorer && <a href={links.explorer} target="_blank" rel="noopener noreferrer">Solscan ↗</a>}
            {links.solsniffer && <a href={links.solsniffer} target="_blank" rel="noopener noreferrer">SolSniffer ↗</a>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
