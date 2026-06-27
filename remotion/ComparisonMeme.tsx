import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH comparison meme — premium split-panel "OTHER MEMECOINS vs $GL1TCH".
 * Cycles trust contrasts. 9:16, ~11s, no audio. Community-shareable template.
 */

const GREEN = "#7CFF4F";
const RED = "#FF4D4D";
const INK = "#050505";
const PAPER = "#F5F7F8";

const ROWS = [
  { other: "5% buy/sell tax", us: "0% tax" },
  { other: "team wallet 12%", us: "founder on-curve" },
  { other: "mint still live", us: "mint · renounced" },
  { other: "freeze enabled", us: "freeze · revoked" },
];
const PER = 78;

export const ComparisonMeme: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = Math.min(ROWS.length - 1, Math.floor(frame / PER));
  const local = frame - idx * PER;
  const r = ROWS[idx];
  const sOther = spring({ frame: local, fps, config: { damping: 16 } });
  const sUs = spring({ frame: local - 6, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Scanlines opacity={0.1} />
      <HudCorners />

      {/* header */}
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 30, letterSpacing: 6, color: GREEN, opacity: 0.8 }}>
        // OTHER MEMECOINS  vs  $GL1TCH
      </div>

      {/* TOP panel — other (red) */}
      <div style={{ position: "absolute", top: 360, left: 60, right: 60, height: 520, borderRadius: 28, border: `1px solid ${RED}44`, background: "rgba(40,8,8,0.5)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", opacity: interpolate(sOther, [0, 1], [0, 1]), transform: `translateY(${interpolate(sOther, [0, 1], [40, 0])}px)` }}>
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 4, color: RED, opacity: 0.8 }}>OTHER MEMECOINS</div>
        <div style={{ fontSize: 86, fontWeight: 800, color: PAPER, marginTop: 16, textDecoration: "line-through", textDecorationColor: `${RED}cc` }}>{r.other}</div>
      </div>

      {/* divider */}
      <div style={{ position: "absolute", top: 905, left: 200, right: 200, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)` }} />

      {/* BOTTOM panel — us (green) */}
      <div style={{ position: "absolute", top: 940, left: 60, right: 60, height: 520, borderRadius: 28, border: `1px solid ${GREEN}55`, background: "rgba(8,30,12,0.55)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", opacity: interpolate(sUs, [0, 1], [0, 1]), transform: `translateY(${interpolate(sUs, [0, 1], [40, 0])}px)`, boxShadow: `0 0 40px ${GREEN}22` }}>
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 4, color: GREEN }}>$GL1TCH</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: PAPER, marginTop: 16, textShadow: `0 0 30px ${GREEN}55` }}>{r.us}</div>
      </div>

      {/* progress */}
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        {ROWS.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 30 : 12, height: 12, borderRadius: 9999, background: i === idx ? GREEN : "rgba(124,255,79,0.25)" }} />
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 210, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 5, color: "rgba(245,247,248,0.6)" }}>
        coin-three-mu.vercel.app · on Solana
      </div>

      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
