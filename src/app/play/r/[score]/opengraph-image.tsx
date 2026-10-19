import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DECK_SIZE, playTitle } from "@/content/play";

/** Share card for a Rug or Not? score: Shadow Glitchy, the score and the rank. */

export const alt = "Rug or Not? score card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#7CFF4F";
const VIOLET = "#B99BFF";
const PAPER = "#F5F7F8";

export function generateStaticParams() {
  return Array.from({ length: DECK_SIZE + 1 }, (_, s) => ({ score: String(s) }));
}

export default async function Image({ params }: { params: Promise<{ score: string }> }) {
  const n = Math.min(DECK_SIZE, Math.max(0, Number((await params).score) || 0));
  const pose = n >= 6 ? "laugh" : n >= 4 ? "wave" : "34";
  const glitchy = await readFile(join(process.cwd(), `assets/play/glitchy-shadow-${pose}.png`), "base64");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(135deg, #0b0816 0%, #1d1240 60%, #2a1650 100%)", fontFamily: "monospace", padding: "60px 70px" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", opacity: 0.14, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)" }} />
        <div style={{ position: "absolute", right: 20, bottom: -10, width: 560, height: 560, display: "flex", borderRadius: 9999, background: "radial-gradient(circle, rgba(122,60,255,0.45) 0%, transparent 65%)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${glitchy}`} width={500} height={500} alt="" style={{ position: "absolute", right: 50, bottom: 20 }} />

        <div style={{ display: "flex", flexDirection: "column", zIndex: 2, width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 14px ${GREEN}` }} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, color: PAPER }}>GL1TCH</div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: VIOLET }}>{"// RUG OR NOT?"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 70 }}>
            <div style={{ display: "flex", fontSize: 220, fontWeight: 800, lineHeight: 0.9, color: GREEN, textShadow: `0 0 50px ${GREEN}66` }}>{n}</div>
            <div style={{ display: "flex", fontSize: 80, fontWeight: 700, color: "rgba(245,247,248,0.6)", paddingBottom: 18 }}>/{DECK_SIZE}</div>
          </div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: PAPER, marginTop: 24 }}>{`Rank: ${playTitle(n)}`}</div>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(245,247,248,0.75)", marginTop: 18 }}>8 fictional tokens · can you beat it?</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: GREEN, marginTop: 40 }}>gl1tchbased.xyz/play</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
