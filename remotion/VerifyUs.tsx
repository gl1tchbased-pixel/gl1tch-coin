import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "DON'T TRUST US. VERIFY US." (~30s, 9:16). The trust pitch: we built the
 * rug-scanner, so we run it on OURSELVES, live, and hand over the receipts. A live
 * verdict card stamps VERIFIED, then the rug vectors tick green with "verify on
 * Solscan/RugCheck", an honest yellow-flag beat, and the open-source/anon line.
 * Original motion graphics, brand palette only — distinct from the step-rail explainers.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
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

// Scene 1 — DON'T TRUST US → VERIFY US (the title flip)
const Title: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const flip = f > 55;
  const split = f < 12 ? Math.sin(f * 6) * 7 : 1.6;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur), justifyContent: "center", alignItems: "center" }}>
      {!flip ? (
        <div style={{ textAlign: "center", opacity: seg(f, 0, 60, 10) }}>
          <div style={{ fontSize: 40, fontFamily: "monospace", color: "rgba(245,247,248,0.55)", letterSpacing: 4, marginBottom: 18 }}>every meme coin says</div>
          <Chroma text={'"TRUST US"'} size={96} split={split} color="rgba(245,247,248,0.85)" />
          <div style={{ marginTop: 26, fontSize: 32, fontFamily: "monospace", color: "rgba(255,196,79,0.85)" }}>then they pull the rug.</div>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 150, marginBottom: 6, opacity: rise(f, 56, 66) }}>🛡</div>
          <div style={{ transform: `scale(${interpolate(spring({ frame: f - 56, fps: 30, config: { damping: 12 } }), [0, 1], [0.8, 1])})` }}>
            <Chroma text={"DON'T TRUST US."} size={70} split={1.6} color="rgba(245,247,248,0.8)" />
          </div>
          <div style={{ marginTop: 10 }}>
            <Chroma text={"VERIFY US."} size={104} split={1.6} color={GREEN} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Scene 2 — we built the scanner, so we ran it on ourselves → live verdict card stamps VERIFIED
const SelfScan: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 30, fps, config: { damping: 15, stiffness: 90 } });
  const stamp = spring({ frame: f - 92, fps, config: { damping: 9, stiffness: 120 } });
  const checks = [
    { label: "Mint authority", v: "REVOKED", at: 50 },
    { label: "Freeze authority", v: "REVOKED", at: 58 },
    { label: "Transfer tax", v: "0.00%", at: 66 },
    { label: "Liquidity locked", v: "100%", at: 74 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 230, left: 80, right: 80, textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: PAPER, lineHeight: 1.2 }}>We built the rug-scanner.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 30, color: GREEN }}>so we ran it on ourselves. live.</div>
      </div>
      <div style={{ position: "absolute", top: 470, left: 80, right: 80, transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`, opacity: s }}>
        <div style={{ borderRadius: 24, border: `1px solid ${GREEN}66`, background: "rgba(5,5,5,0.65)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 30px", background: "rgba(124,255,79,0.08)" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: PAPER }}>$GL1TCH</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GREEN, lineHeight: 1 }}>LOW RISK</div>
              <div style={{ fontFamily: "monospace", fontSize: 30, color: "rgba(245,247,248,0.7)" }}>78 / 100</div>
            </div>
          </div>
          <div style={{ padding: "10px 30px 22px" }}>
            {checks.map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", padding: "15px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: rise(f, c.at, c.at + 12), fontSize: 31 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9999, background: "rgba(124,255,79,0.16)", color: GREEN, display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: 16, fontSize: 20, fontWeight: 800 }}>✓</span>
                <span style={{ color: "rgba(245,247,248,0.9)" }}>{c.label}</span>
                <span style={{ marginLeft: "auto", fontWeight: 800, color: GREEN, fontFamily: "monospace" }}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* VERIFIED stamp */}
        <div style={{ position: "absolute", left: 40, bottom: -58, transform: `rotate(-12deg) scale(${interpolate(stamp, [0, 1], [2.2, 1], C)})`, opacity: rise(f, 92, 100) }}>
          <div style={{ border: `5px solid ${GREEN}`, color: GREEN, borderRadius: 14, padding: "10px 26px", fontFamily: "monospace", fontWeight: 800, fontSize: 44, letterSpacing: 4, boxShadow: `0 0 30px ${GREEN}55`, background: "rgba(5,5,5,0.5)" }}>VERIFIED</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3 — every claim has a receipt (verify on independent sources)
const Receipts: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rows = [
    { label: "Mint & freeze revoked", src: "Solscan", at: 18 },
    { label: "Liquidity locked / burned", src: "RugCheck", at: 30 },
    { label: "0% insiders · score 1", src: "RugCheck", at: 42 },
    { label: "Every wallet, public", src: "Solscan", at: 54 },
    { label: "The code is open", src: "GitHub", at: 66 },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 250, left: 80, right: 80, textAlign: "center" }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: PAPER }}>Every claim, a <span style={{ color: GREEN }}>receipt</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.65)" }}>checked on sources we don&apos;t control</div>
      </div>
      <div style={{ position: "absolute", top: 470, left: 80, right: 80 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 26px", marginBottom: 16, borderRadius: 16, border: `1px solid ${GREEN}33`, background: "rgba(124,255,79,0.05)", opacity: rise(f, r.at, r.at + 12), transform: `translateX(${interpolate(rise(f, r.at, r.at + 12), [0, 1], [30, 0])}px)`, fontSize: 32 }}>
            <span style={{ color: GREEN, fontSize: 28 }}>✓</span>
            <span style={{ color: PAPER, flex: 1 }}>{r.label}</span>
            <span style={{ fontFamily: "monospace", fontSize: 24, color: GREEN }}>{r.src} ↗</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 4 — honest yellow flag + anon/open line
const Honest: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 280, left: 80, right: 80, textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: PAPER }}>We don&apos;t fake a perfect score.</div>
      </div>
      <div style={{ position: "absolute", top: 470, left: 80, right: 80, opacity: rise(f, 16, 32) }}>
        <div style={{ borderRadius: 18, border: `1px solid ${AMBER}55`, background: "rgba(255,196,79,0.06)", padding: "26px 30px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 28, color: AMBER, fontWeight: 700 }}>⚠ liquidity is thin</div>
          <div style={{ marginTop: 12, fontSize: 30, color: "rgba(245,247,248,0.85)", lineHeight: 1.5 }}>
            …but it&apos;s <b style={{ color: GREEN }}>100% locked</b>. A pool we <i>can&apos;t</i> pull beats a big one a dev can yank.
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 800, left: 80, right: 80, textAlign: "center", opacity: rise(f, 46, 64) }}>
        <div style={{ fontSize: 38, fontWeight: 800, color: PAPER }}>Anonymous team —</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: GREEN }}>fully auditable code.</div>
        <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 26, color: "rgba(245,247,248,0.6)" }}>read it. fork it. catch us hiding something.</div>
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
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>🛡</div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"DON'T TRUST US.\nVERIFY US."} size={88} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 32, color: GREEN }}>Telegram: <span style={{ color: PAPER }}>/proof</span></div>
      <div style={{ position: "absolute", top: 1138, left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/proof</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>free · non-custodial · the receipts are on-chain</div>
    </AbsoluteFill>
  );
};

const T = 130, S = 175, R = 165, H = 175, CTA = 150;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const tFrom = at(T), sc = at(S), rc = at(R), hn = at(H), cta = acc + 12;
const TOTAL = cta + CTA;

export const VerifyUs: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={T}><Title dur={T} /></Sequence>
    <Sequence from={sc} durationInFrames={S}><SelfScan dur={S} /></Sequence>
    <Sequence from={rc} durationInFrames={R}><Receipts dur={R} /></Sequence>
    <Sequence from={hn} durationInFrames={H}><Honest dur={H} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const VERIFY_US_FRAMES = TOTAL;
