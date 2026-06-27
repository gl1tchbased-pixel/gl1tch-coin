interface RadialGaugeProps {
  score: number; // 0-100
  size?: number;
  label?: string;
}

export function RadialGauge({ score, size = 160, label }: RadialGaugeProps) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? "Score"}: ${pct}%`}>
      <defs>
        <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-signal)" />
          <stop offset="100%" stopColor="var(--color-glitch)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-signal)"
        style={{ fontWeight: 800, fontSize: size * 0.26, fontFamily: "var(--font-body)" }}
      >
        {pct}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        fill="var(--text-muted)"
        style={{ fontSize: size * 0.085, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
      >
        / 100
      </text>
    </svg>
  );
}
