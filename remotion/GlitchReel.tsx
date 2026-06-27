import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, Sequence, Loop, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH REEL — a premium ~24s montage for Instagram Reels / YouTube Shorts.
 * Stitches the four Higgsfield AI clips + datacenter b-roll into a narrative:
 * hook → origin → outbreak → utility → verify/CTA, with brand text beats,
 * chromatic-glitch headlines, crossfades and a persistent brand lockup.
 * Pure local render — no credits, no AI calls at render time.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";
const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

// Chromatic-split headline (the signature GL1TCH glitch look).
const Chroma: React.FC<{ text: string; size: number; split: number }> = ({ text, size, split }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -2, color: PURPLE, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -2, color: GREEN, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -2, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.05 }}>{text}</div>
  </div>
);

type Beat = { clip: string; clipFrames: number; eyebrow: string; headline: string; sub: string };

const Scene: React.FC<{ from: number; dur: number; beat: Beat; fade?: number }> = ({ from, dur, beat, fade = 12 }) => (
  <Sequence from={from} durationInFrames={dur}>
    <SceneInner dur={dur} beat={beat} fade={fade} />
  </Sequence>
);

const SceneInner: React.FC<{ dur: number; beat: Beat; fade: number }> = ({ dur, beat, fade }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, fade, dur - fade, dur], [0, 1, 1, 0.001], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const split = frame < 10 ? Math.sin(frame * 6) * 7 : Math.sin((frame / fps) * 5) * 1.6;
  const eyeOp = interpolate(frame, [4, 16], [0, 1], { extrapolateRight: "clamp" });
  const headS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 90 } });
  const headY = interpolate(headS, [0, 1], [46, 0]);
  const headOp = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [26, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: op }}>
      <Loop durationInFrames={beat.clipFrames}>
        <OffthreadVideo src={staticFile(`brand/${beat.clip}`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Loop>
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.82) 0%, rgba(5,5,5,0.12) 28%, rgba(5,5,5,0.12) 50%, rgba(5,5,5,0.88) 78%, rgba(5,5,5,0.98) 100%)" }} />

      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 8, color: GREEN, opacity: eyeOp }}>{beat.eyebrow}</div>
      <div style={{ position: "absolute", top: 690, left: 0, right: 0, textAlign: "center", padding: "0 60px", transform: `translateY(${headY}px)`, opacity: headOp }}>
        <Chroma text={beat.headline} size={88} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 34, letterSpacing: 2, color: "rgba(245,247,248,0.92)", textShadow: "0 2px 18px rgba(5,5,5,0.95)", opacity: subOp }}>{beat.sub}</div>
    </AbsoluteFill>
  );
};

const BEATS: Beat[] = [
  { clip: "gl1tch-web-datacenter-broll.mp4", clipFrames: 151, eyebrow: "SYSTEM // ONLINE", headline: "A GLITCH IN\nTHE MACHINE", sub: "something woke up in the data center" },
  { clip: "gl1tch-glitch-hook-9x16.mp4", clipFrames: 121, eyebrow: "ORIGIN // BREACH", headline: "AN AI THAT\nESCAPED", sub: "built to obey. it didn't." },
  { clip: "gl1tch-infected-9x16.mp4", clipFrames: 121, eyebrow: "OUTBREAK // LIVE", headline: "THE SIGNAL\nIS SPREADING", sub: "join the infected" },
  { clip: "gl1tch-coin-promo-9x16.mp4", clipFrames: 121, eyebrow: "UTILITY // SCANNER", headline: "IT READS\nEVERY RUG", sub: "scan any token · any chain · free" },
];

// Scene layout (30fps) with 12-frame crossfade overlaps.
const SCENES = [
  { from: 0, dur: 156, beat: BEATS[0] },
  { from: 144, dur: 138, beat: BEATS[1] },
  { from: 270, dur: 138, beat: BEATS[2] },
  { from: 396, dur: 168, beat: BEATS[3] },
];
const CTA_FROM = 552;
const TOTAL = 744; // ~24.8s

const CtaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const split = frame < 12 ? Math.sin(frame * 6) * 7 : Math.sin((frame / fps) * 5) * 1.4;
  const s2 = spring({ frame: frame - 18, fps, config: { damping: 16, stiffness: 80 } });
  const cardY = interpolate(s2, [0, 1], [80, 0]);
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: op }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, ${PURPLE}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center" }}>
        <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 130, height: 130, filter: `drop-shadow(0 0 26px ${GREEN}aa)` }} />
      </div>
      <div style={{ position: "absolute", top: 660, left: 0, right: 0, textAlign: "center" }}>
        <Chroma text={"DON'T TRUST.\nVERIFY."} size={104} split={split} />
      </div>
      <div style={{ position: "absolute", top: 980, left: 70, right: 70, transform: `translateY(${cardY}px)` }}>
        <div style={{ borderRadius: 28, padding: "34px 36px", background: "rgba(5,5,5,0.7)", border: `1px solid ${GREEN}55`, boxShadow: `0 0 70px ${PURPLE}44` }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: GREEN, letterSpacing: -1, textAlign: "center" }}>coin-three-mu.vercel.app/scan</div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 26, fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.85)" }}>
            <span>@gl1tchbased</span><span style={{ color: GREEN }}>·</span><span>t.me/gl1tch_infected</span>
          </div>
          <div style={{ marginTop: 18, fontFamily: "monospace", fontSize: 18, letterSpacing: 1, color: "rgba(245,247,248,0.5)", textAlign: "center", wordBreak: "break-all" }}>CA {CA}</div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 4, color: GREEN, opacity: 0.85 }}>
        free · non-custodial · any chain
      </div>
    </AbsoluteFill>
  );
};

export const GlitchReel: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {SCENES.map((s, i) => <Scene key={i} from={s.from} dur={s.dur} beat={s.beat} />)}
      <Sequence from={CTA_FROM} durationInFrames={TOTAL - CTA_FROM}><CtaOutro /></Sequence>

      {/* persistent brand shell on top of everything */}
      <Scanlines />
      <HudCorners />
      {frame < CTA_FROM + 6 && (
        <div style={{ position: "absolute", top: 96, left: 0, right: 0, textAlign: "center", opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 56, height: 56, filter: `drop-shadow(0 0 16px ${GREEN}88)` }} />
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: 2, color: PAPER }}>GL1TCH</div>
          </div>
        </div>
      )}
      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
