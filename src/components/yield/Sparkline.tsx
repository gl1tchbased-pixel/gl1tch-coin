import { pct } from "@/lib/yield/format";
import type { YieldPoint } from "@/lib/yield/types";

/** APY over time as a plain SVG line. Renders nothing until there are two measured points. */
export function Sparkline({ points, width = 640, height = 120 }: { points: YieldPoint[]; width?: number; height?: number }) {
  const pts = points.filter((p): p is YieldPoint & { apy: number } => p.apy != null && Number.isFinite(p.apy));
  if (pts.length < 2) return null;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const lo = Math.min(...pts.map((p) => p.apy)), hi = Math.max(...pts.map((p) => p.apy));
  const span = hi - lo || Math.abs(hi) || 1;
  const pad = 8;
  const x = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (width - 2 * pad);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - 2 * pad);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.apy).toFixed(1)}`).join(" ");
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`APY from ${pct(pts[0].apy)} to ${pct(pts[pts.length - 1].apy)}`}>
        <path d={d} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
      </svg>
      <figcaption style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
        <span>{new Date(t0).toISOString().slice(0, 10)} · low {pct(lo)}</span>
        <span>high {pct(hi)} · {new Date(t1).toISOString().slice(0, 10)}</span>
      </figcaption>
    </figure>
  );
}
