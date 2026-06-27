import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Series, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";
import { voiceEnv } from "./voiceData";
import { captions } from "./captions";

/**
 * GL1TCH — produced talking-mascot Shorts (the professional cut).
 * Cold open (glitch) -> talking mascot (voice + karaoke + audio-reactive) -> CTA outro,
 * with glitch transitions and a consistent brand grade. 9:16, ~12s @ 30fps.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${-(frame % 60)}px`, pointerEvents: "none" }} />;
};

export const HudCorners: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 16], [0, 0.55], { extrapolateRight: "clamp" });
  const C = [
    { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
    { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
    { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
    { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
  ];
  return <>{C.map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: o, ...b }} />; })}</>;
};

/** Brief glitch flash overlay for the first `len` frames of a scene. */
export const GlitchIn: React.FC<{ len?: number }> = ({ len = 7 }) => {
  const frame = useCurrentFrame();
  if (frame >= len) return null;
  const a = 1 - frame / len;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: PAPER, opacity: a * 0.5, mixBlendMode: "overlay" }} />
      {Array.from({ length: 6 }).map((_, i) => {
        const y = random(`g${i}${frame}`) * 1920;
        const h = 8 + random(`h${i}${frame}`) * 60;
        const dx = (random(`d${i}${frame}`) - 0.5) * 80;
        return <div key={i} style={{ position: "absolute", left: dx, top: y, width: "100%", height: h, background: i % 2 ? `${GREEN}55` : `${PURPLE}55`, mixBlendMode: "screen", opacity: a }} />;
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- COLD OPEN
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const txt = "INCOMING SIGNAL";
  const shown = Math.floor(interpolate(frame, [4, 22], [0, txt.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cursorOn = Math.floor(frame / 6) % 2 === 0;
  const split = frame > 26 ? Math.sin(frame * 13) * 8 : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: "center", justifyContent: "center" }}>
      <Scanlines opacity={0.16} />
      <HudCorners />
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: -split, fontFamily: "monospace", fontSize: 64, fontWeight: 700, letterSpacing: 4, color: PURPLE, opacity: 0.55, whiteSpace: "pre" }}>{txt.slice(0, shown)}</div>
        <div style={{ position: "absolute", left: split, fontFamily: "monospace", fontSize: 64, fontWeight: 700, letterSpacing: 4, color: GREEN, opacity: 0.5, whiteSpace: "pre" }}>{txt.slice(0, shown)}</div>
        <div style={{ fontFamily: "monospace", fontSize: 64, fontWeight: 700, letterSpacing: 4, color: PAPER, whiteSpace: "pre" }}>{txt.slice(0, shown)}</div>
        <div style={{ width: 26, height: 60, marginLeft: 10, background: GREEN, opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 16px ${GREEN}` }} />
      </div>
      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- TALKING
export const Talking: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const amp = (voiceEnv[frame] ?? 0) * 0.6 + (voiceEnv[frame - 1] ?? 0) * 0.25 + (voiceEnv[frame + 1] ?? 0) * 0.15;
  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const videoTop = 330;
  const videoSize = 1080;
  const talkScale = 1 + amp * 0.055;

  const phrase = captions.find((c) => t >= c.start && t < c.end) ?? (t >= captions[captions.length - 1].end ? captions[captions.length - 1] : captions[0]);
  const words = phrase.text.split(" ");
  const wordDur = (phrase.end - phrase.start) / words.length;
  const spoken = Math.floor((t - phrase.start) / wordDur);
  const phraseOpacity = interpolate(t, [phrase.start - 0.15, phrase.start + 0.1, phrase.end - 0.1, phrase.end + 0.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Audio src={staticFile("brand/gl1tch-voice.mp3")} />
      <AbsoluteFill style={{ transform: `scale(${talkScale})`, transformOrigin: "50% 50%" }}>
        <OffthreadVideo src={staticFile("brand/mascot-svd-loop.mp4")} style={{ position: "absolute", top: videoTop, left: "50%", marginLeft: -videoSize / 2, width: videoSize, height: videoSize, objectFit: "cover" }} muted />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: "50%", top: videoTop + 545, width: 260, height: 120, marginLeft: -130, borderRadius: 9999, background: `radial-gradient(ellipse, ${GREEN} 0%, transparent 70%)`, filter: "blur(12px)", opacity: 0.2 + amp * 0.7, transform: `scaleY(${0.5 + amp})` }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,1) 0%, rgba(5,5,5,0) 18%, rgba(5,5,5,0) 64%, rgba(5,5,5,1) 80%)" }} />
      <Scanlines />
      <HudCorners />
      <div style={{ position: "absolute", top: 280, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${12 + dotPulse * 14}px ${GREEN}`, opacity: dotPulse }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 7, color: GREEN }}>GL1TCH · TRANSMITTING</div>
      </div>
      {/* equalizer */}
      <div style={{ position: "absolute", top: 1280, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 7, height: 60 }}>
        {Array.from({ length: 13 }).map((_, i) => {
          const local = voiceEnv[frame - (i - 6)] ?? amp;
          const h = 8 + local * 52 * (0.6 + 0.4 * Math.cos((i - 6) / 6));
          return <div key={i} style={{ width: 7, height: Math.max(6, h), background: GREEN, opacity: 0.5 + local * 0.5, boxShadow: `0 0 8px ${GREEN}` }} />;
        })}
      </div>
      {/* karaoke caption */}
      <div style={{ position: "absolute", top: 1390, left: 0, right: 0, textAlign: "center", padding: "0 70px", opacity: phraseOpacity }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>
          {words.map((w, i) => {
            const state = i < spoken ? "done" : i === spoken ? "now" : "next";
            const color = state === "now" ? PAPER : state === "done" ? GREEN : "rgba(245,247,248,0.30)";
            const glow = state === "now" ? `0 0 26px ${GREEN}, 0 4px 30px rgba(5,5,5,0.9)` : state === "done" ? `0 0 10px ${GREEN}55` : "none";
            return <span key={i} style={{ color, textShadow: glow, margin: "0 8px", display: "inline-block", transform: state === "now" ? "translateY(-4px) scale(1.05)" : "none" }}>{w}</span>;
          })}
        </div>
      </div>
      <GlitchIn />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- CTA OUTRO
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 15 } });
  const split = Math.sin(frame * 1.4) * 4 + 4;
  const cursorOn = Math.floor(frame / 14) % 2 === 0;
  const bob = Math.sin(frame / fps * Math.PI) * 12;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Scanlines />
      <HudCorners />
      <OffthreadVideo src={staticFile("brand/mascot-svd-loop.mp4")} style={{ position: "absolute", top: 250, left: "50%", marginLeft: -300, width: 600, height: 600, objectFit: "cover", opacity: 0.9 * inS, transform: `translateY(${bob}px)`, filter: `drop-shadow(0 0 40px ${PURPLE}55)` }} muted />
      <div style={{ position: "absolute", top: 940, left: 0, right: 0, textAlign: "center", transform: `translateY(${interpolate(inS, [0, 1], [40, 0])}px)`, opacity: inS }}>
        <div style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
          <div style={{ position: "absolute", left: -split, top: -2, fontSize: 168, fontWeight: 800, letterSpacing: -8, color: PURPLE, opacity: 0.5 }}>GL1TCH</div>
          <div style={{ position: "absolute", left: split, top: 2, fontSize: 168, fontWeight: 800, letterSpacing: -8, color: GREEN, opacity: 0.5 }}>GL1TCH</div>
          <div style={{ fontSize: 168, fontWeight: 800, letterSpacing: -8, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>GL1TCH</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 34, letterSpacing: 6, color: GREEN, opacity: interpolate(frame, [10, 26], [0, 1], { extrapolateRight: "clamp" }) }}>
        0% TAX · MINT RENOUNCED
      </div>
      <div style={{ position: "absolute", top: 1280, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [18, 34], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ fontFamily: "monospace", fontSize: 38, letterSpacing: 3, color: INK, background: GREEN, borderRadius: 9999, padding: "16px 34px", fontWeight: 700, boxShadow: `0 0 26px ${GREEN}66` }}>$GL1TCH · SOLANA</div>
        <div style={{ width: 14, height: 44, background: GREEN, opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 14px ${GREEN}` }} />
      </div>
      <div style={{ position: "absolute", top: 1410, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 4, color: "rgba(245,247,248,0.6)", opacity: interpolate(frame, [24, 40], [0, 1], { extrapolateRight: "clamp" }) }}>
        coin-three-mu.vercel.app · pump.fun
      </div>
      <GlitchIn />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- SERIES
export const MascotProduced: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Series>
      <Series.Sequence durationInFrames={34}><ColdOpen /></Series.Sequence>
      <Series.Sequence durationInFrames={voiceEnv.length + 12}><Talking /></Series.Sequence>
      <Series.Sequence durationInFrames={74}><Outro /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
