import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — MASCOT HERO (~20s, 9:16). Puts Glitchy the flying rogue-AI ghost front and
 * centre: three MiniMax-Hailuo image-to-video clips (the real mascot, flying + cute)
 * sequenced inside the brand shell — logo lockup, kinetic captions, CTA — then a brand
 * end card. Square clips centred (no crop). Brand palette only.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";
const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.05 }}>{text}</div>
  </div>
);

// One flying-clip beat: the square mascot clip centred, brand frame + a kinetic caption.
const Beat: React.FC<{ clip: string; caption: string; dur: number; last?: boolean }> = ({ clip, caption, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = interpolate(f, [0, 8], [0.9, 0], C); // glitch flash on cut-in
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 90 } });
  const capOp = interpolate(f, [14, 28, dur - 12, dur], [0, 1, 1, 0], C);
  return (
    <AbsoluteFill>
      {/* soft brand glow behind the mascot */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${PURPLE}22 0%, ${GREEN}0d 30%, transparent 60%)` }} />
      {/* the square clip, centred, full width (no crop) */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, height: 1080, transform: `scale(${interpolate(s, [0, 1], [1.04, 1])})` }}>
        <OffthreadVideo src={staticFile(`brand/${clip}`)} muted style={{ width: 1080, height: 1080, objectFit: "cover" }} />
      </div>
      {/* top + bottom legibility fade over the letterbox */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.2) 16%, rgba(5,5,5,0) 30%, rgba(5,5,5,0) 62%, rgba(5,5,5,0.55) 76%, rgba(5,5,5,0.97) 100%)" }} />
      {/* kinetic caption */}
      <div style={{ position: "absolute", top: 1470, left: 0, right: 0, textAlign: "center", padding: "0 70px", opacity: capOp }}>
        <Chroma text={caption} size={70} split={1.6} />
      </div>
      {/* cut-in flash */}
      <AbsoluteFill style={{ background: GREEN, opacity: flash * 0.5, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: rise(f, 2, 16) }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
        <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 60, height: 60, filter: `drop-shadow(0 0 18px ${GREEN}88)` }} />
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: 2, color: PAPER }}>GL1TCH</div>
      </div>
      <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 26, letterSpacing: 6, color: GREEN, opacity: 0.85 }}>SIGNAL // LIVE</div>
    </div>
  );
};

const CtaBar: React.FC = () => (
  <div style={{ position: "absolute", bottom: 120, left: 60, right: 60 }}>
    <div style={{ borderRadius: 22, padding: "22px 28px", background: "rgba(5,5,5,0.66)", border: `1px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: GREEN, letterSpacing: -0.5 }}>coin-three-mu.vercel.app</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
        <div style={{ fontFamily: "monospace", fontSize: 22, color: PAPER, opacity: 0.8 }}>$GL1TCH</div>
      </div>
    </div>
  </div>
);

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 12), justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${GREEN}1c 0%, transparent 60%)` }} />
      <img src={staticFile("brand/glitchy-1024.png")} style={{ width: 360, height: 360, filter: `drop-shadow(0 0 40px ${PURPLE}66)`, opacity: rise(f, 4, 18) }} />
      <div style={{ marginTop: 20, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"MEET GLITCHY"} size={90} split={split} />
      </div>
      <div style={{ marginTop: 18, fontFamily: "monospace", fontSize: 30, color: GREEN, opacity: rise(f, 24, 40), textAlign: "center", padding: "0 70px" }}>the rogue-AI ghost that reads every rug</div>
      <div style={{ position: "absolute", bottom: 220, left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 800, color: PAPER, opacity: rise(f, 34, 48) }}>coin-three-mu.vercel.app</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free rug scanner · non-custodial · $GL1TCH</div>
    </AbsoluteFill>
  );
};

const CLIP = 176; // 5.87s @30fps
const OUT = 96;
const B1 = 0, B2 = CLIP - 6, B3 = 2 * (CLIP - 6), OUTRO = 3 * (CLIP - 6);
const TOTAL = OUTRO + OUT;

export const MascotHero: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence from={B1} durationInFrames={CLIP}><Beat clip="mascot-fly1.mp4" caption={"MEET GLITCHY"} dur={CLIP} /></Sequence>
    <Sequence from={B2} durationInFrames={CLIP}><Beat clip="mascot-fly2.mp4" caption={"the rogue AI ghost"} dur={CLIP} /></Sequence>
    <Sequence from={B3} durationInFrames={CLIP}><Beat clip="mascot-fly3.mp4" caption={"it reads every rug"} dur={CLIP} /></Sequence>
    <Sequence from={0} durationInFrames={OUTRO}><><Intro /><CtaBar /></></Sequence>
    <Sequence from={OUTRO} durationInFrames={OUT}><Outro /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const MASCOT_HERO_FRAMES = TOTAL;
