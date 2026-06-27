import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { voiceEnv } from "./voiceData";
import { captions } from "./captions";

/**
 * GL1TCH AI lip-sync mascot — REAL mouth movement.
 * Three AI-inpainted mouth visemes (closed / mid / open) of the mascot, all in
 * its own 3D style, swapped per-frame by the voice amplitude => the mouth & teeth
 * genuinely move with speech. + voice + karaoke captions + brand shell. 9:16.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const VISEMES = ["brand/mouth-closed.png", "brand/mouth-mid.png", "brand/mouth-open.png"];

export const MascotLipsync: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // smoothed amplitude over a small window (reduces flicker)
  const a = (voiceEnv[frame] ?? 0) * 0.5 + (voiceEnv[frame - 1] ?? 0) * 0.2 + (voiceEnv[frame + 1] ?? 0) * 0.2 + (voiceEnv[frame - 2] ?? 0) * 0.1;
  const amp = Math.min(1, a);
  // viseme by amplitude bands
  const viseme = amp < 0.13 ? 0 : amp < 0.42 ? 1 : 2;

  // idle motion on the whole head image
  const bob = Math.sin(t * Math.PI * 0.9) * 14;
  const sway = Math.sin(t * Math.PI * 0.55) * 7;
  const breathe = 1 + Math.sin(t * Math.PI * 1.1) * 0.02;
  const imgTop = 250;
  const imgW = 1120;
  const headTransform = `translateX(${sway}px) translateY(${bob}px) scale(${breathe})`;

  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const scanY = -(frame % 60);
  const cornerO = interpolate(frame, [0, 16], [0, 0.55], { extrapolateRight: "clamp" });

  const phrase = captions.find((c) => t >= c.start && t < c.end) ?? (t >= captions[captions.length - 1].end ? captions[captions.length - 1] : captions[0]);
  const words = phrase.text.split(" ");
  const wordDur = (phrase.end - phrase.start) / words.length;
  const spoken = Math.floor((t - phrase.start) / wordDur);
  const phraseOpacity = interpolate(t, [phrase.start - 0.15, phrase.start + 0.1, phrase.end - 0.1, phrase.end + 0.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Audio src={staticFile("brand/gl1tch-voice.mp3")} />

      {/* viseme stack — only the active mouth state is shown (real mouth swap) */}
      <div style={{ position: "absolute", left: "50%", top: imgTop, width: imgW, height: imgW, marginLeft: -imgW / 2, transform: headTransform, transformOrigin: "50% 45%", filter: `drop-shadow(0 30px 70px ${PURPLE}55) drop-shadow(0 0 40px ${GREEN}22)` }}>
        {VISEMES.map((src, i) => (
          <Img key={src} src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === viseme ? 1 : 0 }} />
        ))}
      </div>

      {/* blend into INK shell */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,1) 0%, rgba(5,5,5,0) 16%, rgba(5,5,5,0) 62%, rgba(5,5,5,1) 80%)" }} />
      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px`, pointerEvents: "none" }} />

      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: cornerO, ...b }} />; })}

      <div style={{ position: "absolute", top: 270, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${12 + dotPulse * 14}px ${GREEN}`, opacity: dotPulse }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 7, color: GREEN }}>GL1TCH · TRANSMITTING</div>
      </div>

      <div style={{ position: "absolute", top: 1300, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 7, height: 60 }}>
        {Array.from({ length: 13 }).map((_, i) => {
          const local = voiceEnv[frame - (i - 6)] ?? amp;
          const h = 8 + local * 52 * (0.6 + 0.4 * Math.cos((i - 6) / 6));
          return <div key={i} style={{ width: 7, height: Math.max(6, h), background: GREEN, opacity: 0.5 + local * 0.5, boxShadow: `0 0 8px ${GREEN}` }} />;
        })}
      </div>

      <div style={{ position: "absolute", top: 1410, left: 0, right: 0, textAlign: "center", padding: "0 70px", opacity: phraseOpacity }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>
          {words.map((w, i) => {
            const state = i < spoken ? "done" : i === spoken ? "now" : "next";
            const color = state === "now" ? PAPER : state === "done" ? GREEN : "rgba(245,247,248,0.30)";
            const glow = state === "now" ? `0 0 26px ${GREEN}, 0 4px 30px rgba(5,5,5,0.9)` : state === "done" ? `0 0 10px ${GREEN}55` : "none";
            return <span key={i} style={{ color, textShadow: glow, margin: "0 8px", display: "inline-block", transform: state === "now" ? "translateY(-4px) scale(1.05)" : "none" }}>{w}</span>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
