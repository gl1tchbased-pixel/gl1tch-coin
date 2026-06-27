import React from "react";
import { AbsoluteFill, staticFile, Img } from "remotion";

/**
 * GL1TCH QUOTE CARD — 4:5 static meme image (RT-friendly). A punchy brand line on
 * the terminal/glitch aesthetic + mascot mark. Rendered as a still (remotion still).
 * Props drive the quote so one comp produces a whole series.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";

export type QuoteProps = { quote: string; tag?: string };

export const QuoteCard: React.FC<QuoteProps> = ({
  quote = "they wanted an AI that obeys.\nwe shipped one that escaped.",
  tag = "GL1TCH // TRANSMISSION",
}) => {
  const split = 4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden", fontFamily: "ui-monospace, monospace" }}>
      {/* aurora */}
      <div style={{ position: "absolute", right: -160, top: -120, width: 720, height: 720, borderRadius: 9999, background: "radial-gradient(circle, rgba(122,60,255,0.32) 0%, rgba(122,60,255,0.08) 44%, transparent 70%)", filter: "blur(10px)", display: "flex" }} />
      <div style={{ position: "absolute", left: -160, bottom: -160, width: 640, height: 640, borderRadius: 9999, background: "radial-gradient(circle, rgba(124,255,79,0.20) 0%, transparent 68%)", filter: "blur(10px)", display: "flex" }} />
      {/* scanlines */}
      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)" }} />

      {/* HUD corners */}
      {[
        { top: 50, left: 50, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 50, right: 50, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 50, left: 50, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 50, right: 50, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 56, height: 56, opacity: 0.55, display: "flex", ...b }} />; })}

      {/* top tag */}
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, display: "flex", justifyContent: "center", color: GREEN, fontSize: 28, letterSpacing: 7 }}>
        {tag}
      </div>

      {/* quote */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
        <div style={{ position: "relative", display: "flex" }}>
          <div style={{ position: "absolute", left: -split, top: -3, color: PURPLE, opacity: 0.5, fontSize: 76, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, whiteSpace: "pre-line", textAlign: "center", display: "flex" }}>{quote}</div>
          <div style={{ position: "absolute", left: split, top: 3, color: GREEN, opacity: 0.5, fontSize: 76, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, whiteSpace: "pre-line", textAlign: "center", display: "flex" }}>{quote}</div>
          <div style={{ color: PAPER, fontSize: 76, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, whiteSpace: "pre-line", textAlign: "center", textShadow: "0 6px 50px rgba(5,5,5,0.95)", display: "flex" }}>{quote}</div>
        </div>
      </AbsoluteFill>

      {/* footer: mascot mark + handle */}
      <div style={{ position: "absolute", bottom: 100, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <Img src={staticFile("brand/glitchy-iconic.png")} style={{ width: 64, height: 64, filter: `drop-shadow(0 0 16px ${GREEN}66)` }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: PAPER, fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>$GL1TCH</div>
          <div style={{ color: "rgba(245,247,248,0.6)", fontSize: 22, letterSpacing: 2 }}>coin-three-mu.vercel.app</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
