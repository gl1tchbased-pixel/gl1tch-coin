import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { voiceEnv } from "./voiceData";
import { captions } from "./captions";

/**
 * GL1TCH talking mascot — the mascot "speaks" a brand line.
 * - SVD-animated mascot (real pixels move) as centerpiece
 * - Voice (Edge-TTS + digital/glitch FX) embedded as audio
 * - Audio-reactive talking pulse + mouth glow driven by per-frame amplitude
 * - Karaoke captions synced word-by-word to the voice
 * - 9:16 brand shell. Duration = voice length (~8.1s @ 30fps).
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

export const MascotTalking: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // amplitude for this frame (0..1), smoothed a touch with neighbours
  const amp = (voiceEnv[frame] ?? 0) * 0.6 + (voiceEnv[frame - 1] ?? 0) * 0.25 + (voiceEnv[frame + 1] ?? 0) * 0.15;

  const scanY = -(frame % 60);
  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
  const cornerO = interpolate(frame, [0, 18], [0, 0.6], { extrapolateRight: "clamp" });

  // mascot video region; talking pulse scales subtly with voice amplitude
  const videoTop = 360;
  const videoSize = 1080;
  const talkScale = 1 + amp * 0.05;

  // active caption phrase + karaoke word index
  const phrase = captions.find((c) => t >= c.start && t < c.end) ?? (t >= captions[captions.length - 1].end ? captions[captions.length - 1] : captions[0]);
  const words = phrase.text.split(" ");
  const wordDur = (phrase.end - phrase.start) / words.length;
  const spoken = Math.floor((t - phrase.start) / wordDur);
  const phraseOpacity = interpolate(t, [phrase.start - 0.15, phrase.start + 0.1, phrase.end - 0.1, phrase.end + 0.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Audio src={staticFile("brand/gl1tch-voice.mp3")} />

      {/* AI-animated mascot — talking pulse */}
      <AbsoluteFill style={{ transform: `scale(${talkScale})`, transformOrigin: "50% 52%" }}>
        <OffthreadVideo
          src={staticFile("brand/mascot-svd-loop.mp4")}
          style={{ position: "absolute", top: videoTop, left: "50%", marginLeft: -videoSize / 2, width: videoSize, height: videoSize, objectFit: "cover" }}
          muted
        />
      </AbsoluteFill>

      {/* mouth glow — pulses with voice amplitude (≈ mascot mouth position) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: videoTop + 560,
          width: 260,
          height: 120,
          marginLeft: -130,
          borderRadius: 9999,
          background: `radial-gradient(ellipse, ${GREEN}${Math.round(40 + amp * 120).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: "blur(10px)",
          opacity: 0.35 + amp * 0.65,
          transform: `scaleY(${0.6 + amp * 0.9})`,
        }}
      />

      {/* blend square clip into INK shell */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,1) 0%, rgba(5,5,5,0) 20%, rgba(5,5,5,0) 66%, rgba(5,5,5,1) 80%)" }} />

      {/* scanlines */}
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

      {/* top badge + live voice meter */}
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${12 + dotPulse * 14}px ${GREEN}`, opacity: dotPulse }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 7, color: GREEN }}>GL1TCH · TRANSMITTING</div>
      </div>

      {/* voice equalizer bars (amplitude) */}
      <div style={{ position: "absolute", top: 1290, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 7, height: 60 }}>
        {Array.from({ length: 13 }).map((_, i) => {
          const local = (voiceEnv[frame - (i - 6)] ?? amp);
          const h = 8 + local * 52 * (0.6 + 0.4 * Math.cos((i - 6) / 6));
          return <div key={i} style={{ width: 7, height: Math.max(6, h), background: GREEN, opacity: 0.5 + local * 0.5, boxShadow: `0 0 8px ${GREEN}` }} />;
        })}
      </div>

      {/* karaoke caption */}
      <div style={{ position: "absolute", top: 1400, left: 0, right: 0, textAlign: "center", padding: "0 70px", opacity: phraseOpacity }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>
          {words.map((w, i) => {
            const state = i < spoken ? "done" : i === spoken ? "now" : "next";
            const color = state === "now" ? PAPER : state === "done" ? GREEN : "rgba(245,247,248,0.32)";
            const glow = state === "now" ? `0 0 26px ${GREEN}, 0 4px 30px rgba(5,5,5,0.9)` : state === "done" ? `0 0 10px ${GREEN}55` : "none";
            return (
              <span key={i} style={{ color, textShadow: glow, margin: "0 8px", display: "inline-block", transform: state === "now" ? "translateY(-4px) scale(1.04)" : "none" }}>{w}</span>
            );
          })}
        </div>
      </div>

      {/* CTA chip */}
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: interpolate(t, [5.0, 5.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <div style={{ fontFamily: "monospace", fontSize: 30, letterSpacing: 3, color: INK, background: GREEN, borderRadius: 9999, padding: "14px 30px", fontWeight: 700, boxShadow: `0 0 26px ${GREEN}66`, transform: `scale(${1 + interpolate(spring({ frame: frame - 150, fps, config: { damping: 12 } }), [0, 1], [0, 0.0])})` }}>
          $GL1TCH · SOLANA
        </div>
      </div>
    </AbsoluteFill>
  );
};
