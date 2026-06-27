import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "6 CHAINS, 1 SCANNER" (~22s, 9:16). Original kinetic-typography feature
 * explainer: most rug-checkers are one-chain; GL1TCH reads them all. An animated grid
 * of chain chips lights up green under a scan pulse. No reused clips. Brand palette.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";
const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);

const CHAINS = ["Solana", "Ethereum", "BNB Chain", "Base", "Arbitrum", "Polygon", "Optimism", "Avalanche", "zkSync", "Linea"];

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.06 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.06 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.06 }}>{text}</div>
  </div>
);

const S1: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  const op = interpolate(f, [0, 12, dur - 12, dur], [0, 1, 1, 0], C);
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center", padding: "0 64px" }}>
        <Chroma text={"MOST RUG-CHECKERS\nWORK ON ONE CHAIN."} size={66} split={split} />
      </div>
      {/* lonely single chip */}
      <div style={{ position: "absolute", top: 1020, left: 0, right: 0, textAlign: "center", opacity: rise(f, 30, 50) }}>
        <span style={{ display: "inline-block", padding: "16px 34px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.2)", color: "rgba(245,247,248,0.6)", fontSize: 34, fontFamily: "monospace" }}>Solana only…</span>
      </div>
    </AbsoluteFill>
  );
};

const Grid: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  const op = interpolate(f, [0, 14, dur - 12, dur], [0, 1, 1, 0], C);
  // scan pulse sweeping down the grid
  const sweepY = interpolate(f, [40, 150], [0, 980], C);
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"GL1TCH READS\nTHEM ALL."} size={92} split={split} />
      </div>
      {/* chip grid */}
      <div style={{ position: "absolute", top: 620, left: 70, right: 70, display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center" }}>
        {CHAINS.map((c, i) => {
          const appear = 44 + i * 11;
          const s = spring({ frame: f - appear, fps, config: { damping: 13, stiffness: 120 } });
          const lit = rise(f, appear, appear + 10);
          return (
            <div key={c} style={{
              transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, opacity: lit,
              padding: "20px 30px", borderRadius: 18,
              border: `1px solid ${GREEN}${lit > 0.5 ? "aa" : "44"}`,
              background: `rgba(124,255,79,${0.06 + lit * 0.06})`,
              color: PAPER, fontSize: 38, fontWeight: 700, letterSpacing: 0.5,
              boxShadow: lit > 0.5 ? `0 0 22px ${GREEN}33` : "none",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ width: 14, height: 14, borderRadius: 9999, background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
              {c}
            </div>
          );
        })}
      </div>
      {/* sweep line */}
      <div style={{ position: "absolute", top: 600 + sweepY, left: 60, right: 60, height: 3, background: GREEN, opacity: interpolate(f, [40, 60, 140, 152], [0, 0.8, 0.8, 0], C), boxShadow: `0 0 24px ${GREEN}` }} />
      <div style={{ position: "absolute", bottom: 210, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 32, letterSpacing: 2, color: GREEN, opacity: rise(f, 170, 188) }}>
        + more EVM chains
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  const op = interpolate(f, [0, 14, dur - 12, dur], [0, 1, 1, 0], C);
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"ONE VERDICT.\nEVERY CHAIN."} size={90} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", opacity: rise(f, 24, 42) }}>
        <span style={{ display: "inline-block", padding: "18px 40px", borderRadius: 16, border: `1px solid ${GREEN}`, background: "rgba(124,255,79,0.08)", color: GREEN, fontSize: 44, fontWeight: 800, letterSpacing: 1 }}>VERDICT: CLEAN ✓</span>
      </div>
      <div style={{ position: "absolute", top: 1140, left: 0, right: 0, textAlign: "center", padding: "0 90px", fontFamily: "monospace", fontSize: 30, color: "rgba(245,247,248,0.85)", opacity: rise(f, 44, 62) }}>
        honeypot · LP lock · mint/freeze · tax · holders — explained in plain English
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const op = rise(f, 0, 14);
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: op }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${PURPLE}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 740, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"SCAN ANY TOKEN.\nANY CHAIN."} size={92} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, textAlign: "center", fontSize: 44, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/scan</div>
      <div style={{ position: "absolute", top: 1140, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.82)" }}>@gl1tchbased · t.me/gl1tch_infected</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 4, color: GREEN, opacity: 0.85 }}>free · non-custodial · read-only</div>
    </AbsoluteFill>
  );
};

const A = 130, B = 250, D = 130, E = 150; // scene durations (with overlaps)
export const MultiChain: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={A + 12}><S1 dur={A + 12} /></Sequence>
    <Sequence from={A} durationInFrames={B + 12}><Grid dur={B + 12} /></Sequence>
    <Sequence from={A + B} durationInFrames={D + 12}><S3 dur={D + 12} /></Sequence>
    <Sequence from={A + B + D} durationInFrames={E}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);
