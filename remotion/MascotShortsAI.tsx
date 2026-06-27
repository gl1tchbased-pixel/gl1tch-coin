import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * GL1TCH mascot Shorts — AI-animated (SVD img2video) centerpiece composited
 * into a 9:16 brand shell with crisp overlay text. The mascot's real pixels
 * move (SVD), the brand frame + typography are code-rendered (pixel-perfect).
 * Hybrid: professional motion + on-brand graphics. 6s @ 30fps.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const HOOKS = ["YOU FOUND THE SIGNAL", "INFECT THE INTERNET"];

export const MascotShortsAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const scanY = -(frame % 60);
  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const cornerO = interpolate(frame, [0, 18], [0, 0.6], { extrapolateRight: "clamp" });

  // square AI clip occupies 380..1460 (mascot centred ~y=920, in the safe band)
  const videoTop = 380;
  const videoSize = 1080;

  // rotating hook
  const seg = Math.round(durationInFrames / HOOKS.length);
  const hookIndex = Math.min(HOOKS.length - 1, Math.floor(frame / seg));
  const local = frame - hookIndex * seg;
  const hookOpacity = interpolate(local, [0, 8, seg - 10, seg - 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hook = HOOKS[hookIndex];

  const chips = ["$GL1TCH", "0% TAX", "RENOUNCED"];

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* AI-animated mascot (SVD) — centerpiece */}
      <OffthreadVideo
        src={staticFile("brand/mascot-svd-loop.mp4")}
        style={{ position: "absolute", top: videoTop, left: "50%", marginLeft: -videoSize / 2, width: videoSize, height: videoSize, objectFit: "cover" }}
        muted
      />

      {/* blend the square clip into the INK shell top & bottom */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,1) 0%, rgba(5,5,5,0) 22%, rgba(5,5,5,0) 70%, rgba(5,5,5,1) 84%)" }} />

      {/* scanlines over everything */}
      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />

      {/* HUD corners */}
      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => {
        const { b, ...pos } = c;
        return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: cornerO, ...b }} />;
      })}

      {/* top signal badge */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${12 + dotPulse * 14}px ${GREEN}`, opacity: dotPulse }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 7, color: GREEN }}>GL1TCH · SIGNAL_LIVE</div>
      </div>

      {/* rotating hook — single line, chromatic split aligned */}
      <div style={{ position: "absolute", top: 1510, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: hookOpacity }}>
        <div style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
          <div style={{ position: "absolute", top: 2, left: 4, fontSize: 58, fontWeight: 800, letterSpacing: -1, color: PURPLE, opacity: 0.5, whiteSpace: "nowrap" }}>{hook}</div>
          <div style={{ position: "absolute", top: -2, left: -4, fontSize: 58, fontWeight: 800, letterSpacing: -1, color: GREEN, opacity: 0.5, whiteSpace: "nowrap" }}>{hook}</div>
          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: -1, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)", whiteSpace: "nowrap" }}>{hook}</div>
        </div>
      </div>

      {/* chips */}
      <div style={{ position: "absolute", bottom: 470, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
        {chips.map((b, i) => {
          const s = spring({ frame: frame - (24 + i * 6), fps, config: { damping: 14, stiffness: 110 } });
          return (
            <div key={b} style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: 2, color: i === 0 ? INK : GREEN, background: i === 0 ? GREEN : "rgba(5,5,5,0.78)", border: `1px solid ${i === 0 ? GREEN : "rgba(124,255,79,0.32)"}`, borderRadius: 9999, padding: "12px 26px", boxShadow: i === 0 ? `0 0 22px ${GREEN}55` : "none", fontWeight: i === 0 ? 700 : 400, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`, opacity: interpolate(s, [0, 1], [0, 1]) }}>{b}</div>
          );
        })}
        <div style={{ width: 12, height: 36, background: GREEN, marginLeft: 2, opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 14px ${GREEN}` }} />
      </div>
    </AbsoluteFill>
  );
};
