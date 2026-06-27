import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH "How to Buy" Short — 9:16, ~14s. Utility content: title -> 3 steps -> CTA.
 * Beat-based (no audio). On-brand terminal aesthetic + small mascot.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const BEATS = [
  { kind: "title", big: "HOW TO BUY", small: "$GL1TCH" },
  { kind: "step", n: "1", head: "GET PHANTOM + SOL", sub: "wallet + a little Solana" },
  { kind: "step", n: "2", head: "BUY ON PUMP.FUN", sub: "search $GL1TCH · swap SOL" },
  { kind: "step", n: "3", head: "/VERIFY · ENTER ROOM", sub: "sign · unlock your tier" },
  { kind: "cta", big: "$GL1TCH", small: "coin-three-mu.vercel.app · pump.fun" },
];
const PER = 84;

export const HowToBuy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = Math.min(BEATS.length - 1, Math.floor(frame / PER));
  const local = frame - idx * PER;
  const b = BEATS[idx];

  const s = spring({ frame: local, fps, config: { damping: 14, stiffness: 90 } });
  const op = interpolate(local, [0, 6, PER - 10, PER - 1], [0, 1, 1, 0.15], { extrapolateRight: "clamp" });
  const y = interpolate(s, [0, 1], [40, 0]);
  const split = local < 8 ? Math.sin(local * 6) * 6 : Math.sin(t * 6) * 1.5;
  const bob = Math.sin(t * Math.PI * 0.9) * 12;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  const Chroma: React.FC<{ text: string; size: number }> = ({ text, size }) => (
    <div style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -4, color: PURPLE, opacity: 0.5 }}>{text}</div>
      <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -4, color: GREEN, opacity: 0.5 }}>{text}</div>
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -4, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{text}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* small ambient mascot */}
      <OffthreadVideo src={staticFile("brand/mascot-svd-loop.mp4")} muted style={{ position: "absolute", top: 300, left: "50%", marginLeft: -260, width: 520, height: 520, objectFit: "cover", opacity: 0.8, transform: `translateY(${bob}px)`, filter: `drop-shadow(0 0 32px ${PURPLE}55)` }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.25) 28%, rgba(5,5,5,0.85) 58%, rgba(5,5,5,1) 100%)" }} />
      <Scanlines />
      <HudCorners />

      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 26, letterSpacing: 7, color: GREEN, opacity: 0.7 }}>
        GL1TCH · ACCESS
      </div>

      {/* content */}
      <div style={{ position: "absolute", top: 980, left: 0, right: 0, textAlign: "center", opacity: op, transform: `translateY(${y}px)`, padding: "0 60px" }}>
        {b.kind === "step" ? (
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 26 }}>
              <div style={{ fontFamily: "monospace", fontSize: 150, fontWeight: 800, color: GREEN, textShadow: `0 0 30px ${GREEN}66`, lineHeight: 1 }}>{b.n}</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 56, fontWeight: 800, color: PAPER, letterSpacing: -1 }}>{b.head}</div>
                <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 3, color: GREEN, marginTop: 8 }}>{b.sub}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Chroma text={b.big ?? ""} size={b.kind === "title" ? 130 : 170} />
            <div style={{ fontFamily: "monospace", fontSize: b.kind === "title" ? 64 : 34, letterSpacing: b.kind === "title" ? -2 : 5, color: b.kind === "title" ? GREEN : "rgba(245,247,248,0.7)", marginTop: 14, fontWeight: b.kind === "title" ? 800 : 400 }}>
              {b.small}{b.kind === "cta" ? "" : ""}
            </div>
          </>
        )}
      </div>

      {/* step progress */}
      <div style={{ position: "absolute", bottom: 360, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        {BEATS.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 30 : 12, height: 12, borderRadius: 9999, background: i === idx ? GREEN : "rgba(124,255,79,0.25)", boxShadow: i === idx ? `0 0 12px ${GREEN}` : "none" }} />
        ))}
        <div style={{ width: 10, height: 26, background: GREEN, marginLeft: 4, opacity: cursorOn ? 1 : 0.15, alignSelf: "center" }} />
      </div>

      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
