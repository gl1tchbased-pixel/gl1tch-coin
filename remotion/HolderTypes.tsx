import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * GL1TCH "TYPES OF HOLDERS" — 9:16, ~14s. Meme-format escalating archetypes with
 * glitch titles, tying into the rank ladder. Shareable, on-brand, free (text/CSS).
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const TYPES = [
  { n: "01", title: "THE TOURIST", sub: "aped $10. refreshes the chart every 90 seconds." },
  { n: "02", title: "THE LURKER", sub: "read every message in the TG. typed nothing. watching." },
  { n: "03", title: "THE VERIFIER", sub: "replies to every fudder with the rugcheck score." },
  { n: "04", title: "THE GHOST NODE", sub: "rank maxed. hasn't sold. doesn't blink." },
  { n: "05", title: "THE GL1TCH", sub: "stopped holding the meme. became it." },
];

const INTRO = 46;
const PER = 64;

export const HolderTypes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const introOp = interpolate(frame, [0, 14, INTRO - 8, INTRO], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const afterIntro = frame - INTRO;
  const idx = Math.floor(afterIntro / PER);
  const inTypes = afterIntro >= 0 && idx < TYPES.length;
  const outroStart = INTRO + TYPES.length * PER;
  const inOutro = frame >= outroStart;

  const scanY = -(frame % 60);
  const split = Math.sin(t * 6) * 2 + (frame % 30 < 3 ? 6 : 0);

  const Chroma: React.FC<{ text: string; size: number; weight?: number }> = ({ text, size, weight = 800 }) => (
    <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
      <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: weight, letterSpacing: -1, color: PURPLE, opacity: 0.5 }}>{text}</div>
      <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: weight, letterSpacing: -1, color: GREEN, opacity: 0.5 }}>{text}</div>
      <div style={{ fontSize: size, fontWeight: weight, letterSpacing: -1, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{text}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: "ui-monospace, monospace" }}>
      <AbsoluteFill style={{ opacity: 0.14, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 44%, transparent 40%, rgba(5,5,5,0.6) 100%)", pointerEvents: "none" }} />

      {/* corners */}
      {[
        { top: 44, left: 44, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 44, right: 44, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 44, left: 44, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 44, right: 44, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 50, height: 50, opacity: 0.5, ...b }} />; })}

      {/* intro */}
      {frame < INTRO && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: introOp, padding: "0 60px", textAlign: "center" }}>
          <div style={{ color: GREEN, fontSize: 30, letterSpacing: 8, marginBottom: 28 }}>GL1TCH // FIELD GUIDE</div>
          <Chroma text={"TYPES OF\n$GL1TCH\nHOLDERS"} size={96} />
        </AbsoluteFill>
      )}

      {/* type beats */}
      {inTypes && (() => {
        const local = afterIntro - idx * PER;
        const s = spring({ frame: local, fps, config: { damping: 14, stiffness: 95 } });
        const y = interpolate(s, [0, 1], [60, 0]);
        const op = interpolate(local, [0, 7, PER - 9, PER - 1], [0, 1, 1, 0.1], { extrapolateRight: "clamp" });
        const ty = TYPES[idx];
        return (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 70px", textAlign: "center", opacity: op, transform: `translateY(${y}px)` }}>
            <div style={{ fontSize: 150, fontWeight: 800, color: GREEN, textShadow: `0 0 30px ${GREEN}55`, lineHeight: 1 }}>{ty.n}</div>
            <div style={{ marginTop: 18 }}><Chroma text={ty.title} size={76} /></div>
            <div style={{ marginTop: 26, fontSize: 33, lineHeight: 1.4, color: "rgba(245,247,248,0.86)", maxWidth: 880 }}>{ty.sub}</div>
            {/* progress pips */}
            <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
              {TYPES.map((_, i) => (
                <div key={i} style={{ width: i === idx ? 30 : 12, height: 12, borderRadius: 9999, background: i === idx ? GREEN : "rgba(124,255,79,0.25)", boxShadow: i === idx ? `0 0 12px ${GREEN}` : "none" }} />
              ))}
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* outro */}
      {inOutro && (() => {
        const local = frame - outroStart;
        const op = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });
        const s = spring({ frame: local, fps, config: { damping: 13, stiffness: 90 } });
        return (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 60px", textAlign: "center", opacity: op, transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
            <Chroma text={"which one\nare you? 👻"} size={84} />
            <div style={{ marginTop: 46, fontSize: 58, fontWeight: 800, color: GREEN, letterSpacing: 2 }}>$GL1TCH</div>
            <div style={{ marginTop: 14, fontSize: 28, letterSpacing: 2, color: "rgba(245,247,248,0.66)" }}>your rank = your hold · coin-three-mu.vercel.app</div>
          </AbsoluteFill>
        );
      })()}

      {/* persistent ticker (only during type beats) */}
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontSize: 22, letterSpacing: 6, color: GREEN, opacity: inTypes ? 0.5 : 0 }}>
        $GL1TCH // RANK LADDER
      </div>
    </AbsoluteFill>
  );
};
