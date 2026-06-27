import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "ANATOMY OF A RUG" (~28s, 9:16). 100% original motion graphics, no reused
 * clips: an animated candlestick chart pumps, an x-ray sweep exposes the hidden traps
 * (unlocked LP, live mint, whale wallet), the chart craters, then GL1TCH's verdict
 * card shows it caught all of it in 5 seconds. Brand palette only, free to render.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const INK = "#050505";
const PAPER = "#F5F7F8";

const clampOpts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], clampOpts);

// Deterministic pump heights (0..1 of chart), then a crash tail.
const N = 26;
const PUMP_END = 19;
const baseH = (i: number) => {
  if (i <= PUMP_END) return 0.14 + (i / PUMP_END) * 0.72 + Math.sin(i * 1.35) * 0.045;
  return 0.86; // pre-crash plateau (animated down in the crash phase)
};

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.07 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.07 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.07 }}>{text}</div>
  </div>
);

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const areaW = width - 160;
  const cw = areaW / N;
  const chartH = 760;
  // reveal candles 0..PUMP_END across frames 12..300
  const revealed = interpolate(frame, [12, 300], [0, PUMP_END + 1], clampOpts);
  // crash progress 400..472
  const crash = rise(frame, 400, 472);
  const flash = interpolate(frame, [400, 412, 440], [0, 0.5, 0], clampOpts);

  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 560, height: chartH }}>
      {/* baseline grid */}
      {[0.25, 0.5, 0.75].map((g) => (
        <div key={g} style={{ position: "absolute", left: 0, right: 0, bottom: g * chartH, height: 1, background: "rgba(255,255,255,0.06)" }} />
      ))}
      {Array.from({ length: N }).map((_, i) => {
        if (i >= Math.ceil(revealed) && i <= PUMP_END) return null;
        let h = baseH(i);
        let red = false;
        if (i > PUMP_END) {
          // crash candles collapse downward as crash progresses
          const local = (i - PUMP_END) / (N - PUMP_END);
          const target = 0.86 - (0.8 * Math.min(1, crash / Math.max(0.15, local)));
          h = Math.max(0.02, target);
          red = true;
        } else if (frame >= 400) {
          // during crash, even pump candles bleed slightly
          h = baseH(i) * (1 - crash * 0.15);
        }
        const appear = i <= PUMP_END ? interpolate(revealed, [i, i + 1], [0, 1], clampOpts) : rise(frame, 400 + (i - PUMP_END) * 5, 410 + (i - PUMP_END) * 5);
        const bodyH = h * chartH * appear;
        const prev = i > 0 ? baseH(i - 1) : baseH(0);
        const up = !red && baseH(i) >= prev;
        const col = red ? RED : up ? GREEN : "#3a7a2a";
        return (
          <div key={i} style={{ position: "absolute", bottom: 0, left: i * cw + cw * 0.18, width: cw * 0.64 }}>
            {/* wick */}
            <div style={{ position: "absolute", bottom: 0, left: "46%", width: 2, height: bodyH * 1.16, background: col, opacity: 0.5 }} />
            {/* body */}
            <div style={{ position: "absolute", bottom: 0, width: "100%", height: bodyH, background: col, borderRadius: 3, boxShadow: red ? `0 0 14px ${RED}77` : `0 0 10px ${col}55` }} />
          </div>
        );
      })}
      {/* crash flash */}
      <AbsoluteFill style={{ background: RED, opacity: flash, pointerEvents: "none" }} />
    </div>
  );
};

const PriceTag: React.FC = () => {
  const frame = useCurrentFrame();
  const pump = interpolate(frame, [12, 300], [0.0000012, 0.000089], clampOpts);
  const crash = interpolate(frame, [400, 468], [0.000089, 0.0000004], clampOpts);
  const v = frame < 400 ? pump : crash;
  const up = frame < 400;
  const pct = up ? `+${Math.round(interpolate(frame, [12, 300], [0, 7300], clampOpts)).toLocaleString("en-US")}%` : "-99.6%";
  return (
    <div style={{ position: "absolute", top: 360, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 64, fontWeight: 800, color: up ? GREEN : RED, letterSpacing: -1 }}>
        ${v < 0.0001 ? v.toExponential(2) : v.toFixed(5)}
      </div>
      <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: up ? GREEN : RED }}>{pct} <span style={{ opacity: 0.7 }}>24h</span></div>
    </div>
  );
};

const Flag: React.FC<{ appear: number; icon: string; label: string; value: string }> = ({ appear, icon, label, value }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - appear, fps, config: { damping: 13, stiffness: 110 } });
  const op = rise(frame, appear, appear + 8);
  const pulse = 0.5 + 0.5 * Math.sin((frame - appear) * 0.5);
  return (
    <div style={{ transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`, opacity: op, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(255,92,92,0.1)", border: `1px solid ${RED}${Math.round(pulse * 120 + 60).toString(16)}`, borderRadius: 18, padding: "20px 26px" }}>
        <div style={{ fontSize: 44 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "monospace", fontSize: 24, letterSpacing: 2, color: "rgba(245,247,248,0.7)" }}>{label}</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: RED }}>{value}</div>
        </div>
      </div>
    </div>
  );
};

const Verdict: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = rise(frame, 0, 14);
  const split = frame < 12 ? Math.sin(frame * 6) * 6 : 1.4;
  const s = spring({ frame: frame - 18, fps, config: { damping: 15, stiffness: 90 } });
  const checks = [
    { k: "LP locked / burned", v: "0% ✕" },
    { k: "Mint authority", v: "ACTIVE ✕" },
    { k: "Top holder", v: "61% ✕" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: op }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 34%, ${GREEN}1c 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 7, color: GREEN, opacity: rise(frame, 8, 22) }}>GL1TCH // 5-SECOND READ</div>
      <div style={{ position: "absolute", top: 410, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"WE SAW IT\nBEFORE YOU APED."} size={82} split={split} />
      </div>
      <div style={{ position: "absolute", top: 770, left: 80, right: 80, transform: `translateY(${interpolate(s, [0, 1], [70, 0])}px)` }}>
        <div style={{ borderRadius: 24, overflow: "hidden", border: `1px solid ${RED}66`, background: "rgba(5,5,5,0.7)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", background: "rgba(255,92,92,0.12)" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: PAPER }}>VERDICT</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: RED, letterSpacing: 1 }}>RUG-SHAPED</div>
          </div>
          {checks.map((c, i) => (
            <div key={c.k} style={{ display: "flex", justifyContent: "space-between", padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: rise(frame, 40 + i * 12, 54 + i * 12), fontSize: 30 }}>
              <span style={{ color: "rgba(245,247,248,0.85)" }}>{c.k}</span>
              <span style={{ color: RED, fontWeight: 800 }}>{c.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 230, left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 700, color: GREEN, opacity: rise(frame, 90, 108) }}>
        you didn&apos;t have to lose that.
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const op = rise(frame, 0, 14);
  const split = frame < 12 ? Math.sin(frame * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: op }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${PURPLE}22 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"SCAN BEFORE\nYOU APE."} size={104} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1050, left: 0, right: 0, textAlign: "center", fontSize: 44, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/scan</div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.82)" }}>@gl1tchbased · t.me/gl1tch_infected</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 4, color: GREEN, opacity: 0.85 }}>free · non-custodial · any chain</div>
    </AbsoluteFill>
  );
};

const CHART_END = 548, VERDICT_FROM = 548, CTA_FROM = 728, TOTAL = 840;

export const AnatomyOfRug: React.FC = () => {
  const frame = useCurrentFrame();
  const chartOp = interpolate(frame, [0, 12, CHART_END - 14, CHART_END], [0, 1, 1, 0], clampOpts);
  const split = frame < 12 ? Math.sin(frame * 6) * 7 : 1.6;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      {/* CHART ACT (hook → x-ray → crash) */}
      {frame < CHART_END && (
        <AbsoluteFill style={{ opacity: chartOp }}>
          <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 26, letterSpacing: 6, color: frame < 400 ? GREEN : RED, opacity: rise(frame, 4, 16) }}>
            {frame < 400 ? "$SAFEMOON2 // LIVE" : "$SAFEMOON2 // OFFLINE"}
          </div>
          <PriceTag />
          <Chart />

          {/* S1 hook */}
          {frame < 156 && (
            <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center", padding: "0 64px", opacity: interpolate(frame, [18, 36, 140, 156], [0, 1, 1, 0], clampOpts) }}>
              <Chroma text={"IT 100x'd\nIN A DAY."} size={70} split={split} />
              <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 30, color: "rgba(245,247,248,0.8)" }}>everyone aped in.</div>
            </div>
          )}

          {/* S2 x-ray sweep + flags */}
          {frame >= 158 && frame < 400 && (
            <>
              <div style={{ position: "absolute", top: 560, left: 80 + interpolate(frame, [160, 210], [0, 920], clampOpts), width: 4, height: 760, background: GREEN, boxShadow: `0 0 26px ${GREEN}`, opacity: interpolate(frame, [160, 175, 205, 215], [0, 1, 1, 0], clampOpts) }} />
              <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 30, letterSpacing: 4, color: GREEN, opacity: interpolate(frame, [200, 214, 380, 396], [0, 1, 1, 0], clampOpts) }}>under the hood ↓</div>
              <div style={{ position: "absolute", top: 1380, left: 80, right: 80, opacity: interpolate(frame, [210, 224, 384, 398], [0, 1, 1, 0], clampOpts) }}>
                <Flag appear={214} icon="🔓" label="LIQUIDITY" value="NOT LOCKED — dev can pull anytime" />
                <Flag appear={262} icon="🪙" label="MINT AUTHORITY" value="ACTIVE — supply can be printed" />
                <Flag appear={310} icon="🐋" label="TOP WALLET" value="61% — one dump ends it" />
              </div>
            </>
          )}

          {/* S3 crash stamp */}
          {frame >= 404 && (
            <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center", opacity: rise(frame, 412, 430) }}>
              <div style={{ display: "inline-block", transform: `rotate(-7deg) scale(${interpolate(spring({ frame: frame - 412, fps: 30, config: { damping: 9, stiffness: 120 } }), [0, 1], [1.6, 1])})`, border: `5px solid ${RED}`, borderRadius: 14, padding: "12px 34px", color: RED, fontSize: 78, fontWeight: 800, letterSpacing: 4, textShadow: `0 0 30px ${RED}88` }}>RUGGED</div>
              <div style={{ marginTop: 26, fontFamily: "monospace", fontSize: 34, color: PAPER }}>3 hours later. liquidity gone.</div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* VERDICT ACT */}
      <Sequence from={VERDICT_FROM} durationInFrames={CTA_FROM - VERDICT_FROM}><Verdict /></Sequence>
      {/* CTA */}
      <Sequence from={CTA_FROM} durationInFrames={TOTAL - CTA_FROM}><Cta /></Sequence>

      <Scanlines />
      <HudCorners />
      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
