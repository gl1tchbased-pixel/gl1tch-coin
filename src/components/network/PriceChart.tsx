"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtPrice } from "@/lib/market";
import type { StepPoint } from "@/lib/ohlcv";
import styles from "./NetworkPanel.module.css";

type Range = "7d" | "30d" | "all";
interface History { points: StepPoint[]; trades: number; updatedAt: number; error?: string }

const H = 230, L = 82, R = 14, T = 12, B = 28;
// Axis ticks spell out the zeros: the subscript form ($0.0₅32) is illegible at axis size.
const tick = (v: number) => (v >= 0.0001 ? fmtPrice(v) : `$${v.toFixed(2 - Math.floor(Math.log10(v)))}`);
const day = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Step chart of the $GL1TCH price: flat between real trades, a dot on every trade. The pool trades
 * rarely, so a smooth line would invent movement that never happened.
 */
export function PriceChart() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<History | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // the viewBox follows the box width so axis text stays at its CSS size on phones
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/market/history?range=${range}`)
      .then((r) => r.json())
      .then((d: History) => { if (alive) { setData(d); setHover(null); } })
      .catch(() => { if (alive) setData({ points: [], trades: 0, updatedAt: Date.now(), error: "unavailable" }); });
    return () => { alive = false; };
  }, [range]);

  const geo = useMemo(() => {
    const pts = data?.points ?? [];
    if (pts.length < 2) return null;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    let mn = Math.min(...pts.map((p) => p.c)), mx = Math.max(...pts.map((p) => p.c));
    if (mx === mn) { mx *= 1.05; mn *= 0.95; }
    const pad = (mx - mn) * 0.15; mn -= pad; mx += pad;
    const x = (t: number) => L + ((W - L - R) * (t - t0)) / Math.max(1, t1 - t0);
    const y = (c: number) => T + (H - T - B) * (1 - (c - mn) / (mx - mn));
    let d = `M${x(pts[0].t).toFixed(1)} ${y(pts[0].c).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += `H${x(pts[i].t).toFixed(1)}V${y(pts[i].c).toFixed(1)}`;
    const area = `${d}V${H - B}H${x(t0).toFixed(1)}Z`;
    const ticks = [0, 1, 2, 3].map((i) => mn + ((mx - mn) * i) / 3);
    const n = W < 460 ? 2 : 3; // three date labels fit a phone, four a desktop
    const xt = Array.from({ length: n + 1 }, (_, i) => t0 + ((t1 - t0) * i) / n);
    return { pts, x, y, d, area, ticks, xt, t0, t1 };
  }, [data, W]);

  const onMove = (e: React.PointerEvent) => {
    if (!geo || !svgRef.current) return;
    const b = svgRef.current.getBoundingClientRect();
    const t = geo.t0 + (((e.clientX - b.left) / b.width) * W - L) / (W - L - R) * (geo.t1 - geo.t0);
    let idx = 0;
    for (let i = 0; i < geo.pts.length; i++) if (geo.pts[i].t <= t) idx = i;
    setHover(idx);
  };
  const hp = geo && hover !== null ? geo.pts[hover] : null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <b>GL1TCH / SOL · price</b>
        <div className={styles.seg} role="group" aria-label="Range">
          {(["7d", "30d", "all"] as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r === "all" ? "since launch" : r}</button>
          ))}
        </div>
      </div>
      <div className={styles.chart} ref={boxRef}>
        {geo ? (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Price history, ${range}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#7CFF4F" stopOpacity=".28" />
                <stop offset="1" stopColor="#7CFF4F" stopOpacity="0" />
              </linearGradient>
            </defs>
            {geo.ticks.map((t, i) => (
              <g key={i}>
                <line x1={L} x2={W - R} y1={geo.y(t)} y2={geo.y(t)} stroke="#C4B0FF" strokeOpacity=".08" />
                <text x={L - 10} y={geo.y(t) + 3.5} textAnchor="end" className={styles.axis}>{tick(t)}</text>
              </g>
            ))}
            {geo.xt.map((t, i) => (
              <text key={i} x={geo.x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === geo.xt.length - 1 ? "end" : "middle"} className={styles.axis}>{day(t)}</text>
            ))}
            <path d={geo.area} fill="url(#pc-fill)" />
            <path d={geo.d} fill="none" stroke="#7CFF4F" strokeWidth="2" strokeLinejoin="round" />
            {geo.pts.filter((p) => p.traded).map((p) => (
              <circle key={p.t} cx={geo.x(p.t)} cy={geo.y(p.c)} r="3.5" fill="#7CFF4F" stroke="#0E0C18" strokeWidth="2" />
            ))}
            {hp && (
              <>
                <line x1={geo.x(hp.t)} x2={geo.x(hp.t)} y1={T} y2={H - B} stroke="#F5F7F8" strokeOpacity=".25" strokeDasharray="3 3" />
                <circle cx={geo.x(hp.t)} cy={geo.y(hp.c)} r="5" fill="#7CFF4F" stroke="#0E0C18" strokeWidth="2" />
              </>
            )}
            <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
          </svg>
        ) : (
          <div className={styles.empty}>
            {data ? (data.error ? "Price history is unavailable right now." : "No trades in this window yet.") : <span className="skeleton" aria-hidden="true" />}
          </div>
        )}
        {hp && geo && (
          <div className={styles.tip} style={{ left: `${(geo.x(hp.t) / W) * 100}%`, top: `${(geo.y(hp.c) / H) * 100}%` }}>
            <span>{day(hp.t)} · {hp.traded ? "trade" : "no trade, last price"}</span>
            {fmtPrice(hp.c)}
          </div>
        )}
      </div>
      <p className={styles.note}>
        {data ? `${data.trades} trade period${data.trades === 1 ? "" : "s"} in this window · ` : ""}flat line = no trades, the price holds at the last one · source: GeckoTerminal
      </p>
    </div>
  );
}
