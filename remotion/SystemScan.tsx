import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * GL1TCH "SECURITY SCAN" — 9:16, ~10s. A hacker terminal scans the contract and
 * prints green PASS lines for each trust guarantee, then glitch-reveals VERDICT:
 * CLEAN + ticker + "verify it yourself". On-brand, shareable, doubles as a trust
 * proof. Pure text/CSS — no AI assets, free to render.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

const ROWS = [
  { label: "mint authority", value: "REVOKED" },
  { label: "freeze authority", value: "REVOKED" },
  { label: "transfer tax", value: "0.00%" },
  { label: "supply", value: "1B · FIXED" },
  { label: "rugcheck risk", value: "1 / LOW" },
];

const CMD = "> verify 3HQJww…pump";
const SCRAMBLE = "!<>-_\\/[]{}=+*^?#01x$";

export const SystemScan: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const mono = "monospace";
  const fs = Math.round(width * 0.040); // base font

  // ---- timeline ----
  const cmdStart = 14, cpf = 1.8;
  const cmdEnd = cmdStart + CMD.length * cpf;
  const rowsStart = cmdEnd + 14;
  const rowStep = 26;
  const verdictStart = rowsStart + ROWS.length * rowStep + 10;
  const footerStart = verdictStart + 34;

  const cmdShown = Math.floor(
    interpolate(frame, [cmdStart, cmdEnd], [0, CMD.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const cursorOn = Math.floor(frame / 14) % 2 === 0;
  const scanY = -(frame % 60);
  const cornerO = interpolate(frame, [0, 18], [0, 0.6], { extrapolateRight: "clamp" });

  const inVerdict = frame >= verdictStart;
  const vSplit = inVerdict ? Math.sin(frame * 12) * 6 : 0;
  const vVisible = interpolate(frame, [verdictStart, verdictStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footO = interpolate(frame, [footerStart, footerStart + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dotFill = (label: string, value: string, width = 26) => {
    const dots = Math.max(2, width - label.length - value.length);
    return ".".repeat(dots);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: mono }}>
      {/* scanlines */}
      <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${scanY}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, transparent 40%, rgba(5,5,5,0.6) 100%)", pointerEvents: "none" }} />

      {/* HUD corners */}
      {[
        { top: 44, left: 44, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 44, right: 44, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 44, left: 44, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 44, right: 44, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 54, height: 54, opacity: cornerO, ...b }} />; })}

      {/* header */}
      <div style={{ position: "absolute", top: height * 0.13, left: 0, right: 0, textAlign: "center", color: GREEN, fontSize: Math.round(fs * 0.86), letterSpacing: 8, opacity: interpolate(frame, [0, 14], [0, 0.9], { extrapolateRight: "clamp" }) }}>
        GL1TCH // SECURITY SCAN
      </div>

      {/* terminal block */}
      <div style={{ position: "absolute", top: height * 0.24, left: width * 0.11, right: width * 0.11 }}>
        {/* command line */}
        <div style={{ color: PAPER, fontSize: fs, letterSpacing: 1, marginBottom: fs * 1.1, whiteSpace: "pre" }}>
          {CMD.slice(0, cmdShown)}
          {frame < cmdEnd && cursorOn ? <span style={{ color: GREEN }}>▋</span> : null}
        </div>

        {/* PASS rows */}
        {ROWS.map((r, i) => {
          const start = rowsStart + i * rowStep;
          if (frame < start) return null;
          const appear = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          // brief scramble on the value as it "decodes"
          const decoding = frame < start + 7;
          const val = decoding ? r.value.split("").map((c, j) => (SCRAMBLE[(frame * 7 + j * 13) % SCRAMBLE.length])).join("") : r.value;
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", fontSize: fs, lineHeight: 1.7, opacity: appear, transform: `translateX(${(1 - appear) * 14}px)` }}>
              <span style={{ color: GREEN, marginRight: fs * 0.5, textShadow: `0 0 12px ${GREEN}88` }}>[✓]</span>
              <span style={{ color: "rgba(245,247,248,0.92)" }}>{r.label}</span>
              <span style={{ color: "rgba(124,255,79,0.35)", margin: "0 8px", flex: "0 0 auto" }}>{dotFill(r.label, r.value)}</span>
              <span style={{ color: GREEN, fontWeight: 700, marginLeft: "auto" }}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* verdict */}
      {inVerdict && (
        <div style={{ position: "absolute", top: height * 0.66, left: 0, right: 0, textAlign: "center", opacity: vVisible }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ position: "absolute", left: -vSplit, top: -2, color: PURPLE, opacity: 0.5, fontSize: Math.round(fs * 1.9), fontWeight: 800, letterSpacing: 2, whiteSpace: "pre" }}>VERDICT: CLEAN</div>
            <div style={{ position: "absolute", left: vSplit, top: 2, color: GREEN, opacity: 0.5, fontSize: Math.round(fs * 1.9), fontWeight: 800, letterSpacing: 2, whiteSpace: "pre" }}>VERDICT: CLEAN</div>
            <div style={{ color: PAPER, fontSize: Math.round(fs * 1.9), fontWeight: 800, letterSpacing: 2, whiteSpace: "pre", textShadow: `0 0 30px ${GREEN}55` }}>VERDICT: CLEAN</div>
          </div>
          <div style={{ marginTop: fs * 0.7, color: GREEN, fontSize: Math.round(fs * 0.8), letterSpacing: 4 }}>0 RISKS FLAGGED</div>
        </div>
      )}

      {/* footer CTA */}
      <div style={{ position: "absolute", bottom: height * 0.1, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ color: PAPER, fontSize: Math.round(fs * 1.5), fontWeight: 800, letterSpacing: 3 }}>$GL1TCH</div>
        <div style={{ marginTop: fs * 0.5, color: "rgba(245,247,248,0.7)", fontSize: Math.round(fs * 0.72), letterSpacing: 2 }}>
          don&apos;t trust. verify ↗  coin-three-mu.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
