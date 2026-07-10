import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "PROVABLY FAIR. VERIFY IT YOURSELF." (~23s, 9:16). Quantum Randomness launch:
 * verifiable RNG-as-a-service · commit→reveal→verify · provably-fair giveaways with a
 * shareable proof. Motion-graphics only, brand palette, no reused AI clips.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const AMBER = "#FFD14F";
const INK = "#050505";
const PAPER = "#F5F7F8";
const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);
const seg = (f: number, s: number, e: number, d = 12) => interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0], C);

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.06 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.06 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.06 }}>{text}</div>
  </div>
);

const Hook: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 7 : 1.4;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 34%, ${GREEN}18 0%, transparent 58%)` }} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 7, color: GREEN, opacity: rise(f, 6, 20) }}>GL1TCH // QUANTUM RANDOMNESS</div>
      <div style={{ position: "absolute", top: 680, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"PROVABLY\nFAIR."} size={128} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 31, color: "rgba(245,247,248,0.85)", opacity: rise(f, 40, 60) }}>
        don&apos;t trust us — verify it yourself.
      </div>
    </AbsoluteFill>
  );
};

const Feature: React.FC<{ dur: number; icon: string; tag: string; title: string; lines: string[]; accent: string }> = ({ dur, icon, tag, title, lines, accent }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 14, stiffness: 95 } });
  const split = f < 12 ? Math.sin(f * 6) * 5 : 1.2;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontSize: 150, transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})` }}>{icon}</div>
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 26, letterSpacing: 6, color: accent, opacity: rise(f, 10, 24) }}>{tag}</div>
      <div style={{ position: "absolute", top: 630, left: 0, right: 0, textAlign: "center", padding: "0 56px", transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)` }}>
        <Chroma text={title} size={86} split={split} />
      </div>
      <div style={{ position: "absolute", top: 900, left: 80, right: 80 }}>
        {lines.map((ln, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 18, opacity: rise(f, 30 + i * 12, 44 + i * 12) }}>
            <span style={{ width: 12, height: 12, borderRadius: 9999, background: accent, boxShadow: `0 0 12px ${accent}`, flex: "0 0 auto" }} />
            <span style={{ fontFamily: "monospace", fontSize: 33, color: "rgba(245,247,248,0.92)" }}>{ln}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 14) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${GREEN}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"DON'T TRUST.\nVERIFY."} size={100} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/quantum-core/random</div>
      <div style={{ position: "absolute", top: 1140, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.82)" }}>@gl1tchbased · t.me/gl1tch_infected</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free · holder-gated · non-custodial</div>
    </AbsoluteFill>
  );
};

const H = 150, FD = 150, CTA = 150;
const f1 = H - 12, f2 = f1 + FD - 12, f3 = f2 + FD - 12, cta = f3 + FD - 12;
const TOTAL = cta + CTA;

export const RandomnessVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={H}><Hook dur={H} /></Sequence>
    <Sequence from={f1} durationInFrames={FD}><Feature dur={FD} icon="🎲" tag="COMMIT → REVEAL" title={"NOBODY CAN\nRIG IT."} accent={GREEN} lines={["commit to a FUTURE round", "unknowable at commit time", "quantum-grade drand seed"]} /></Sequence>
    <Sequence from={f2} durationInFrames={FD}><Feature dur={FD} icon="🔍" tag="VERIFY IN-BROWSER" title={"ZERO TRUST\nIN US."} accent={AMBER} lines={["BLS-check the seed", "re-derive the result", "on your own device"]} /></Sequence>
    <Sequence from={f3} durationInFrames={FD}><Feature dur={FD} icon="🏆" tag="GIVEAWAYS" title={"PROVABLY-FAIR\nDRAWS."} accent={PURPLE} lines={["paste entrants, pick winners", "shareable proof + badge", "end the 'was it rigged?'"]} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const RANDOMNESS_FRAMES = TOTAL;
