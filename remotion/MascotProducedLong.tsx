import React from "react";
import { AbsoluteFill, OffthreadVideo, Series, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { ColdOpen, Talking, Outro, Scanlines, HudCorners, GlitchIn } from "./MascotProduced";
import { voiceEnv } from "./voiceData";

/**
 * GL1TCH long-form produced Shorts (~21s) — adds a trust-points montage between
 * the talking mascot and the CTA, for a fuller Reel with more value + watch time.
 * Cold open -> talking mascot -> trust beats -> CTA outro.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const BEATS = [
  { big: "0%", sub: "TAX · BUY & SELL" },
  { big: "NULL", sub: "MINT AUTHORITY · REVOKED" },
  { big: "NULL", sub: "FREEZE AUTHORITY · REVOKED" },
  { big: "CLEAN", sub: "RUGCHECK · 0 RISKS" },
];
const PER = 66; // frames per beat

const TrustBeats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = Math.min(BEATS.length - 1, Math.floor(frame / PER));
  const local = frame - idx * PER;
  const beat = BEATS[idx];

  const s = spring({ frame: local, fps, config: { damping: 13, stiffness: 90 } });
  const op = interpolate(local, [0, 6, PER - 10, PER - 1], [0, 1, 1, 0.15], { extrapolateRight: "clamp" });
  const y = interpolate(s, [0, 1], [40, 0]);
  const split = local < 8 ? Math.sin(local * 6) * 6 : Math.sin(t * 6) * 1.5;
  const bob = Math.sin(t * Math.PI * 0.9) * 12;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* ambient mascot top */}
      <OffthreadVideo src={staticFile("brand/mascot-svd-loop.mp4")} muted style={{ position: "absolute", top: 250, left: "50%", marginLeft: -300, width: 600, height: 600, objectFit: "cover", opacity: 0.85, transform: `translateY(${bob}px)`, filter: `drop-shadow(0 0 36px ${PURPLE}55)` }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.2) 30%, rgba(5,5,5,0.85) 60%, rgba(5,5,5,1) 100%)" }} />
      <Scanlines />
      <HudCorners />

      {/* top tag */}
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 26, letterSpacing: 7, color: GREEN, opacity: 0.7 }}>
        // PROOF OF SIGNAL
      </div>

      {/* big number/word */}
      <div style={{ position: "absolute", top: 1020, left: 0, right: 0, textAlign: "center", opacity: op, transform: `translateY(${y}px)` }}>
        <div style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
          <div style={{ position: "absolute", left: -split, top: -2, fontSize: 210, fontWeight: 800, letterSpacing: -6, color: PURPLE, opacity: 0.5 }}>{beat.big}</div>
          <div style={{ position: "absolute", left: split, top: 2, fontSize: 210, fontWeight: 800, letterSpacing: -6, color: GREEN, opacity: 0.5 }}>{beat.big}</div>
          <div style={{ fontSize: 210, fontWeight: 800, letterSpacing: -6, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{beat.big}</div>
        </div>
      </div>

      {/* sub line */}
      <div style={{ position: "absolute", top: 1290, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 38, letterSpacing: 5, color: GREEN, opacity: interpolate(local, [6, 16], [0, 1], { extrapolateRight: "clamp" }) }}>
        {beat.sub}
      </div>

      {/* progress dots */}
      <div style={{ position: "absolute", bottom: 360, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        {BEATS.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 30 : 12, height: 12, borderRadius: 9999, background: i === idx ? GREEN : "rgba(124,255,79,0.25)", boxShadow: i === idx ? `0 0 12px ${GREEN}` : "none" }} />
        ))}
      </div>

      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};

export const MascotProducedLong: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Series>
      <Series.Sequence durationInFrames={34}><ColdOpen /></Series.Sequence>
      <Series.Sequence durationInFrames={voiceEnv.length + 12}><Talking /></Series.Sequence>
      <Series.Sequence durationInFrames={BEATS.length * PER}><TrustBeats /></Series.Sequence>
      <Series.Sequence durationInFrames={74}><Outro /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
