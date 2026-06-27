import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";

/**
 * GL1TCH mascot Shorts — 9:16 vertical, energetic loop that brings the glitchy
 * ghost to life: float + breathe + tilt + blink-hop + glitch teleport bursts +
 * chromatic split, with a rotating hook line. For TikTok / Reels / YT Shorts.
 * Designed to loop cleanly (end state ≈ start state).
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const HOOKS = ["YOU FOUND THE SIGNAL", "INFECT THE INTERNET", "EXPOSURE IS IRREVERSIBLE"];

export const MascotShorts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const t = frame / fps;

  // ---- entrance ------------------------------------------------------------
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });

  // ---- idle life: float, sway, breathe, tilt -------------------------------
  const floatY = Math.sin(t * Math.PI * 0.9) * 26;
  const swayX = Math.sin(t * Math.PI * 0.55 + 1) * 16;
  const breathe = 1 + Math.sin(t * Math.PI * 1.1) * 0.03;
  const tilt = Math.sin(t * Math.PI * 0.7) * 3;

  // ---- blink-hop every ~2s: quick squash + upward pop ----------------------
  const hopPeriod = Math.round(fps * 2);
  const hopPhase = frame % hopPeriod;
  const hopping = hopPhase < 8;
  const hop = hopping ? Math.sin((hopPhase / 8) * Math.PI) : 0;
  const squashY = 1 - hop * 0.12;
  const squashX = 1 + hop * 0.08;
  const hopLift = hop * 36;

  // ---- glitch teleport bursts ---------------------------------------------
  const glitchEvery = Math.round(fps * 2.4);
  const gPhase = frame % glitchEvery;
  const inGlitch = gPhase < 7;
  const gi = Math.floor(frame / glitchEvery);
  const teleX = inGlitch ? (random(`tx${gi}`) - 0.5) * 70 : 0;
  const sliceY = inGlitch ? (random(`sy${gi}`) - 0.5) * 40 : 0;
  const split = inGlitch ? 10 + Math.sin(frame * 11) * 8 : Math.sin(t * Math.PI * 1.3) * 2;

  // ---- ambient -------------------------------------------------------------
  const auroraScale = 1 + Math.sin(t * Math.PI * 0.6) * 0.05;
  const haloOpacity = 0.45 + Math.sin(t * Math.PI * 0.9) * 0.18;
  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const scanY = -(frame % 60);
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  // ---- mascot layout -------------------------------------------------------
  const mascotSize = 860;
  const mascotTop = 470;
  const baseFilter = inGlitch
    ? `drop-shadow(${split}px 0 22px ${GREEN}) drop-shadow(${-split}px 0 22px ${PURPLE}) drop-shadow(0 30px 80px ${PURPLE}66)`
    : `drop-shadow(0 30px 80px ${PURPLE}66) drop-shadow(0 0 44px ${GREEN}33)`;

  const mascotTransform =
    `translateX(${swayX + teleX}px) translateY(${floatY - hopLift}px) ` +
    `rotate(${tilt}deg) scale(${breathe * squashX * interpolate(enter, [0, 1], [0.8, 1])}, ${breathe * squashY * interpolate(enter, [0, 1], [0.8, 1])})`;

  // ---- rotating hook -------------------------------------------------------
  const hookIndex = Math.floor(frame / Math.round(durationInFrames / HOOKS.length)) % HOOKS.length;
  const hookLocal = frame % Math.round(durationInFrames / HOOKS.length);
  const hookOpacity = interpolate(hookLocal, [0, 8, Math.round(durationInFrames / HOOKS.length) - 10, Math.round(durationInFrames / HOOKS.length) - 2], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const hook = HOOKS[hookIndex];

  // chip row
  const chips = ["$GL1TCH", "0% TAX", "RENOUNCED"];

  const Mascot = ({ color, dx, opacity }: { color?: string; dx: number; opacity: number }) => (
    <Img
      src={staticFile("brand/glitchy-1024-t.png")}
      style={{
        position: "absolute",
        left: "50%",
        top: mascotTop + (color ? sliceY : 0),
        width: mascotSize,
        height: mascotSize,
        marginLeft: -mascotSize / 2 + dx,
        objectFit: "contain",
        opacity,
        transform: mascotTransform,
        filter: color ? `drop-shadow(0 0 0 ${color})` : baseFilter,
        mixBlendMode: color ? "screen" : "normal",
      }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* backdrop */}
      <Img src={staticFile("brand/og-bg.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.15) 38%, rgba(5,5,5,0.6) 72%, rgba(5,5,5,0.97) 100%)" }} />

      {/* aurora */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "50%", top: 560, width: 900, height: 900, marginLeft: -450, borderRadius: 9999, background: `radial-gradient(circle, ${PURPLE}55 0%, ${PURPLE}1a 44%, transparent 70%)`, filter: "blur(18px)", transform: `scale(${auroraScale})` }} />
        <div style={{ position: "absolute", left: "50%", top: 720, width: 520, height: 520, marginLeft: -260, borderRadius: 9999, background: `radial-gradient(circle, ${GREEN}2a 0%, transparent 66%)`, opacity: haloOpacity }} />
      </AbsoluteFill>

      {/* scanlines */}
      <AbsoluteFill style={{ opacity: 0.13, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />

      {/* HUD corners */}
      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => {
        const { b, ...pos } = c;
        const o = interpolate(frame, [0, 18], [0, 0.6], { extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: o, ...b }} />;
      })}

      {/* top signal badge (Reels-safe band) */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${12 + dotPulse * 14}px ${GREEN}`, opacity: dotPulse }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 7, color: GREEN }}>GL1TCH · SIGNAL_LIVE</div>
      </div>

      {/* MASCOT — chromatic split layers + main */}
      <Mascot color={GREEN} dx={split} opacity={inGlitch ? 0.6 : 0.28} />
      <Mascot color={PURPLE} dx={-split} opacity={inGlitch ? 0.6 : 0.28} />
      <Mascot dx={0} opacity={0.98 * enter} />

      {/* rotating hook line */}
      <div style={{ position: "absolute", top: 1300, left: 0, right: 0, textAlign: "center", padding: "0 60px", opacity: hookOpacity }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <div style={{ position: "absolute", top: 2, left: 4, fontSize: 76, fontWeight: 800, letterSpacing: -2, color: PURPLE, opacity: 0.5 }}>{hook}</div>
          <div style={{ position: "absolute", top: -2, left: -4, fontSize: 76, fontWeight: 800, letterSpacing: -2, color: GREEN, opacity: 0.5 }}>{hook}</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{hook}</div>
        </div>
      </div>

      {/* chips above Reels bottom UI */}
      <div style={{ position: "absolute", bottom: 470, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
        {chips.map((b, i) => {
          const s = spring({ frame: frame - (30 + i * 6), fps, config: { damping: 14, stiffness: 110 } });
          return (
            <div key={b} style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: 2, color: i === 0 ? INK : GREEN, background: i === 0 ? GREEN : "rgba(5,5,5,0.78)", border: `1px solid ${i === 0 ? GREEN : "rgba(124,255,79,0.32)"}`, borderRadius: 9999, padding: "12px 26px", boxShadow: i === 0 ? `0 0 22px ${GREEN}55` : "none", fontWeight: i === 0 ? 700 : 400, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`, opacity: interpolate(s, [0, 1], [0, 1]) }}>{b}</div>
          );
        })}
        <div style={{ width: 12, height: 36, background: GREEN, marginLeft: 2, alignSelf: "center", opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 14px ${GREEN}` }} />
      </div>
    </AbsoluteFill>
  );
};
