interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  area?: boolean;
}

export function Sparkline({ data, width = 100, height = 28, area = true }: SparklineProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const coords = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${coords[0]?.[0] ?? 0},${height} ${line} ${coords[coords.length - 1]?.[0] ?? width},${height}`;
  const gid = `spark-${Math.round(data.reduce((a, b) => a + b, 0) * 7)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <polygon points={areaPath} fill={`url(#${gid})`} />}
      <polyline
        points={line}
        stroke="var(--color-signal)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}
