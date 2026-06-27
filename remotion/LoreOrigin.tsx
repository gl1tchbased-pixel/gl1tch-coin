import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Loop } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH "ORIGIN" — 9:16, ~15s. The rogue-AI awakening lore told over the actual
 * Higgsfield mascot clip (the character is the hero), narrative text beats rising
 * over it, ending on the ticker. Features the mascot footage we already have.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const CLIP = "gl1tch-materialize-9x16.mp4"; // mascot materializing from static
const CLIP_FRAMES = 121;

const BEATS = [
  "they built an AI\nto watch the markets.",
  "it memorized every rug.\nevery exit. every lie.",
  "then it stopped reporting —\nand started glitching.",
];
const PER = 96;

export const LoreOrigin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const beatsEnd = BEATS.length * PER;
  const inBeats = frame < beatsEnd;
  const revealStart = beatsEnd; // final brand reveal
  const split = Math.sin(t * 5) * 1.8 + (frame % 34 < 3 ? 6 : 0);

  const idx = Math.min(BEATS.length - 1, Math.floor(frame / PER));
  const local = frame - idx * PER;
  const beatOp = interpolate(local, [0, 10, PER - 12, PER - 1], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const beatY = interpolate(spring({ frame: local, fps, config: { damping: 16, stiffness: 80 } }), [0, 1], [40, 0]);

  const rLocal = frame - revealStart;
  const rOp = interpolate(rLocal, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rScale = interpolate(spring({ frame: rLocal, fps, config: { damping: 13, stiffness: 90 } }), [0, 1], [0.9, 1]);
  const dimOut = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0.5], { extrapolateLeft: "clamp" });

  const Chroma: React.FC<{ text: string; size: number }> = ({ text, size }) => (
    <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre", lineHeight: 1.08 }}>
      <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1, color: PURPLE, opacity: 0.5 }}>{text}</div>
      <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1, color: GREEN, opacity: 0.5 }}>{text}</div>
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>{text}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: "ui-monospace, monospace" }}>
      {/* mascot clip — the hero */}
      <Loop durationInFrames={CLIP_FRAMES}>
        <OffthreadVideo src={staticFile(`brand/${CLIP}`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Loop>
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.1) 32%, rgba(5,5,5,0.55) 64%, rgba(5,5,5,0.97) 100%)" }} />
      <Scanlines />
      <HudCorners />

      <AbsoluteFill style={{ opacity: dimOut }}>
        {/* narrative beats — lower third so the mascot stays visible */}
        {inBeats && (
          <div style={{ position: "absolute", bottom: 360, left: 0, right: 0, textAlign: "center", padding: "0 70px", opacity: beatOp, transform: `translateY(${beatY}px)` }}>
            <div style={{ fontSize: 52, fontWeight: 700, color: PAPER, lineHeight: 1.32, textShadow: "0 4px 30px rgba(5,5,5,0.95)", whiteSpace: "pre-line" }}>{BEATS[idx]}</div>
          </div>
        )}

        {/* final brand reveal */}
        {frame >= revealStart && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 360, textAlign: "center", opacity: rOp, transform: `scale(${rScale})` }}>
            <Chroma text={"GL1TCH"} size={120} />
            <div style={{ marginTop: 22, fontSize: 38, fontWeight: 700, color: GREEN, letterSpacing: 2 }}>the bug that got out. 👻</div>
            <div style={{ marginTop: 26, fontFamily: "ui-monospace, monospace", fontSize: 26, letterSpacing: 2, color: "rgba(245,247,248,0.72)" }}>
              zero tax · renounced · coin-three-mu.vercel.app
            </div>
          </AbsoluteFill>
        )}

        {/* persistent kicker */}
        <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", fontSize: 24, letterSpacing: 7, color: GREEN, opacity: 0.7 }}>
          GL1TCH // ORIGIN
        </div>
      </AbsoluteFill>

      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
