"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMarket, fmtPrice, fmtUsd, fmtPct, pctTone, marketSourceName, type MarketSnapshot } from "@/lib/market";
import { latestDrand, type DrandPulse } from "@/lib/quantum/drand";
import { formatPulseDate } from "@/lib/quantum/freshness";
import { isStale, ageLabel } from "@/lib/staleness";
import { verdictKind } from "@/lib/verdict";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { tokenomicsContent } from "@/content/tokenomics";
import type { ScanResult } from "@/lib/scan";
import { PriceChart } from "./PriceChart";
import { SupplyRing } from "./SupplyRing";
import styles from "./NetworkPanel.module.css";

interface RadarItem { chain: string; mint: string; name: string; symbol: string; verdict: string; score: number; reason: string }
interface Radar { scanned: number; flagged: number; caught: RadarItem[]; updatedAt?: number }
interface Curby { ready?: boolean; round?: number; timestamp?: string; stale?: boolean }
type Timed<T> = { data: T; at: number };

const MARKET_MS = 30_000;
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function Live({ at, every, source }: { at?: number; every: number; source: string }) {
  const stale = isStale(at, every);
  return (
    <span className={styles.src} data-stale={stale ? "1" : "0"}>
      <i aria-hidden="true" />
      {at ? (stale ? `stale · ${ageLabel(at)}` : `live · ${ageLabel(at)}`) : "loading"} · {source}
    </span>
  );
}

const TILT = "(hover: hover) and (prefers-reduced-motion: no-preference)";

/** KPI card with a ±10° perspective tilt toward the pointer (hover devices, motion allowed). */
function Kpi({ label, value, kind, children }: { label: string; value: React.ReactNode; kind?: string; children?: React.ReactNode }) {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !window.matchMedia(TILT).matches) return;
    const el = e.currentTarget, b = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${(((e.clientX - b.left) / b.width) - 0.5) * 20}deg`);
    el.style.setProperty("--rx", `${(0.5 - ((e.clientY - b.top) / b.height)) * 20}deg`);
  };
  const leave = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.removeProperty("--rx"); e.currentTarget.style.removeProperty("--ry"); };
  return (
    <div className={styles.kpi} onPointerMove={move} onPointerLeave={leave}>
      <span className={styles.l}>{label}</span>
      <span className={styles.v} data-kind={kind}>{value}</span>
      <span className={styles.d}>{children}</span>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const r = 54, c = 2 * Math.PI * r, k = verdictKind(score >= 80 ? "CLEAN" : score >= 50 ? "CAUTION" : "HIGH RISK");
  const stroke = k === "ok" ? "#7CFF4F" : k === "warn" ? "#E5B454" : "#F2555A";
  return (
    <svg viewBox="0 0 132 132" className={styles.gauge} role="img" aria-label={`Safety score ${score} out of 100`}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="#1D1930" strokeWidth="10" />
      <circle cx="66" cy="66" r={r} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 66 66)" />
      <text x="66" y="72" textAnchor="middle" className={styles.gaugeV}>{score}</text>
      <text x="66" y="92" textAnchor="middle" className={styles.axis}>/ 100</text>
    </svg>
  );
}

/**
 * Signal Network — the public status panel: summary first, detail after. Every card names its
 * source and freshness; a card past twice its refresh interval drops the live dot.
 */
export function NetworkPanel() {
  const [market, setMarket] = useState<Timed<MarketSnapshot> | null>(null);
  const [self, setSelf] = useState<Timed<ScanResult> | null>(null);
  const [radar, setRadar] = useState<Radar | null>(null);
  const [drand, setDrand] = useState<Timed<DrandPulse> | null>(null);
  const [curby, setCurby] = useState<Curby | null>(null);
  const [failed, setFailed] = useState<{ self?: boolean; radar?: boolean }>({});

  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const loadMarket = () => fetchMarket(ctl.signal).then((m) => { if (alive) setMarket({ data: m, at: Date.now() }); });
    const loadBeacon = () => {
      latestDrand().then((d) => { if (alive && d) setDrand({ data: d, at: Date.now() }); }).catch(() => {});
      fetch("/api/quantum-core/pulse").then((r) => r.json()).then((c) => { if (alive) setCurby(c); }).catch(() => {});
    };
    loadMarket();
    loadBeacon();
    fetch(`/api/scan?mint=${CONTRACT_ADDRESS}&chain=solana`).then((r) => r.json()).then((s) => { if (!alive) return; if (s?.verdict) setSelf({ data: s, at: s.scannedAt ?? Date.now() }); else setFailed((f) => ({ ...f, self: true })); }).catch(() => { if (alive) setFailed((f) => ({ ...f, self: true })); });
    fetch("/api/radar").then((r) => r.json()).then((d) => { if (!alive) return; if (Array.isArray(d?.caught)) setRadar(d); else setFailed((f) => ({ ...f, radar: true })); }).catch(() => { if (alive) setFailed((f) => ({ ...f, radar: true })); });
    const a = setInterval(loadMarket, MARKET_MS);
    const b = setInterval(loadBeacon, 30_000);
    return () => { alive = false; ctl.abort(); clearInterval(a); clearInterval(b); };
  }, []);

  const m = market?.data;
  const s = self?.data;
  const tone = pctTone(m?.priceChange24h ?? null);
  const pick = (label: string) => s?.checks.find((c) => c.label.toLowerCase().includes(label));
  const topHolder = s?.meta.topHolderPct ?? null;
  const checks = ["mint", "freeze", "tax", "lp locked", "insiders", "rugcheck"].map(pick).filter(Boolean) as ScanResult["checks"];
  // the scanner can't score concentration when the largest account is the pool, so the row says so
  const rows = topHolder != null ? [...checks.slice(0, -1), { label: "Top holder", value: `pool · ${topHolder.toFixed(1)}%`, status: "pass" }, ...checks.slice(-1)] : checks;

  return (
    <section className={styles.wrap} aria-labelledby="signal-network-title">
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}><i aria-hidden="true" />Signal Network</span>
          <h2 id="signal-network-title" className={styles.title}>$GL1TCH, <span className="hl">live.</span></h2>
        </div>
        <div className={styles.sources}>
          {["GeckoTerminal", "RugCheck", "Solana RPC", "drand", "Signal Graph"].map((x) => <span key={x}>{x}</span>)}
        </div>
      </div>

      <div className={styles.kpis}>
        <Kpi label="Price" value={m ? fmtPrice(m.priceUsd) : <span className="skeleton" />}>
          <span className={tone === "up" ? styles.up : tone === "down" ? styles.dn : ""}>{m ? fmtPct(m.priceChange24h) : ""}</span> 24h
        </Kpi>
        <Kpi label="Market cap" value={m ? fmtUsd(m.marketCap) : <span className="skeleton" />}>FDV = market cap</Kpi>
        <Kpi label="24h volume" value={m ? fmtUsd(m.volume24h) : <span className="skeleton" />}>one pool</Kpi>
        <Kpi label="Liquidity" value={m ? (m.liquidityUsd != null ? fmtUsd(m.liquidityUsd) : "Thin pool") : <span className="skeleton" />} kind={m && m.liquidityUsd == null ? "warn" : undefined}>
          {m && m.liquidityUsd == null ? <span className={styles.chipWarn}>not reported</span> : "100% locked"}
        </Kpi>
        <Kpi label="Holders" value={s ? (s.meta.holderCount ?? "—") : <span className="skeleton" />}>incl. the pool</Kpi>
        <Kpi label="Trust score" value={s ? `${s.score}/100` : <span className="skeleton" />} kind={s ? verdictKind(s.verdict) : undefined}>{s ? s.verdict.toLowerCase() : "self-scan"}</Kpi>
      </div>
      <div className={styles.kpiFoot}><Live at={market?.at} every={MARKET_MS} source={marketSourceName(m ?? null) ?? "market"} /></div>

      <div className={styles.grid2}>
        <PriceChart />
        <div className={styles.panel}>
          <div className={styles.panelHead}><b>Self-scan</b><Live at={self?.at} every={10 * 60_000} source="GL1TCH scanner" /></div>
          {s ? (
            <div className={styles.gaugeWrap}>
              <Gauge score={s.score} />
              <ul className={styles.checks}>
                {rows.map((c) => (
                  <li key={c.label} data-status={c.status}><span>{c.label}</span><b>{c.value}</b></li>
                ))}
              </ul>
            </div>
          ) : failed.self ? (
            <div className={styles.empty}>The self-scan didn&apos;t answer. It reads the token from Solana RPC and RugCheck; try again in a minute.</div>
          ) : (
            <div className={styles.empty}><span className="skeleton" aria-hidden="true" /></div>
          )}
          <p className={styles.note}>The top holder is the liquidity pool, not a person. <Link href="/proof">Proof →</Link></p>
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <b>Rug Radar · last sweep</b>
            <Live at={radar?.updatedAt} every={60 * 60_000} source="Rug Radar" />
          </div>
          {radar ? (
            <>
              <p className={styles.meta}>{radar.scanned} scanned · <b className={radar.flagged ? styles.dn : ""}>{radar.flagged} high risk</b></p>
              <ul className={styles.rlist}>
                {radar.caught.map((c) => {
                  const k = verdictKind(c.verdict);
                  return (
                    <li key={c.mint}>
                      <Link href={`/scan/${c.chain}-${c.mint}`}>
                        <span className={styles.nm}>{c.symbol ? `$${c.symbol}` : c.name}<small>{short(c.mint)} · {c.reason}</small></span>
                        <span className={styles.bar}><i style={{ width: `${c.score}%` }} data-kind={k} /></span>
                        <span className={styles.sc} data-kind={k}>{c.score}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : failed.radar ? (
            <div className={styles.empty}>No sweep to show yet. Rug Radar scans new launches every hour; the list fills from <Link href="/radar">/radar</Link>.</div>
          ) : (
            <div className={styles.empty}><span className="skeleton" aria-hidden="true" /></div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}><b>Quantum beacon</b><span className={styles.chipVio}>source status</span></div>
          <div className={styles.row}><span>drand quicknet</span><Live at={drand?.at} every={30_000} source={drand?.data.verified ? "BLS-verified" : "unverified"} /></div>
          <div className={styles.row}><span>Round</span><b>{drand ? drand.data.round : <span className="skeleton" />}</b></div>
          <div className={styles.hash}>{drand ? `${drand.data.randomness.slice(0, 48)}…` : ""}</div>
          <div className={styles.row}>
            <span>NIST CURBy</span>
            {curby?.ready ? (
              <span className={curby.stale ? styles.chipWarn : styles.chipOk}>{curby.stale ? `paused · last round ${formatPulseDate(curby.timestamp ?? "")}` : "live"}</span>
            ) : <span className="skeleton" />}
          </div>
          <p className={styles.note}>A paused source never shows a live dot. <Link href="/quantum-core">Quantum Core →</Link></p>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}><b>Supply</b><span className={styles.meta}>1,000,000,000 fixed</span></div>
          <ul className={styles.facts}>
            {tokenomicsContent.launch.facts.slice(0, 3).map((f) => <li key={f.id}><b>{f.title}</b><span>{f.detail}</span></li>)}
          </ul>
          {topHolder != null && <SupplyRing poolPct={topHolder} />}
        </div>
      </div>
    </section>
  );
}
