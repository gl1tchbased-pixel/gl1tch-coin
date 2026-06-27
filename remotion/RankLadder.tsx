import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * GL1TCH "RANK LADDER" — 9:16, ~12s. Visualizes the holder-gated rank tiers
 * climbing bottom→top, each with its threshold + unlock. Sells the ONE real
 * differentiator (utility) most memes don't have. Free, text/CSS.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

// Bottom → top (climbing). Mirrors src/lib/ranks.ts.
const TIERS = [
  { n: "1", name: "OBSERVER", req: "0", unlock: "public rooms" },
  { n: "2", name: "INFECTED", req: "100K", unlock: "holder-only channel" },
  { n: "3", name: "SIGNAL BEARER", req: "1M", unlock: "raids · early lore" },
  { n: "4", name: "CORE NODE", req: "5M", unlock: "strategy room · governance" },
  { n: "5", name: "GHOST NODE", req: "10M", unlock: "top tier · direct line to core" },
];

const INTRO = 38;
const STEP = 30;

export const RankLadder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const split = Math.sin(t * 5) * 1.8 + (frame % 34 < 3 ? 5 : 0);

  const introOp = interpolate(frame, [0, 12, INTRO - 8, INTRO], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const ladderStart = INTRO;
  const revealEnd = ladderStart + TIERS.length * STEP;
  const outroStart = revealEnd + 40;
  const inOutro = frame >= outroStart;

  // which tier the "active glow" is on (sweeps up as rows appear, then rests on top)
  const activeIdx = Math.min(TIERS.length - 1, Math.max(0, Math.floor((frame - ladderStart) / STEP)));

  const scanY = -(frame % 60);

  const Chroma: React.FC<{ text: string; size: number }> = ({ text, size }) => (
    <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre", lineHeight: 1.08 }}>
      <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1, color: PURPLE, opacity: 0.5 }}>{text}</div>
      <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1, color: GREEN, opacity: 0.5 }}>{text}</div>
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{text}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: "ui-monospace, monospace" }}>
      <AbsoluteFill style={{ opacity: 0.13, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, transparent 42%, rgba(5,5,5,0.6) 100%)", pointerEvents: "none" }} />
      {[
        { top: 44, left: 44, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 44, right: 44, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 44, left: 44, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 44, right: 44, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 50, height: 50, opacity: 0.5, ...b }} />; })}

      {/* kicker */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", fontSize: 26, letterSpacing: 7, color: GREEN, opacity: 0.8 }}>
        GL1TCH // RANK LADDER
      </div>

      {frame < INTRO ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: introOp, textAlign: "center", padding: "0 70px" }}>
          <Chroma text={"YOUR RANK =\nYOUR HOLD"} size={92} />
          <div style={{ marginTop: 26, fontSize: 32, color: "rgba(245,247,248,0.8)" }}>hold more. climb higher. unlock more.</div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 70px" }}>
          <div style={{ display: "flex", flexDirection: "column-reverse", gap: 18, width: "100%", maxWidth: 900, opacity: inOutro ? interpolate(frame, [outroStart, outroStart + 14], [1, 0.12], { extrapolateRight: "clamp" }) : 1 }}>
            {TIERS.map((tr, i) => {
              const start = ladderStart + i * STEP;
              if (frame < start) return null;
              const s = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 90 } });
              const op = interpolate(frame - start, [0, 8], [0, 1], { extrapolateRight: "clamp" });
              const x = interpolate(s, [0, 1], [-30, 0]);
              const active = i === activeIdx && !inOutro;
              return (
                <div key={tr.name} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 22px", borderRadius: 14, opacity: op, transform: `translateX(${x}px)`, border: `1px solid ${active ? GREEN : "rgba(124,255,79,0.18)"}`, background: active ? "rgba(124,255,79,0.10)" : "rgba(255,255,255,0.02)", boxShadow: active ? `0 0 34px ${GREEN}33` : "none" }}>
                  <div style={{ width: 56, height: 56, flex: "0 0 auto", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800, color: INK, background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, boxShadow: `0 0 18px ${GREEN}55` }}>{tr.n}</div>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ fontSize: 38, fontWeight: 800, color: PAPER, letterSpacing: -0.5 }}>{tr.name}</div>
                    <div style={{ fontSize: 24, color: "rgba(245,247,248,0.55)" }}>{tr.unlock}</div>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: GREEN, whiteSpace: "nowrap" }}>{tr.req}<span style={{ fontSize: 22, opacity: 0.7 }}> $GL1TCH</span></div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* outro */}
      {inOutro && (() => {
        const local = frame - outroStart;
        const op = interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" });
        const sc = interpolate(spring({ frame: local, fps, config: { damping: 13, stiffness: 90 } }), [0, 1], [0.9, 1]);
        const dim = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0.5], { extrapolateLeft: "clamp" });
        return (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 60px", opacity: op * dim, transform: `scale(${sc})` }}>
            <Chroma text={"CLIMB THE LADDER"} size={72} />
            <div style={{ marginTop: 36, fontSize: 56, fontWeight: 800, color: GREEN, letterSpacing: 2 }}>$GL1TCH</div>
            <div style={{ marginTop: 14, fontSize: 27, letterSpacing: 2, color: "rgba(245,247,248,0.7)" }}>hold · verify · climb · coin-three-mu.vercel.app</div>
          </AbsoluteFill>
        );
      })()}
    </AbsoluteFill>
  );
};
