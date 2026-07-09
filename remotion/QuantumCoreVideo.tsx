import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "QUANTUM CORE" (~28s, 9:16). What it is, how it's used, what you gain:
 * Vault · Draw · Seal · Forge + the zero-trust proof story. Motion-graphics, brand palette.
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
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, ${PURPLE}22 0%, transparent 58%)` }} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 7, color: GREEN, opacity: rise(f, 6, 20) }}>GL1TCH // QUANTUM CORE</div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"REAL QUANTUM\nTECH."} size={92} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1000, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 33, color: "rgba(245,247,248,0.85)", opacity: rise(f, 40, 60) }}>
        no hype. just proof.
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
        <Chroma text={title} size={82} split={split} />
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
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${GREEN}1c 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 680, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"QUANTUM\nCORE."} size={104} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1050, left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/quantum-core</div>
      <div style={{ position: "absolute", top: 1128, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.82)" }}>@gl1tchbased · t.me/gl1tch_infected</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>real quantum tech · hold $GL1TCH to unlock</div>
    </AbsoluteFill>
  );
};

const H = 140, FD = 128, CTA = 150;
const f1 = H - 12, f2 = f1 + FD - 12, f3 = f2 + FD - 12, f4 = f3 + FD - 12, f5 = f4 + FD - 12, cta = f5 + FD - 12;
const TOTAL = cta + CTA;

export const QuantumCoreVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={H}><Hook dur={H} /></Sequence>
    <Sequence from={f1} durationInFrames={FD}><Feature dur={FD} icon="🔬" tag="READINESS" title={"SCORE ANY\nTOKEN."} accent={GREEN} lines={["paste a token → 0–100", "authority · custody · deployer", "free, any chain"]} /></Sequence>
    <Sequence from={f2} durationInFrames={FD}><Feature dur={FD} icon="🎲" tag="PROVABLY FAIR" title={"WIN — THEN\nVERIFY IT."} accent={PURPLE} lines={["seeded by a real quantum pulse", "NIST CURBy · commit-reveal", "recompute the winner yourself"]} /></Sequence>
    <Sequence from={f3} durationInFrames={FD}><Feature dur={FD} icon="🔐" tag="POST-QUANTUM" title={"ENCRYPT FOR\nTHE FUTURE."} accent={AMBER} lines={["ML-KEM-768, in your browser", "server never sees plaintext", "quantum-safe today"]} /></Sequence>
    <Sequence from={f4} durationInFrames={FD}><Feature dur={FD} icon="⚛️" tag="QUANTUM-INSPIRED" title={"SOLVE HARD\nPROBLEMS."} accent={GREEN} lines={["QUBO / annealing optimizer", "your constraints, solved", "honestly labelled"]} /></Sequence>
    <Sequence from={f5} durationInFrames={FD}><Feature dur={FD} icon="🛰" tag="ZERO TRUST" title={"DON'T TRUST.\nVERIFY."} accent={PURPLE} lines={["CURBy quantum + drand BLS", "tamper-evident beacon", "checked in YOUR browser"]} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const QUANTUM_CORE_FRAMES = TOTAL;
