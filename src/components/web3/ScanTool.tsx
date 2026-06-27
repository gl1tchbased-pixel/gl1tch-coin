"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResult, ScanCheck } from "@/lib/scan";
import type { TokenCandidate } from "@/lib/scan-multichain";
import { CHAIN_LABEL } from "@/lib/scan-multichain";
import { fmtPrice } from "@/lib/market";
import styles from "./ScanTool.module.css";

const VERDICT_TONE: Record<string, string> = {
  CLEAN: styles.vClean, "LOW RISK": styles.vLow, CAUTION: styles.vCaution,
  "HIGH RISK": styles.vHigh, "RUG-SHAPED": styles.vRug, UNKNOWN: styles.vUnknown,
};
const STATUS_ICON: Record<ScanCheck["status"], string> = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };
const chainName = (c: string) => CHAIN_LABEL[c] || c.charAt(0).toUpperCase() + c.slice(1);

const fmtUsd = (v: number | null) =>
  v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;

const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

const EXAMPLES = [
  { label: "$GL1TCH", q: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump" },
  { label: "BONK", q: "bonk" },
  { label: "PEPE (eth)", q: "pepe" },
];

export function ScanTool({ initialAddress, initialChain }: { initialAddress?: string; initialChain?: string } = {}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "scanning" | "done" | "error">("idle");
  const [candidates, setCandidates] = useState<TokenCandidate[] | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const didInit = useRef(false);

  const scanAddress = useCallback(async (addr: string, chain?: string) => {
    setCandidates(null); setStatus("scanning"); setError(""); setResult(null); setCopied(false);
    try {
      const url = `/api/scan?mint=${encodeURIComponent(addr)}${chain ? `&chain=${chain}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "scan failed"); setStatus("error"); return; }
      setResult(data as ScanResult); setStatus("done");
      // Reflect the scanned token in the URL so the result is shareable.
      if (typeof window !== "undefined" && data?.mint && data?.chain) {
        const u = new URL(window.location.href);
        u.searchParams.set("t", `${data.chain}:${data.mint}`);
        window.history.replaceState(null, "", u.toString());
      }
    } catch { setError("network error — try again"); setStatus("error"); }
  }, []);

  const go = useCallback(async (input?: string) => {
    const q = (input ?? "").trim() || "";
    const value = input != null ? q : query.trim();
    if (!value) return;
    if (input != null) setQuery(input);
    setError(""); setResult(null); setCandidates(null); setCopied(false);
    if (isAddress(value)) return scanAddress(value);
    setStatus("searching");
    try {
      const res = await fetch(`/api/scan?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "search failed"); setStatus("error"); return; }
      const list = (data.candidates as TokenCandidate[]) || [];
      if (list.length === 0) { setError("no token matched that name"); setStatus("error"); return; }
      if (list.length === 1) return scanAddress(list[0].address, list[0].chain);
      setCandidates(list); setStatus("idle");
    } catch { setError("network error"); setStatus("error"); }
  }, [query, scanAddress]);

  // Permalink: /scan?t=chain:addr (or ?mint=&chain=) auto-runs the scan on load.
  useEffect(() => {
    if (didInit.current || typeof window === "undefined") return;
    didInit.current = true;
    // A /scan/<chain-address> share link passes the token directly — scan it first.
    if (initialAddress) { setQuery(initialAddress); scanAddress(initialAddress, initialChain); return; }
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("t");
    if (t && t.includes(":")) {
      const i = t.indexOf(":");
      const chain = t.slice(0, i); const addr = t.slice(i + 1);
      if (addr) { setQuery(addr); scanAddress(addr, chain); return; }
    }
    const mint = sp.get("mint");
    if (mint) { setQuery(mint); scanAddress(mint, sp.get("chain") || undefined); return; }
    const qp = sp.get("q");
    if (qp) { setQuery(qp); go(qp); }
  }, [scanAddress, go, initialAddress, initialChain]);

  function share() {
    if (typeof window === "undefined" || !result) return;
    // Pretty, unfurlable link — /scan/<chain>-<address> renders a branded OG card.
    const url = `${window.location.origin}/scan/${result.chain}-${result.mint}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  const embedToken = result ? `${result.chain}-${result.mint}` : "";
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : "https://coin-three-mu.vercel.app";
  function copyEmbed() {
    if (!result) return;
    const html = `<a href="${embedOrigin}/scan/${embedToken}" target="_blank" rel="noopener"><img src="${embedOrigin}/api/badge?t=${embedToken}" alt="GL1TCH safety scan" width="360" height="84"/></a>`;
    navigator.clipboard?.writeText(html).then(() => {
      setCopiedEmbed(true);
      window.setTimeout(() => setCopiedEmbed(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className={styles.tool}>
      <form className={styles.inputRow} onSubmit={(e) => { e.preventDefault(); go(query); }}>
        <span className={styles.prompt}>&gt;</span>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="token name or address — any chain…"
          spellCheck={false} autoCapitalize="off" autoCorrect="off"
          aria-label="Token name or contract address"
        />
        <button className={styles.scanBtn} type="submit" disabled={status === "scanning" || status === "searching" || !query.trim()}>
          {status === "scanning" ? "scanning…" : status === "searching" ? "searching…" : "RUN SCAN"}
        </button>
      </form>

      <div className={styles.examples}>
        <span>try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" className={styles.exBtn} onClick={() => go(ex.q)} disabled={status === "scanning" || status === "searching"}>
            {ex.label}
          </button>
        ))}
      </div>

      {(status === "scanning" || status === "searching") && (
        <div className={styles.scanning}>
          <span className={styles.spinner} /> {status === "searching" ? "searching the markets…" : "GL1TCH is reading the chain…"}
        </div>
      )}

      {status === "error" && <div className={styles.errorBox}>⚠ {error}</div>}

      {candidates && (
        <div className={styles.candidates}>
          <div className={styles.candHead}>Multiple matches — pick the one you mean:</div>
          {candidates.map((c) => (
            <button key={`${c.chain}:${c.address}`} type="button" className={styles.cand} onClick={() => scanAddress(c.address, c.chain)}>
              <span className={styles.candChain}>{chainName(c.chain)}</span>
              <span className={styles.candSym}>${c.symbol}</span>
              <span className={styles.candName}>{c.name}</span>
              <span className={styles.candLiq}>{fmtUsd(c.volume24h)} 24h vol</span>
            </button>
          ))}
        </div>
      )}

      {status === "done" && result && (
        <div className={styles.result}>
          <div className={styles.head}>
            <div className={styles.token}>
              <div className={styles.tokenName}>
                {result.name || "Unknown token"} {result.symbol ? <span className={styles.sym}>${result.symbol}</span> : null}
                {result.verified ? <span className={styles.verified} title="Canonical, verified blue-chip — not an impostor clone">✓ VERIFIED</span> : null}
              </div>
              <div className={styles.mintLine}>
                <span className={styles.tag}>{chainName(result.chain)}</span>
                {result.mint.slice(0, 6)}…{result.mint.slice(-6)}
                {result.isToken2022 ? <span className={styles.tag}>TOKEN-2022</span> : null}
              </div>
            </div>
            <div className={`${styles.verdict} ${VERDICT_TONE[result.verdict] || styles.vUnknown}`}>
              <span className={styles.verdictLabel}>{result.verdict}</span>
              <span className={styles.score}>{result.score}<span className={styles.scoreMax}>/100</span></span>
            </div>
          </div>

          {/* Plain-language bottom line */}
          <div className={`${styles.bottomLine} ${VERDICT_TONE[result.verdict] || styles.vUnknown}`}>
            {result.bottomLine}
          </div>

          {/* The rogue-AI's narrative read — GL1TCH's signature differentiator */}
          {result.aiVerdict && (
            <div className={styles.aiRead}>
              <div className={styles.aiHead}><span className={styles.aiEye}>◉</span> GL1TCH // AI READ</div>
              <p className={styles.aiBody}>{result.aiVerdict}</p>
            </div>
          )}

          {/* Score breakdown — each known check sized by its weight, colored by status */}
          <ScoreBreakdown checks={result.checks} confidence={result.confidence} />

          <div className={styles.checks}>
            {result.checks.map((c) => (
              <div key={c.key} className={`${styles.check} ${styles["s_" + c.status]}`}>
                <span className={styles.checkIcon} aria-hidden="true">{STATUS_ICON[c.status]}</span>
                <div className={styles.checkBody}>
                  <div className={styles.checkTop}>
                    <span className={styles.checkLabel}>{c.label}</span>
                    <span className={styles.checkValue}>{c.value}</span>
                  </div>
                  <div className={styles.checkExplain}>{c.explain}</div>
                </div>
              </div>
            ))}
          </div>

          {result.risks && result.risks.length > 0 && (
            <div className={styles.risks}>
              <div className={styles.risksHead}>Named risks</div>
              <div className={styles.riskChips}>
                {result.risks.map((r, i) => (
                  <span key={i} className={`${styles.riskChip} ${styles["lvl_" + (r.level || "warn")]}`}>{r.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.meta}>
            <div>
              <span>Price</span>
              <div className={styles.priceCell}>
                {fmtPrice(result.meta.priceUsd)}
                {result.meta.priceChange24h != null && (
                  <em className={result.meta.priceChange24h >= 0 ? styles.up : styles.down}>
                    {result.meta.priceChange24h >= 0 ? "▲" : "▼"} {Math.abs(result.meta.priceChange24h).toFixed(1)}%
                  </em>
                )}
              </div>
            </div>
            <div><span>Market cap</span>{fmtUsd(result.meta.marketCap)}</div>
            <div><span>Liquidity</span>{fmtUsd(result.meta.liquidityUsd)}</div>
            <div><span>LP locked</span>{result.meta.lpLockedPct != null ? `${result.meta.lpLockedPct}%` : "—"}</div>
            <div><span>Top holder</span>{result.meta.topHolderPct != null ? `${result.meta.topHolderPct.toFixed(1)}%` : "—"}</div>
            <div className={result.meta.insiderPct != null && result.meta.insiderPct > 15 ? styles.down : undefined}>
              <span>Insiders / bundled</span>{result.meta.insiderPct != null ? `${result.meta.insiderPct.toFixed(1)}%${result.meta.insiderCount ? ` · ${result.meta.insiderCount}` : ""}` : "—"}
            </div>
            <div><span>Holders</span>{result.meta.holderCount != null ? result.meta.holderCount.toLocaleString("en-US") : "—"}</div>
            <div><span>24h vol</span>{fmtUsd(result.meta.volume24h)}</div>
          </div>

          <div className={styles.resultFoot}>
            <button type="button" className={styles.shareBtn} onClick={share}>
              {copied ? "✓ link copied" : "⤴ share this scan"}
            </button>
            <span className={styles.source}>
              Sources: on-chain RPC · DexScreener · {result.chain === "solana" ? "RugCheck" : "GoPlus"}
              {result.scannedAt ? ` · scanned ${new Date(result.scannedAt).toUTCString().replace("GMT", "UTC")}` : ""}
            </span>
          </div>

          {/* Embed — turn every legit project into a backlink */}
          <div className={styles.embed}>
            <div className={styles.embedHead}>Proud of this verdict? Embed it on your site</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.embedPreview} src={`${embedOrigin}/api/badge?t=${embedToken}`} alt="GL1TCH safety badge" width={360} height={84} />
            <button type="button" className={styles.shareBtn} onClick={copyEmbed}>
              {copiedEmbed ? "✓ embed code copied" : "</> copy embed code"}
            </button>
          </div>

          <div className={styles.disclaimer}>
            GL1TCH read the chain — it never touched your wallet. Not financial advice. Always DYOR.
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBreakdown({ checks, confidence }: { checks: ScanCheck[]; confidence: number }) {
  const known = checks.filter((c) => c.status !== "unknown" && (c.weight ?? 0) > 0);
  const total = known.reduce((s, c) => s + (c.weight ?? 0), 0);
  if (total <= 0) return null;
  return (
    <div className={styles.breakdown}>
      <div className={styles.breakdownBar}>
        {known.map((c) => (
          <span
            key={c.key}
            className={`${styles.seg} ${styles["seg_" + c.status]}`}
            style={{ width: `${((c.weight ?? 0) / total) * 100}%` }}
            title={`${c.label}: ${c.value} (${c.status})`}
          />
        ))}
      </div>
      <div className={styles.breakdownNote}>
        <span className={styles.confDot} data-conf={confidence >= 80 ? "high" : confidence >= 60 ? "mid" : "low"} />
        Confidence {confidence}% — {known.length}/{checks.length} checks verified on-chain
      </div>
    </div>
  );
}
