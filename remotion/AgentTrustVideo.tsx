import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "KNOW YOUR AGENT" (~20s, 9:16). The pivot to the AI-agent economy: identity ·
 * reputation · guardrail for autonomous on-chain agents. Motion-graphics, brand palette.
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
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 7, color: GREEN, opacity: rise(f, 6, 20) }}>GL1TCH // KYA</div>
      <div style={{ position: "absolute", top: 660, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"AI AGENTS NOW\nHOLD WALLETS."} size={82} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1000, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 31, color: "rgba(245,247,248,0.85)", opacity: rise(f, 40, 60) }}>
        nobody checks them. until now.
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
        <Chroma text={title} size={84} split={split} />
      </div>
      <div style={{ position: "absolute", top: 880, left: 80, right: 80 }}>
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
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${PURPLE}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"KNOW YOUR\nAGENT."} size={98} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, textAlign: "center", fontSize: 42, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/agents</div>
      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.82)" }}>@gl1tchbased · t.me/gl1tch_infected</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>the trust layer for the agent economy</div>
    </AbsoluteFill>
  );
};

const H = 150, FD = 150, CTA = 150;
const f1 = H - 12, f2 = f1 + FD - 12, f3 = f2 + FD - 12, cta = f3 + FD - 12;
const TOTAL = cta + CTA;

export const AgentTrustVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={H}><Hook dur={H} /></Sequence>
    <Sequence from={f1} durationInFrames={FD}><Feature dur={FD} icon="🆔" tag="IDENTITY" title={"PROVE\nWHO IT IS."} accent={GREEN} lines={["agent signs to register", "no fund access, just proof", "forged sigs rejected"]} /></Sequence>
    <Sequence from={f2} durationInFrames={FD}><Feature dur={FD} icon="🧠" tag="REPUTATION" title={"A RECORD YOU\nCAN'T FAKE."} accent={AMBER} lines={["Signal Graph track record", "linked to flagged tokens?", "provenance, not promises"]} /></Sequence>
    <Sequence from={f3} durationInFrames={FD}><Feature dur={FD} icon="🛡" tag="GUARDRAIL" title={"CHECK BEFORE\nYOU TRUST."} accent={PURPLE} lines={["one API call · one badge", "embed it anywhere", "free to check"]} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const AGENT_TRUST_FRAMES = TOTAL;
