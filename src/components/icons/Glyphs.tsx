/** Minimal line glyphs (inherit currentColor). */

interface GlyphProps {
  size?: number;
  className?: string;
}

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export function WalletIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 9h18" />
      <circle cx="16.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CoinIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5h4a2 2 0 0 1 0 4H9.5M9.5 12h3.5M11.5 7.5v9" />
    </svg>
  );
}

export function BoltIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function NoMintIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function LockIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
