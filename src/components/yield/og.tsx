import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared 1200×630 share-image layout for Yield X-Ray (next/og). Never throws: missing art falls back to flat ink. */

export const OG_SIZE = { width: 1200, height: 630 };
const GREEN = "#7CFF4F";
const INK = "#050505";
const PAPER = "#F5F7F8";
const TONE = { low: GREEN, moderate: "#D8E36A", elevated: "#FFB547", high: "#FF5C5C" } as const;

async function background(): Promise<string | null> {
  try {
    return `data:image/png;base64,${await readFile(join(process.cwd(), "assets/og-bg.png"), "base64")}`;
  } catch {
    return null;
  }
}

export async function yieldOgCard(p: {
  title: string;
  subtitle: string;
  big: string;
  bigLabel: string;
  risk?: { level: keyof typeof TONE; score: number } | null;
}) {
  const bg = await background();
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: INK, color: PAPER, position: "relative" }}>
      {/* next/og renders plain <img>; next/image doesn't exist inside an ImageResponse. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bg && <img src={bg} width={1200} height={630} style={{ position: "absolute", inset: 0, opacity: 0.55 }} alt="" />}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, color: GREEN, letterSpacing: 6 }}>GL1TCH · YIELD X-RAY</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 18, lineHeight: 1.05, maxWidth: 1050 }}>{p.title}</div>
        <div style={{ fontSize: 30, opacity: 0.8, marginTop: 14 }}>{p.subtitle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, opacity: 0.7 }}>{p.bigLabel}</div>
          <div style={{ fontSize: 120, fontWeight: 800, color: GREEN, lineHeight: 1 }}>{p.big}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {p.risk && (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: TONE[p.risk.level], border: `3px solid ${TONE[p.risk.level]}`, borderRadius: 999, padding: "8px 22px" }}>
              Risk {p.risk.score}/100 · {p.risk.level}
            </div>
          )}
          <div style={{ fontSize: 26, opacity: 0.75, marginTop: 16 }}>Who pays it · how you get out · verify it yourself</div>
          <div style={{ fontSize: 26, color: GREEN, marginTop: 8 }}>gl1tchbased.xyz/yield</div>
        </div>
      </div>
    </div>
  );
}
