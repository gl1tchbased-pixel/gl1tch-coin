import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "VERIFIED & LISTED ON GECKOTERMINAL" (~18s, 9:16). A legitimacy milestone
 * announcement for investors: token info verified on a major aggregator. Honest — it's
 * a listing/discoverability signal, not a security endorsement. Ties back to the trust
 * stack. Original motion graphics, brand palette only.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
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

// 1 — hook
const Hook: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 7 : 1.6;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: "monospace", fontSize: 32, letterSpacing: 5, color: GREEN, opacity: rise(f, 6, 20) }}>NEW MILESTONE</div>
      <div style={{ marginTop: 24, textAlign: "center", padding: "0 50px" }}>
        <Chroma text={"WE JUST GOT\nVERIFIED."} size={88} split={split} />
      </div>
      <div style={{ marginTop: 22, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.6)", opacity: rise(f, 34, 50) }}>on one of crypto&apos;s biggest data hubs ↓</div>
    </AbsoluteFill>
  );
};

// 2 — the verified card reveal
const Badge: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 12, fps, config: { damping: 14, stiffness: 90 } });
  const stamp = spring({ frame: f - 46, fps, config: { damping: 9, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 30, letterSpacing: 3, color: "rgba(245,247,248,0.55)" }}>GeckoTerminal</div>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`, opacity: s }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "50px 60px", borderRadius: 26, border: `1px solid ${GREEN}66`, background: "rgba(5,5,5,0.6)", boxShadow: `0 0 50px ${GREEN}22` }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", border: `2px solid ${GREEN}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, background: "rgba(124,255,79,0.06)" }}>👁</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: PAPER }}>$GL1TCH</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "monospace", fontSize: 30, color: GREEN }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(124,255,79,0.16)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>✓</span>
            VERIFIED · LISTED
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1180, right: 120, transform: `rotate(-12deg) scale(${interpolate(stamp, [0, 1], [2.2, 1], C)})`, opacity: rise(f, 46, 56) }}>
        <div style={{ border: `5px solid ${GREEN}`, color: GREEN, borderRadius: 14, padding: "8px 22px", fontFamily: "monospace", fontWeight: 800, fontSize: 36, letterSpacing: 3, background: "rgba(5,5,5,0.5)" }}>LIVE</div>
      </div>
    </AbsoluteFill>
  );
};

// 3 — why it matters (scale of the aggregator)
const Why: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const stats = [
    { n: "1.7M+", l: "tokens tracked", at: 16 },
    { n: "100+", l: "chains", at: 28 },
    { n: "600+", l: "DEXes", at: 40 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 300, left: 80, right: 80, textAlign: "center", fontSize: 48, fontWeight: 800, color: PAPER }}>
        Now discoverable where <span style={{ color: GREEN }}>degens actually look.</span>
      </div>
      <div style={{ position: "absolute", top: 560, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        {stats.map((st) => (
          <div key={st.l} style={{ display: "flex", alignItems: "baseline", gap: 20, opacity: rise(f, st.at, st.at + 12), transform: `translateX(${interpolate(rise(f, st.at, st.at + 12), [0, 1], [30, 0])}px)` }}>
            <span style={{ fontFamily: "monospace", fontSize: 66, fontWeight: 800, color: GREEN, minWidth: 200 }}>{st.n}</span>
            <span style={{ fontSize: 34, color: "rgba(245,247,248,0.8)" }}>{st.l}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 920, left: 80, right: 80, fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.6)", opacity: rise(f, 56, 72) }}>logo · socials · website — all verified on our GeckoTerminal listing.</div>
    </AbsoluteFill>
  );
};

// 4 — the trust stack tie-in
const Stack: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rows = [
    { t: "Verified listing on GeckoTerminal", at: 14 },
    { t: "We pass our own scanner (LOW RISK)", at: 26 },
    { t: "Liquidity locked · 0% tax · renounced", at: 38 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 320, left: 80, right: 80, textAlign: "center", fontSize: 48, fontWeight: 800, color: PAPER }}>
        Another <span style={{ color: GREEN }}>receipt</span>, not a promise.
      </div>
      <div style={{ position: "absolute", top: 560, left: 90, right: 90 }}>
        {rows.map((r) => (
          <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", marginBottom: 18, borderRadius: 16, border: `1px solid ${GREEN}44`, background: "rgba(124,255,79,0.05)", opacity: rise(f, r.at, r.at + 12), fontSize: 32 }}>
            <span style={{ color: GREEN, fontSize: 30 }}>✓</span>
            <span style={{ color: PAPER }}>{r.t}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, textAlign: "center", fontFamily: "monospace", fontSize: 24, color: "rgba(245,247,248,0.55)", opacity: rise(f, 54, 68) }}>not financial advice · always DYOR</div>
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
      <div style={{ position: "absolute", top: 540, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>👁</div>
      <div style={{ position: "absolute", top: 740, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"VERIFIED.\nLISTED. LIVE."} size={86} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, textAlign: "center", fontSize: 38, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app</div>
      <div style={{ position: "absolute", top: 1100, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: PAPER }}>track $GL1TCH on GeckoTerminal ↗</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free scanner · non-custodial · it never touches your wallet</div>
    </AbsoluteFill>
  );
};

const H = 110, B = 150, W = 150, S = 140, CTA = 145;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const c0 = at(H), c1 = at(B), c2 = at(W), c3 = at(S), cta = acc + 12;
const TOTAL = cta + CTA;

export const GeckoListed: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={H}><Hook dur={H} /></Sequence>
    <Sequence from={c1} durationInFrames={B}><Badge dur={B} /></Sequence>
    <Sequence from={c2} durationInFrames={W}><Why dur={W} /></Sequence>
    <Sequence from={c3} durationInFrames={S}><Stack dur={S} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const GECKO_LISTED_FRAMES = TOTAL;
