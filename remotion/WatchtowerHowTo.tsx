import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "WATCHTOWER: HOW IT WORKS" (~28s, 9:16). A clean, professional numbered
 * process explainer (distinct from the v1 terminal & v2 chat videos): a 4-step rail
 * with a progress bar, built around the REAL GL1TCH website scan. Original motion
 * graphics, brand palette, no reused clips.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const INK = "#050505";
const PAPER = "#F5F7F8";
const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);
const seg = (f: number, s: number, e: number, d = 12) => interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0], C);

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.07 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.07 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.07 }}>{text}</div>
  </div>
);

const Row: React.FC<{ icon: string; label: string; value: string; color: string; o: number }> = ({ icon, label, value, color, o }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "16px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: o, fontSize: 32 }}>
    <span style={{ marginRight: 16, color }}>{icon}</span>
    <span style={{ color: "rgba(245,247,248,0.9)" }}>{label}</span>
    <span style={{ marginLeft: "auto", fontWeight: 800, color }}>{value}</span>
  </div>
);

// Persistent step rail + progress bar (steps 1..4).
const Rail: React.FC<{ step: number }> = ({ step }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 250, left: 80, right: 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {[1, 2, 3, 4].map((n) => {
          const on = n <= step;
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 9999, border: `2px solid ${on ? GREEN : "rgba(255,255,255,0.2)"}`, background: on ? "rgba(124,255,79,0.14)" : "transparent", color: on ? GREEN : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, fontFamily: "monospace", boxShadow: on ? `0 0 16px ${GREEN}44` : "none" }}>{n}</div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${interpolate(step, [1, 4], [12, 100], C)}%`, background: GREEN, boxShadow: `0 0 14px ${GREEN}`, transition: "none" }} />
      </div>
      <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: 24, letterSpacing: 4, color: GREEN, opacity: rise(frame, 2, 14) }}>STEP {step} / 4</div>
    </div>
  );
};

const Title: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontSize: 150 }}>👁</div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center", padding: "0 50px" }}>
        <Chroma text={"WATCHTOWER"} size={104} split={split} />
      </div>
      <div style={{ position: "absolute", top: 920, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 34, letterSpacing: 3, color: GREEN, opacity: rise(f, 20, 38) }}>how it actually works</div>
      <div style={{ position: "absolute", top: 990, left: 0, right: 0, textAlign: "center", padding: "0 90px", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.7)", opacity: rise(f, 36, 54) }}>your website scan — watched 24/7</div>
    </AbsoluteFill>
  );
};

const Step1: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 16, fps, config: { damping: 15, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={1} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>You <span style={{ color: GREEN, fontFamily: "monospace" }}>/watch</span> a token.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>the bot locks today&apos;s scan as a baseline ↓</div>
      </div>
      {/* real GL1TCH scan card */}
      <div style={{ position: "absolute", top: 620, left: 80, right: 80, transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)` }}>
        <div style={{ borderRadius: 22, border: `1px solid ${GREEN}55`, background: "rgba(5,5,5,0.6)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 26px", background: "rgba(124,255,79,0.08)" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: PAPER }}>$GL1TCH</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: GREEN }}>LOW RISK · 76</div>
          </div>
          <div style={{ padding: "6px 26px 14px" }}>
            <Row icon="✅" label="Mint authority" value="REVOKED" color={GREEN} o={rise(f, 30, 44)} />
            <Row icon="✅" label="Freeze authority" value="REVOKED" color={GREEN} o={rise(f, 40, 54)} />
            <Row icon="✅" label="LP locked" value="100%" color={GREEN} o={rise(f, 50, 64)} />
            <Row icon="✅" label="Transfer tax" value="0.00%" color={GREEN} o={rise(f, 60, 74)} />
          </div>
        </div>
        <div style={{ marginTop: 18, textAlign: "center", fontFamily: "monospace", fontSize: 28, color: GREEN, opacity: rise(f, 80, 96) }}>✓ baseline locked</div>
      </div>
    </AbsoluteFill>
  );
};

const Step2: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rot = (f * 4) % 360;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={2} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>It re-scans every <span style={{ color: GREEN }}>3 hours</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>automatically. you do nothing.</div>
      </div>
      {/* refresh loop */}
      <div style={{ position: "absolute", top: 800, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 200, height: 200, borderRadius: 9999, border: `10px solid rgba(124,255,79,0.18)`, borderTopColor: GREEN, transform: `rotate(${rot}deg)`, boxShadow: `0 0 40px ${GREEN}33` }} />
        <div style={{ marginTop: 30, fontFamily: "monospace", fontSize: 30, letterSpacing: 3, color: GREEN }}>◐ re-scanning…</div>
        <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: 24, color: "rgba(245,247,248,0.55)" }}>03:00 · 06:00 · 09:00 · 12:00 …</div>
      </div>
    </AbsoluteFill>
  );
};

const Step3: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={3} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>It catches any <span style={{ color: RED }}>drop</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>baseline vs now — only flags what got worse</div>
      </div>
      <div style={{ position: "absolute", top: 660, left: 80, right: 80 }}>
        {[
          { label: "LP locked", from: "100%", to: "0%", at: 24 },
          { label: "Verdict", from: "LOW RISK", to: "RUG-SHAPED", at: 60 },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", marginBottom: 22, borderRadius: 18, border: `1px solid ${RED}66`, background: "rgba(255,92,92,0.07)", opacity: rise(f, r.at, r.at + 12), fontSize: 34 }}>
            <span style={{ color: "rgba(245,247,248,0.9)", flex: 1 }}>{r.label}</span>
            <span style={{ color: "rgba(245,247,248,0.5)", textDecoration: "line-through" }}>{r.from}</span>
            <span style={{ color: RED, fontSize: 30 }}>→</span>
            <span style={{ color: RED, fontWeight: 800 }}>{r.to}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Step4: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const buzz = Math.sin(f * 1.6) * interpolate(f, [0, 40], [6, 0], C);
  const s = spring({ frame: f - 14, fps, config: { damping: 14, stiffness: 95 } });
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={4} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>It <span style={{ color: GREEN }}>pings you</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>before the chart even moves.</div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 80, right: 80, transform: `translate(${buzz}px, ${interpolate(s, [0, 1], [40, 0])}px)` }}>
        <div style={{ borderRadius: 22, border: `1px solid ${RED}88`, background: "rgba(255,92,92,0.1)", padding: "26px 30px", fontSize: 32, lineHeight: 1.5, color: PAPER, fontFamily: "ui-monospace, monospace" }}>
          🚨 <b style={{ color: RED }}>WATCHTOWER ALERT</b>
          <div style={{ marginTop: 14 }}>🔴 <b>$GL1TCH</b> · Solana · <b style={{ color: RED }}>RUG-SHAPED</b></div>
          <div style={{ marginTop: 8, color: RED }}>• LP lock dropped 100% → 0%</div>
          <div style={{ color: GREEN, marginTop: 14 }}>get out. you were warned first.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 14) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${PURPLE}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>👁</div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"WATCH ANY TOKEN.\nWE GUARD IT."} size={84} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 34, color: GREEN }}>Telegram: <span style={{ color: PAPER }}>/watch &lt;token&gt;</span></div>
      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/scan</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>t.me/gl1tch_infected · free · non-custodial</div>
    </AbsoluteFill>
  );
};

const T = 110, S = 200, S2 = 150, S3 = 170, S4 = 160, CTA = 150;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const tFrom = at(T), s1 = at(S), s2 = at(S2), s3 = at(S3), s4 = at(S4), cta = acc + 12;
const TOTAL = cta + CTA;

export const WatchtowerHowTo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={T}><Title dur={T} /></Sequence>
    <Sequence from={s1} durationInFrames={S}><Step1 dur={S} /></Sequence>
    <Sequence from={s2} durationInFrames={S2}><Step2 dur={S2} /></Sequence>
    <Sequence from={s3} durationInFrames={S3}><Step3 dur={S3} /></Sequence>
    <Sequence from={s4} durationInFrames={S4}><Step4 dur={S4} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const WATCHTOWER_HOWTO_FRAMES = TOTAL;
