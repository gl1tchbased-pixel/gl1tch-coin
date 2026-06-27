import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * GL1TCH "WATCHTOWER" explainer — 9:16, ~20s. Walks through the feature in five
 * beats: the problem (rugs happen later) → /watch a token → baseline captured →
 * the 3-hour sweep catches an LP unlock → 🚨 alert → CTA. Pure text/CSS, brand
 * palette only, free to render. Doubles as a trust proof.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const INK = "#050505";
const PAPER = "#F5F7F8";

const fade = (f: number, s: number, e: number, d = 12) =>
  interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const rise = (f: number, s: number, e: number) =>
  interpolate(f, [s, e], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Scene windows (30fps, 600 frames = 20s)
const S1 = [0, 150];
const S2 = [150, 320];
const S3 = [320, 470];
const S4 = [470, 560];
const S5 = [556, 600];

export const Watchtower: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const mono = "monospace";
  const fs = Math.round(width * 0.044);
  const scanY = -(frame % 60);
  const cmd = "> /watch $TOKEN";
  const cmdShown = Math.floor(interpolate(frame, [S2[0] + 14, S2[0] + 60], [0, cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cursorOn = Math.floor(frame / 12) % 2 === 0;
  const flip = frame >= S3[0] + 70; // moment the status goes bad
  const alertShake = frame >= S4[0] ? Math.sin(frame * 1.6) * 4 : 0;

  const Row = ({ label, value, color, o, dy = 0 }: { label: string; value: string; color: string; o: number; dy?: number }) => (
    <div style={{ display: "flex", alignItems: "center", fontSize: fs, lineHeight: 1.9, opacity: o, transform: `translateY(${dy}px)` }}>
      <span style={{ color, marginRight: fs * 0.45, textShadow: `0 0 12px ${color}88` }}>{color === GREEN ? "[✓]" : "[✕]"}</span>
      <span style={{ color: "rgba(245,247,248,0.92)" }}>{label}</span>
      <span style={{ color, fontWeight: 800, marginLeft: "auto", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: mono }}>
      {/* scanlines + vignette */}
      <AbsoluteFill style={{ opacity: 0.15, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, transparent 38%, rgba(5,5,5,0.65) 100%)" }} />

      {/* HUD corners (tint red during the alert) */}
      {[
        { top: 44, left: 44, b: { borderTop: "2px solid", borderLeft: "2px solid" } },
        { top: 44, right: 44, b: { borderTop: "2px solid", borderRight: "2px solid" } },
        { bottom: 44, left: 44, b: { borderBottom: "2px solid", borderLeft: "2px solid" } },
        { bottom: 44, right: 44, b: { borderBottom: "2px solid", borderRight: "2px solid" } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 54, height: 54, opacity: rise(frame, 0, 18) * 0.7, color: frame >= S4[0] ? RED : GREEN, ...b }} />; })}

      {/* persistent header */}
      <div style={{ position: "absolute", top: height * 0.085, left: 0, right: 0, textAlign: "center", color: frame >= S4[0] ? RED : GREEN, fontSize: Math.round(fs * 0.7), letterSpacing: 9, opacity: rise(frame, 6, 20) }}>
        GL1TCH // WATCHTOWER
      </div>

      {/* ───────────── S1 — the problem ───────────── */}
      <div style={{ position: "absolute", top: height * 0.34, left: width * 0.1, right: width * 0.1, textAlign: "center", opacity: fade(frame, S1[0], S1[1]) }}>
        <div style={{ color: PAPER, fontSize: Math.round(fs * 1.5), fontWeight: 800, lineHeight: 1.25, letterSpacing: 1 }}>
          A rug doesn&apos;t happen{"\n"}when you buy.
        </div>
        <div style={{ marginTop: fs * 1.1, color: RED, fontSize: Math.round(fs * 1.05), fontWeight: 700, letterSpacing: 1, opacity: rise(frame, S1[0] + 40, S1[0] + 70) }}>
          It happens at 3am — after you stopped watching.
        </div>
      </div>

      {/* ───────────── S2 — /watch + baseline ───────────── */}
      <div style={{ position: "absolute", top: height * 0.2, left: width * 0.1, right: width * 0.1, opacity: fade(frame, S2[0], S2[1]) }}>
        <div style={{ color: PAPER, fontSize: fs, letterSpacing: 1, whiteSpace: "pre", marginBottom: fs * 1.2 }}>
          {cmd.slice(0, cmdShown)}
          {cmdShown < cmd.length && cursorOn ? <span style={{ color: GREEN }}>▋</span> : null}
        </div>
        <div style={{ border: `1px solid ${GREEN}55`, borderRadius: 14, padding: fs * 0.9, background: "rgba(124,255,79,0.04)", opacity: rise(frame, S2[0] + 64, S2[0] + 84) }}>
          <div style={{ color: GREEN, fontSize: Math.round(fs * 0.95), fontWeight: 800, letterSpacing: 2, marginBottom: fs * 0.7 }}>👁 WATCHING — baseline locked</div>
          <Row label="verdict" value="CLEAN 88" color={GREEN} o={rise(frame, S2[0] + 84, S2[0] + 100)} />
          <Row label="LP locked" value="100%" color={GREEN} o={rise(frame, S2[0] + 96, S2[0] + 112)} />
          <Row label="mint authority" value="REVOKED" color={GREEN} o={rise(frame, S2[0] + 108, S2[0] + 124)} />
        </div>
        <div style={{ marginTop: fs * 0.9, color: "rgba(245,247,248,0.7)", fontSize: Math.round(fs * 0.78), textAlign: "center", opacity: rise(frame, S2[0] + 120, S2[0] + 138) }}>
          I&apos;ll re-check it for you. You can forget about it.
        </div>
      </div>

      {/* ───────────── S3 — the sweep catches a change ───────────── */}
      <div style={{ position: "absolute", top: height * 0.22, left: width * 0.1, right: width * 0.1, opacity: fade(frame, S3[0], S3[1]) }}>
        <div style={{ color: PURPLE, fontSize: Math.round(fs * 0.92), letterSpacing: 3, textAlign: "center" }}>
          ◐ re-scanning every 3h…
        </div>
        {/* sweep bar */}
        <div style={{ height: 4, marginTop: fs * 0.7, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${rise(frame, S3[0] + 10, S3[0] + 65) * 100}%`, background: flip ? RED : GREEN }} />
        </div>
        <div style={{ marginTop: fs * 1.6, border: `1px solid ${flip ? RED : GREEN}66`, borderRadius: 14, padding: fs * 0.9, background: flip ? "rgba(255,92,92,0.05)" : "rgba(124,255,79,0.04)" }}>
          <Row label="LP locked" value={flip ? "100% → 0%" : "100%"} color={flip ? RED : GREEN} o={1} />
          <Row label="verdict" value={flip ? "→ RUG-SHAPED" : "CLEAN"} color={flip ? RED : GREEN} o={1} />
        </div>
        <div style={{ marginTop: fs * 1.0, textAlign: "center", color: flip ? RED : "rgba(245,247,248,0.5)", fontSize: Math.round(fs * 0.85), fontWeight: 700, letterSpacing: 1, opacity: flip ? rise(frame, S3[0] + 78, S3[0] + 92) : 0.5 }}>
          {flip ? "the dev just pulled the liquidity." : "every check, every few hours."}
        </div>
      </div>

      {/* ───────────── S4 — the alert ───────────── */}
      <div style={{ position: "absolute", top: height * 0.3, left: width * 0.09, right: width * 0.09, textAlign: "center", opacity: fade(frame, S4[0], S4[1], 10), transform: `translateX(${alertShake}px)` }}>
        <div style={{ fontSize: Math.round(fs * 2.4) }}>🚨</div>
        <div style={{ color: RED, fontSize: Math.round(fs * 1.5), fontWeight: 800, letterSpacing: 2, marginTop: fs * 0.3, textShadow: `0 0 30px ${RED}66` }}>
          WATCHTOWER ALERT
        </div>
        <div style={{ marginTop: fs * 0.9, border: `1px solid ${RED}66`, borderRadius: 14, padding: fs * 0.9, background: "rgba(255,92,92,0.06)", color: PAPER, fontSize: Math.round(fs * 0.92), lineHeight: 1.6, textAlign: "left" }}>
          <div>🔴 <b>$TOKEN</b> · Solana · <b>RUG-SHAPED</b></div>
          <div style={{ marginTop: fs * 0.4, color: RED }}>• LP lock dropped: 100% → 0%</div>
          <div style={{ color: RED }}>• verdict: CLEAN → RUG-SHAPED</div>
        </div>
        <div style={{ marginTop: fs * 0.8, color: GREEN, fontSize: Math.round(fs * 0.95), fontWeight: 700, letterSpacing: 1, opacity: rise(frame, S4[0] + 30, S4[0] + 48) }}>
          You got the warning before the chart did.
        </div>
      </div>

      {/* ───────────── S5 — CTA ───────────── */}
      <div style={{ position: "absolute", top: height * 0.4, left: 0, right: 0, textAlign: "center", opacity: fade(frame, S5[0], S5[1], 10) }}>
        <div style={{ color: PAPER, fontSize: Math.round(fs * 1.7), fontWeight: 800, letterSpacing: 1 }}>👁 GL1TCH WATCHTOWER</div>
        <div style={{ marginTop: fs * 0.8, color: GREEN, fontSize: Math.round(fs * 1.0), fontWeight: 700, letterSpacing: 1 }}>
          <span style={{ color: PAPER }}>/watch</span> any token. We watch it for you.
        </div>
        <div style={{ marginTop: fs * 1.2, color: "rgba(245,247,248,0.7)", fontSize: Math.round(fs * 0.74), letterSpacing: 2 }}>
          free · non-custodial · any chain
        </div>
        <div style={{ marginTop: fs * 0.4, color: GREEN, fontSize: Math.round(fs * 0.8), letterSpacing: 2 }}>
          t.me/gl1tch_infected
        </div>
      </div>
    </AbsoluteFill>
  );
};
