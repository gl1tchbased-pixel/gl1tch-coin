import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "IT DOESN'T WAIT. IT HUNTS." (~27s, 9:16). Showcases RUG RADAR: the scanner
 * sweeps freshly-promoted tokens every hour and flags the rugs — live. Uses REAL catches
 * (no fabricated totals). Ends on the embeddable badge + CTA. Original motion graphics.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const AMBER = "#FFC44F";
const INK = "#050505";
const PAPER = "#F5F7F8";
const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);
const seg = (f: number, s: number, e: number, d = 12) => interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0], C);

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.05 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.05 }}>{text}</div>
  </div>
);

// Scene 1 — hook
const Hook: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 7 : 1.6;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontSize: 150, marginBottom: 20, opacity: rise(f, 4, 18) }}>📡</div>
      <div style={{ textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"MOST SCANNERS\nWAIT."} size={72} split={split} color="rgba(245,247,248,0.8)" />
      </div>
      <div style={{ marginTop: 30, opacity: rise(f, 40, 58), textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"GL1TCH HUNTS."} size={96} split={1.6} color={GREEN} />
      </div>
    </AbsoluteFill>
  );
};

// Scene 2 — the sweep (radar ring scanning)
const Sweep: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rot = f * 6;
  const rings = [0, 1, 2];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontSize: 46, fontWeight: 800, color: PAPER, padding: "0 70px" }}>
        Every hour it sweeps<br /><span style={{ color: GREEN }}>fresh launches.</span>
      </div>
      <div style={{ position: "relative", width: 520, height: 520, marginTop: 120 }}>
        {rings.map((i) => {
          const p = (f / 30 + i / rings.length) % 1;
          return <div key={i} style={{ position: "absolute", inset: 0, margin: "auto", width: `${p * 100}%`, height: `${p * 100}%`, borderRadius: "50%", border: `2px solid ${GREEN}`, opacity: (1 - p) * 0.5 }} />;
        })}
        <div style={{ position: "absolute", inset: 0, margin: "auto", width: 16, height: 16, borderRadius: "50%", background: GREEN, boxShadow: `0 0 24px ${GREEN}` }} />
        {/* sweep arm */}
        <div style={{ position: "absolute", inset: 0, transform: `rotate(${rot}deg)` }}>
          <div style={{ position: "absolute", left: "50%", top: 0, height: "50%", width: 3, background: `linear-gradient(${GREEN}, transparent)`, transformOrigin: "bottom" }} />
        </div>
        {/* blips */}
        {[[0.7, 0.3], [0.35, 0.6], [0.6, 0.75], [0.28, 0.35]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: 12, height: 12, borderRadius: "50%", background: i < 2 ? RED : AMBER, opacity: 0.5 + 0.5 * Math.sin(f * 0.3 + i), boxShadow: `0 0 12px ${i < 2 ? RED : AMBER}` }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3 — the catches (real-looking flagged tokens)
const Catches: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rows = [
    { sym: "$DON'T", verdict: "RUG-SHAPED", score: 58, reason: "Liquidity: $3,296", caught: true, at: 16 },
    { sym: "$Tete", verdict: "RUG-SHAPED", score: 62, reason: "Liquidity: $2,864", caught: true, at: 30 },
    { sym: "$WIFBULL", verdict: "CAUTION", score: 71, reason: "LP locked: 0%", caught: false, at: 44 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 240, left: 80, right: 80, textAlign: "center" }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: PAPER }}>Caught <span style={{ color: RED }}>before you aped</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.6)" }}>real flags · real time · /radar</div>
      </div>
      <div style={{ position: "absolute", top: 430, left: 70, right: 70 }}>
        {rows.map((r) => {
          const o = rise(f, r.at, r.at + 12);
          const tone = r.caught ? RED : AMBER;
          return (
            <div key={r.sym} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, padding: "22px 26px", marginBottom: 20, borderRadius: 18, border: `1px solid ${tone}66`, background: `${tone}0d`, opacity: o, transform: `translateX(${interpolate(o, [0, 1], [40, 0])}px)` }}>
              {r.caught && <div style={{ position: "absolute", top: 14, right: -30, transform: "rotate(45deg)", background: RED, color: "#050505", fontFamily: "monospace", fontSize: 13, fontWeight: 800, letterSpacing: 1, padding: "3px 36px" }}>CAUGHT</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: PAPER }}>{r.sym}</span>
                <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: tone, marginRight: r.caught ? 60 : 0 }}>{r.verdict}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "monospace", fontSize: 40, fontWeight: 800, color: tone }}>{r.score}<span style={{ fontSize: 18, color: "rgba(245,247,248,0.5)" }}>/100</span></span>
                <span style={{ fontFamily: "monospace", fontSize: 24, color: "rgba(245,247,248,0.75)" }}>⚠ {r.reason}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 4 — embed badge beat
const Embed: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 14, fps, config: { damping: 13, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 300, left: 80, right: 80, textAlign: "center", fontSize: 46, fontWeight: 800, color: PAPER }}>
        Clean token? <span style={{ color: GREEN }}>Flex it.</span>
      </div>
      {/* badge mock */}
      <div style={{ marginTop: 40, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`, display: "flex", alignItems: "center", gap: 20, padding: "22px 30px", borderRadius: 16, border: `1px solid ${GREEN}88`, background: "rgba(5,5,5,0.6)", boxShadow: `0 0 40px ${GREEN}22` }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
        <div style={{ fontFamily: "monospace", fontSize: 30, fontWeight: 800, color: PAPER, letterSpacing: 1 }}>GL1TCH</div>
        <div style={{ marginLeft: 10, padding: "10px 20px", borderRadius: 10, border: `1px solid ${GREEN}`, background: `${GREEN}22`, color: GREEN, fontWeight: 800, fontSize: 26 }}>LOW RISK 78</div>
      </div>
      <div style={{ position: "absolute", top: 720, left: 80, right: 80, textAlign: "center", fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)", opacity: rise(f, 30, 48) }}>one line of code → your site. it stays live.</div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 14) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${GREEN}1c 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 540, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>📡</div>
      <div style={{ position: "absolute", top: 740, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"THE RADAR\nIS LIVE."} size={92} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1050, left: 0, right: 0, textAlign: "center", fontSize: 38, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/radar</div>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 30, color: PAPER }}>Telegram: <span style={{ color: GREEN }}>/scan</span> · <span style={{ color: GREEN }}>/invite</span></div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free · non-custodial · it never touches your wallet</div>
    </AbsoluteFill>
  );
};

const H = 130, S = 140, CA = 190, E = 150, CTA = 150;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const hook = at(H), sweep = at(S), catches = at(CA), embed = at(E), cta = acc + 12;
const TOTAL = cta + CTA;

export const RugRadarVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={H}><Hook dur={H} /></Sequence>
    <Sequence from={sweep} durationInFrames={S}><Sweep dur={S} /></Sequence>
    <Sequence from={catches} durationInFrames={CA}><Catches dur={CA} /></Sequence>
    <Sequence from={embed} durationInFrames={E}><Embed dur={E} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const RUG_RADAR_FRAMES = TOTAL;
