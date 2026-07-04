import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — FULL PRODUCT TOUR (~42s, 9:16). Everything the site does, chapter by chapter:
 * Scan (any token/chain) · Rug Radar · Watchtower (token) · Wallet Watch · Proof ·
 * Embed + Hold-to-unlock. Consistent chapter header + a mock per feature. Brand palette
 * only, original motion graphics.
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

// Chapter header (number + feature name), consistent across chapters.
const Head: React.FC<{ n: string; title: string; sub: string }> = ({ n, title, sub }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 200, left: 80, right: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: rise(f, 2, 14) }}>
        <span style={{ fontFamily: "monospace", fontSize: 26, color: GREEN, border: `1px solid ${GREEN}55`, borderRadius: 8, padding: "4px 12px" }}>{n}</span>
        <span style={{ fontFamily: "monospace", fontSize: 26, letterSpacing: 3, color: "rgba(245,247,248,0.55)" }}>GL1TCH</span>
      </div>
      <div style={{ marginTop: 18, fontSize: 60, fontWeight: 800, color: PAPER, letterSpacing: -1, opacity: rise(f, 8, 22) }}>{title}</div>
      <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 30, color: GREEN, opacity: rise(f, 16, 30) }}>{sub}</div>
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode; top: number; tone?: string; delay?: number }> = ({ children, top, tone = GREEN, delay = 14 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 15, stiffness: 90 } });
  return (
    <div style={{ position: "absolute", top, left: 80, right: 80, transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`, opacity: s }}>
      <div style={{ borderRadius: 22, border: `1px solid ${tone}55`, background: "rgba(5,5,5,0.6)", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

const Row: React.FC<{ icon: string; label: string; value: string; color: string; o: number }> = ({ icon, label, value, color, o }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "14px 26px", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: o, fontSize: 30 }}>
    <span style={{ marginRight: 14, color }}>{icon}</span>
    <span style={{ color: "rgba(245,247,248,0.9)" }}>{label}</span>
    <span style={{ marginLeft: "auto", fontWeight: 800, color }}>{value}</span>
  </div>
);

// 0 — intro
const Intro: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 7 : 1.6;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontSize: 150, marginBottom: 16, opacity: rise(f, 4, 18) }}>👁</div>
      <div style={{ textAlign: "center", padding: "0 50px" }}><Chroma text={"GL1TCH"} size={120} split={split} /></div>
      <div style={{ marginTop: 20, fontFamily: "monospace", fontSize: 32, letterSpacing: 2, color: GREEN, opacity: rise(f, 24, 40), textAlign: "center", padding: "0 60px" }}>the rogue AI that reads every rug</div>
      <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 25, color: "rgba(245,247,248,0.6)", opacity: rise(f, 40, 56) }}>everything it does — in 40 seconds ↓</div>
    </AbsoluteFill>
  );
};

// 1 — Scan
const Scan: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="01" title="Scan anything" sub="any token · any chain · plain English" />
      <Card top={470}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", background: "rgba(124,255,79,0.08)" }}>
          <span style={{ fontSize: 38, fontWeight: 800, color: PAPER }}>$PEPE</span>
          <span style={{ fontSize: 34, fontWeight: 800, color: GREEN }}>CLEAN · 96</span>
        </div>
        <Row icon="✅" label="Mint & freeze" value="REVOKED" color={GREEN} o={rise(f, 30, 42)} />
        <Row icon="✅" label="Honeypot" value="NO" color={GREEN} o={rise(f, 40, 52)} />
        <Row icon="✅" label="Liquidity" value="DEEP" color={GREEN} o={rise(f, 50, 62)} />
      </Card>
      <div style={{ position: "absolute", top: 840, left: 80, right: 80, fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.7)", opacity: rise(f, 66, 80), borderLeft: `2px solid ${GREEN}55`, paddingLeft: 18, lineHeight: 1.5 }}>
        <span style={{ color: GREEN }}>GL1TCH reads:</span> &quot;Nothing fatal here. Deep liquidity, no traps. Clean.&quot;
      </div>
    </AbsoluteFill>
  );
};

// 2 — Rug Radar
const Radar: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rows = [
    { s: "$DON'T", v: "RUG-SHAPED", n: 58, at: 30 },
    { s: "$Tete", v: "RUG-SHAPED", n: 62, at: 42 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="02" title="Rug Radar" sub="it hunts rugs live — so you don't step on one" />
      <div style={{ position: "absolute", top: 470, left: 80, right: 80 }}>
        {rows.map((r) => (
          <div key={r.s} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", marginBottom: 20, borderRadius: 18, border: `1px solid ${RED}66`, background: "rgba(255,92,92,0.08)", opacity: rise(f, r.at, r.at + 12), fontSize: 34 }}>
            <div style={{ position: "absolute", top: 12, right: -30, transform: "rotate(45deg)", background: RED, color: "#050505", fontFamily: "monospace", fontSize: 12, fontWeight: 800, padding: "3px 34px" }}>CAUGHT</div>
            <span style={{ fontWeight: 800, color: PAPER }}>{r.s}</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800, color: RED, marginRight: 50 }}>{r.v} · {r.n}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.6)", opacity: rise(f, 60, 74) }}>fresh launches swept every hour → /radar</div>
      </div>
    </AbsoluteFill>
  );
};

// 3 — Watchtower (token)
const Watch: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const buzz = Math.sin(f * 1.5) * interpolate(f, [20, 60], [6, 0], C);
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="03" title="Watchtower" sub="/watch a token — pinged if its safety drops" />
      <Card top={500} tone={RED}>
        <div style={{ padding: "26px 30px", fontSize: 32, lineHeight: 1.5, color: PAPER, fontFamily: "ui-monospace, monospace", transform: `translateX(${buzz}px)` }}>
          🚨 <b style={{ color: RED }}>WATCHTOWER ALERT</b>
          <div style={{ marginTop: 12 }}>🔴 <b>$SOMETOKEN</b> · <b style={{ color: RED }}>RUG-SHAPED</b></div>
          <div style={{ marginTop: 8, color: RED }}>• LP lock dropped 100% → 0%</div>
          <div style={{ marginTop: 12, color: GREEN }}>get out. you were warned first.</div>
        </div>
      </Card>
      <div style={{ position: "absolute", top: 820, left: 80, right: 80, textAlign: "center", fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.7)", opacity: rise(f, 60, 74) }}>it keeps watching after you buy.</div>
    </AbsoluteFill>
  );
};

// 4 — Wallet Watch
const Wallet: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="04" title="Wallet Watch" sub="track a whale or a dev — alert when they sell" />
      <Card top={500} tone={RED}>
        <div style={{ padding: "26px 30px", fontSize: 32, lineHeight: 1.5, color: PAPER, fontFamily: "ui-monospace, monospace" }}>
          🐋 <b style={{ color: RED }}>WALLET MOVE</b>
          <div style={{ marginTop: 12, color: "rgba(245,247,248,0.7)", fontSize: 27 }}>5tzF…uAi9 (whale-1)</div>
          <div style={{ marginTop: 10, color: RED }}>• exited <b>$WIF</b></div>
          <div style={{ color: RED }}>• sold ~62% of <b>$BONK</b></div>
          <div style={{ marginTop: 12, color: GREEN }}>you saw it before the chart did.</div>
        </div>
      </Card>
    </AbsoluteFill>
  );
};

// 5 — Proof
const Proof: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: f - 40, fps, config: { damping: 9, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="05" title="We pass our own scan" sub="don't trust us — verify us" />
      <Card top={500}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", background: "rgba(124,255,79,0.08)" }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: PAPER }}>$GL1TCH</span>
          <span style={{ fontSize: 34, fontWeight: 800, color: GREEN }}>LOW RISK · 78</span>
        </div>
        <Row icon="✅" label="Mint & freeze" value="REVOKED" color={GREEN} o={rise(f, 26, 38)} />
        <Row icon="✅" label="Liquidity locked" value="100%" color={GREEN} o={rise(f, 34, 46)} />
        <Row icon="✅" label="Zero tax" value="0.00%" color={GREEN} o={rise(f, 42, 54)} />
      </Card>
      <div style={{ position: "absolute", top: 760, right: 90, transform: `rotate(-12deg) scale(${interpolate(stamp, [0, 1], [2, 1], C)})`, opacity: rise(f, 40, 50) }}>
        <div style={{ border: `5px solid ${GREEN}`, color: GREEN, borderRadius: 14, padding: "8px 22px", fontFamily: "monospace", fontWeight: 800, fontSize: 40, letterSpacing: 3, background: "rgba(5,5,5,0.5)" }}>VERIFIED</div>
      </div>
    </AbsoluteFill>
  );
};

// 6 — Embed + Hold
const Extras: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const tiers = [
    { name: "free", slots: "3", w: 20, at: 40 },
    { name: "BEARER", slots: "25", w: 45, at: 50 },
    { name: "GHOST", slots: "200", w: 100, at: 60, top: true },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Head n="06" title="Builders + holders" sub="embed the badge · hold to unlock more" />
      {/* embed badge */}
      <div style={{ position: "absolute", top: 470, left: 80, right: 80, display: "flex", justifyContent: "center", opacity: rise(f, 18, 32) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 26px", borderRadius: 14, border: `1px solid ${GREEN}88`, background: "rgba(5,5,5,0.6)" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: GREEN, boxShadow: `0 0 10px ${GREEN}` }} />
          <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 800, color: PAPER }}>GL1TCH</span>
          <span style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${GREEN}`, background: `${GREEN}22`, color: GREEN, fontWeight: 800, fontSize: 22 }}>CLEAN 96</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 600, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, color: "rgba(245,247,248,0.6)", opacity: rise(f, 26, 40) }}>1 line → &quot;Scanned by GL1TCH&quot; on your site</div>
      {/* hold ladder */}
      <div style={{ position: "absolute", top: 700, left: 90, right: 90 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ marginBottom: 18, opacity: rise(f, t.at, t.at + 12) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 800, color: t.top ? GREEN : PAPER }}>{t.name}</span>
              <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 800, color: t.top ? GREEN : "rgba(245,247,248,0.85)" }}>{t.slots} watches</span>
            </div>
            <div style={{ height: 16, borderRadius: 9, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${interpolate(f, [t.at, t.at + 18], [0, t.w], C)}%`, background: t.top ? GREEN : `${GREEN}99`, boxShadow: t.top ? `0 0 16px ${GREEN}` : "none" }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, textAlign: "center", fontFamily: "monospace", fontSize: 25, color: GREEN, opacity: rise(f, 78, 92) }}>hold $GL1TCH → guard up to 200</div>
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 14) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${GREEN}1c 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>👁</div>
      <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"ONE SCANNER.\nEVERYTHING."} size={82} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", fontSize: 38, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app</div>
      <div style={{ position: "absolute", top: 1070, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, color: PAPER }}>Telegram: <span style={{ color: GREEN }}>/scan</span> · <span style={{ color: GREEN }}>/watch</span> · <span style={{ color: GREEN }}>/proof</span></div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free · non-custodial · it never touches your wallet</div>
    </AbsoluteFill>
  );
};

const I = 120, SC = 165, RD = 150, WT = 150, WL = 145, PR = 150, EX = 175, CTA = 155;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const c0 = at(I), c1 = at(SC), c2 = at(RD), c3 = at(WT), c4 = at(WL), c5 = at(PR), c6 = at(EX), cta = acc + 12;
const TOTAL = cta + CTA;

export const ProductTour: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={I}><Intro dur={I} /></Sequence>
    <Sequence from={c1} durationInFrames={SC}><Scan dur={SC} /></Sequence>
    <Sequence from={c2} durationInFrames={RD}><Radar dur={RD} /></Sequence>
    <Sequence from={c3} durationInFrames={WT}><Watch dur={WT} /></Sequence>
    <Sequence from={c4} durationInFrames={WL}><Wallet dur={WL} /></Sequence>
    <Sequence from={c5} durationInFrames={PR}><Proof dur={PR} /></Sequence>
    <Sequence from={c6} durationInFrames={EX}><Extras dur={EX} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const PRODUCT_TOUR_FRAMES = TOTAL;
