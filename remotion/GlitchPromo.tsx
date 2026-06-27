import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Loop } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH Promo — wraps a Higgsfield AI mascot clip (9:16) in the brand shell:
 * top lockup, animated headline/sub, bottom CTA card with the contract address.
 * Free, local, credit-free. One component, props drive the copy per clip.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";
const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

export type PromoProps = {
  clip: string;        // file in public/brand/
  eyebrow: string;     // small mono kicker
  headline: string;    // big punchy line
  sub: string;         // supporting line
  cta: string;         // bottom CTA (site / tg / etc.)
  clipFrames?: number; // source length to loop cleanly (4s @ ~30fps ≈ 120)
};

export const GlitchPromo: React.FC<PromoProps> = ({ clip, eyebrow, headline, sub, cta, clipFrames = 120 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  // chromatic split — strong on entry, gentle idle
  const split = frame < 10 ? Math.sin(frame * 6) * 7 : Math.sin(t * 5) * 1.6;

  const lockOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const headS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 90 } });
  const headY = interpolate(headS, [0, 1], [50, 0]);
  const headOp = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [28, 44], [0, 1], { extrapolateRight: "clamp" });
  const ctaS = spring({ frame: frame - 70, fps, config: { damping: 16, stiffness: 80 } });
  const ctaY = interpolate(ctaS, [0, 1], [120, 0]);
  // gentle outro dim
  const outro = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0.4], { extrapolateLeft: "clamp" });

  const Chroma: React.FC<{ text: string; size: number }> = ({ text, size }) => (
    <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
      <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -2, color: PURPLE, opacity: 0.5, lineHeight: 1.04 }}>{text}</div>
      <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -2, color: GREEN, opacity: 0.5, lineHeight: 1.04 }}>{text}</div>
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -2, color: PAPER, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.04 }}>{text}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* background AI clip, looped to fill the comp */}
      <Loop durationInFrames={clipFrames}>
        <OffthreadVideo src={staticFile(`brand/${clip}`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Loop>
      {/* legibility gradient */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(5,5,5,0.78) 0%, rgba(5,5,5,0.15) 26%, rgba(5,5,5,0.15) 52%, rgba(5,5,5,0.86) 80%, rgba(5,5,5,0.97) 100%)" }} />
      <Scanlines />
      <HudCorners />

      <AbsoluteFill style={{ opacity: outro }}>
        {/* top lockup */}
        <div style={{ position: "absolute", top: 96, left: 0, right: 0, textAlign: "center", opacity: lockOp }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
            <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 64, height: 64, filter: `drop-shadow(0 0 18px ${GREEN}88)` }} />
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 2, color: PAPER }}>GL1TCH</div>
          </div>
          <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: 26, letterSpacing: 7, color: GREEN, opacity: 0.85 }}>{eyebrow}</div>
        </div>

        {/* headline */}
        <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center", padding: "0 60px", transform: `translateY(${headY}px)`, opacity: headOp }}>
          <Chroma text={headline} size={82} />
        </div>
        {/* sub — fixed below so it never collides with the headline */}
        <div style={{ position: "absolute", top: 1000, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 34, letterSpacing: 2, color: "rgba(245,247,248,0.9)", textShadow: "0 2px 18px rgba(5,5,5,0.95)", opacity: subOp }}>{sub}</div>

        {/* bottom CTA card */}
        <div style={{ position: "absolute", bottom: 150, left: 60, right: 60, transform: `translateY(${ctaY}px)` }}>
          <div style={{ borderRadius: 26, padding: "30px 34px", background: "rgba(5,5,5,0.66)", border: `1px solid ${GREEN}44`, backdropFilter: "blur(6px)", boxShadow: `0 0 60px ${PURPLE}33` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GREEN, letterSpacing: -1 }}>{cta}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
                <div style={{ fontFamily: "monospace", fontSize: 24, color: PAPER, opacity: 0.8 }}>LIVE</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 20, letterSpacing: 1, color: "rgba(245,247,248,0.62)", wordBreak: "break-all" }}>
              CA {CA}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
