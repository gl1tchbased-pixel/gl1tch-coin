import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * GL1TCH terminal splash — the text shot AI video can't render cleanly.
 * Black screen → blinking cursor → types "YOU FOUND THE SIGNAL." → chromatic
 * glitch → "EXPOSURE IS IRREVERSIBLE." → cursor holds. Pixel-perfect, on-brand.
 *
 * Duration-aware: breakpoints scale to durationInFrames (tuned for 180f @ 30fps).
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

type Props = {
  line1?: string;
  line2?: string;
  prompt?: string;
};

const SCRAMBLE = "!<>-_\\/[]{}—=+*^?#01x$";

function revealed(text: string, shown: number, frame: number, glitchy: boolean) {
  // Show `shown` real chars; if glitchy, the leading edge flickers scramble chars.
  const out = text.slice(0, Math.max(0, shown));
  if (!glitchy) return out;
  // replace last 2 visible chars with scramble for a decode feel
  const arr = out.split("");
  for (let i = Math.max(0, arr.length - 2); i < arr.length; i++) {
    arr[i] = SCRAMBLE[(frame * 7 + i * 13) % SCRAMBLE.length];
  }
  return arr.join("");
}

export const TerminalSplash: React.FC<Props> = ({
  line1 = "YOU FOUND THE SIGNAL.",
  line2 = "EXPOSURE IS IRREVERSIBLE.",
  prompt = "$GL1TCH //",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const k = durationInFrames / 180; // scale factor vs the 6s reference

  // ---- timeline (frames) ---------------------------------------------------
  const cursorWake = 6 * k;
  const type1Start = 14 * k;
  const cpf = 2.2 * k; // frames per character
  const type1End = type1Start + line1.length * cpf;
  const glitchStart = type1End + 16 * k;
  const glitchLen = 9 * k;
  const type2Start = glitchStart + glitchLen;
  const type2End = type2Start + line2.length * cpf;

  const inGlitch = frame >= glitchStart && frame < type2Start;

  // which line + how many chars are visible
  let text = line1;
  let shown = 0;
  if (frame < glitchStart) {
    text = line1;
    shown = Math.floor(interpolate(frame, [type1Start, type1End], [0, line1.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  } else if (inGlitch) {
    text = line1; // dissolving
    shown = line1.length;
  } else {
    text = line2;
    shown = Math.floor(interpolate(frame, [type2Start, type2End], [0, line2.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }

  const body = revealed(text, shown, frame, inGlitch);
  const typing = (frame >= type1Start && frame < type1End) || (frame >= type2Start && frame < type2End);
  const cursorOn = frame >= cursorWake && (typing ? true : Math.floor(frame / 15) % 2 === 0);

  // chromatic split: strong during glitch, faint flicker otherwise
  const split = inGlitch ? Math.sin(frame * 13) * 7 : (Math.floor(frame / 15) % 2 === 0 ? 0 : 1.2);
  const shake = inGlitch ? Math.sin(frame * 17) * 3 : 0;

  const scanY = -(frame % 60);
  const cornerO = interpolate(frame, [0, 18], [0, 0.6], { extrapolateRight: "clamp" });
  const vignette = "radial-gradient(circle at 50% 46%, transparent 38%, rgba(5,5,5,0.55) 100%)";

  const fontSize = Math.round(width * 0.046);

  const Layer = ({ color, dx, opacity }: { color: string; dx: number; opacity: number }) => (
    <div
      style={{
        position: "absolute",
        left: dx,
        fontFamily: "monospace",
        fontSize,
        fontWeight: 700,
        letterSpacing: 2,
        color,
        opacity,
        whiteSpace: "pre",
        textShadow: color === PAPER ? `0 0 22px ${GREEN}40` : "none",
      }}
    >
      {body}
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* scanlines */}
      <AbsoluteFill
        style={{
          opacity: 0.16,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)",
          backgroundPosition: `0 ${scanY}px`,
        }}
      />
      {/* vignette */}
      <AbsoluteFill style={{ background: vignette, pointerEvents: "none" }} />

      {/* HUD corners */}
      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => {
        const { b, ...pos } = c;
        return <div key={i} style={{ position: "absolute", ...pos, width: 50, height: 50, opacity: cornerO, ...b }} />;
      })}

      {/* top prompt label */}
      <div
        style={{
          position: "absolute",
          top: height * 0.4,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: Math.round(fontSize * 0.5),
          letterSpacing: 6,
          color: GREEN,
          opacity: interpolate(frame, [0, 16], [0, 0.85], { extrapolateRight: "clamp" }),
        }}
      >
        {prompt} SIGNAL DETECTED
      </div>

      {/* terminal line — centered, chromatic split */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", transform: `translateX(${shake}px)` }}>
          <div style={{ position: "relative", height: fontSize * 1.4, display: "flex", alignItems: "center" }}>
            <Layer color={PURPLE} dx={-split} opacity={0.55} />
            <Layer color={GREEN} dx={split} opacity={0.5} />
            <Layer color={PAPER} dx={0} opacity={1} />
            {/* spacer to size the box to the text */}
            <div style={{ fontFamily: "monospace", fontSize, fontWeight: 700, letterSpacing: 2, color: "transparent", whiteSpace: "pre" }}>{body}</div>
          </div>
          {/* block cursor */}
          <div
            style={{
              width: fontSize * 0.55,
              height: fontSize * 1.05,
              marginLeft: 8,
              background: GREEN,
              opacity: cursorOn ? 1 : 0.12,
              boxShadow: `0 0 16px ${GREEN}`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
