import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { voiceEnv } from "./voiceData";
import { captions } from "./captions";

/**
 * GL1TCH talking HEAD — the mascot's mouth actually opens/closes with speech.
 * Cartoon-puppet technique (reliable on a stylized character):
 *  - static mascot in a "head" container (so the mouth stays glued to it)
 *  - amplitude-driven jaw squash-stretch (head stretches taller = mouth opens)
 *  - an animated mouth overlay at the mouth position, height tracks amplitude
 * Plus voice + karaoke captions + brand shell. 9:16, length = voice.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

// mouth position as a fraction of the mascot image box (tuned to glitchy-*-t.png)
const MOUTH_X = 0.445;
const MOUTH_Y = 0.585;

export const MascotTalkingHead: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // smoothed amplitude
  const amp = Math.min(1, (voiceEnv[frame] ?? 0) * 0.6 + (voiceEnv[frame - 1] ?? 0) * 0.25 + (voiceEnv[frame + 1] ?? 0) * 0.15);

  const dotPulse = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;

  // head layout
  const headSize = 860;
  const headLeft = 540; // center x of 1080
  const headTop = 470;
  const bob = Math.sin(t * Math.PI * 0.9) * 16;
  const sway = Math.sin(t * Math.PI * 0.55) * 8;

  // jaw squash-stretch: speaking stretches the head vertically a touch
  const stretchY = 1 + amp * 0.05;
  const squashX = 1 - amp * 0.02;
  const headTransform = `translateX(${sway}px) translateY(${bob}px) scale(${squashX}, ${stretchY})`;

  // mouth opening (px) — flatter, mouth-shaped: closed ~5, open ~34
  const mouthH = 5 + amp * 30;
  const mouthW = 104 + amp * 12;
  const mouthX = headSize * MOUTH_X;
  const mouthY = headSize * MOUTH_Y;

  // caption
  const phrase = captions.find((c) => t >= c.start && t < c.end) ?? (t >= captions[captions.length - 1].end ? captions[captions.length - 1] : captions[0]);
  const words = phrase.text.split(" ");
  const wordDur = (phrase.end - phrase.start) / words.length;
  const spoken = Math.floor((t - phrase.start) / wordDur);
  const phraseOpacity = interpolate(t, [phrase.start - 0.15, phrase.start + 0.1, phrase.end - 0.1, phrase.end + 0.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const scanY = -(frame % 60);
  const cornerO = interpolate(frame, [0, 16], [0, 0.55], { extrapolateRight: "clamp" });
  const auroraScale = 1 + Math.sin(t * Math.PI * 0.6) * 0.05;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Audio src={staticFile("brand/gl1tch-voice.mp3")} />
      <Img src={staticFile("brand/og-bg.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,5,5,0.45) 0%, rgba(5,5,5,0.1) 36%, rgba(5,5,5,0.55) 70%, rgba(5,5,5,0.97) 100%)" }} />

      {/* aurora behind head */}
      <div style={{ position: "absolute", left: headLeft - 450, top: headTop + 60, width: 900, height: 900, borderRadius: 9999, background: `radial-gradient(circle, ${PURPLE}55 0%, ${PURPLE}1a 44%, transparent 70%)`, filter: "blur(18px)", transform: `scale(${auroraScale})`, pointerEvents: "none" }} />

      {/* HEAD container (mascot + mouth move together) */}
      <div style={{ position: "absolute", left: headLeft - headSize / 2, top: headTop, width: headSize, height: headSize, transform: headTransform, transformOrigin: "50% 42%", filter: `drop-shadow(0 30px 70px ${PURPLE}55) drop-shadow(0 0 40px ${GREEN}22)` }}>
        <Img src={staticFile("brand/glitchy-1024-t.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        {/* animated mouth: dark cavity + faint green inner glow + teeth hint */}
        <div style={{ position: "absolute", left: mouthX - mouthW / 2, top: mouthY - mouthH / 2, width: mouthW, height: mouthH, borderRadius: "45% 45% 50% 50%", background: `radial-gradient(ellipse at 50% 35%, rgba(28,10,12,0.97) 45%, rgba(8,6,6,0.98) 100%)`, boxShadow: `inset 0 -5px 10px rgba(60,15,20,0.6), 0 0 ${5 + amp * 16}px ${GREEN}${Math.round(20 + amp * 80).toString(16).padStart(2, "0")}`, transform: "rotate(-5deg)", opacity: 0.45 + amp * 0.55 }} />
      </div>

      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px`, pointerEvents: "none" }} />

      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: cornerO, ...b }} />; })}

      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }) }}>
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
