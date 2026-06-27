import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH — "WALLET WATCH: HOW IT WORKS" (~36s, 9:16). The new Watchtower++ feature:
 * point the bot at any Solana wallet (a whale, a token's dev, or your own bag) and it
 * pings you when that wallet SELLS or moves a position out — before the chart reacts.
 * A clean 4-step numbered rail + a dedicated $GL1TCH utility scene (hold more = watch
 * more wallets, observer 3 → ghost 200). Original motion graphics, brand palette only.
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

const Pos: React.FC<{ sym: string; amt: string; color: string; o: number; strike?: boolean }> = ({ sym, amt, color, o, strike }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "16px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: o, fontSize: 32 }}>
    <span style={{ marginRight: 16, color }}>◆</span>
    <span style={{ color: "rgba(245,247,248,0.9)", fontWeight: 700 }}>{sym}</span>
    <span style={{ marginLeft: "auto", fontWeight: 800, color, textDecoration: strike ? "line-through" : "none" }}>{amt}</span>
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
      <div style={{ position: "absolute", top: 500, left: 0, right: 0, textAlign: "center", fontSize: 150 }}>🐋</div>
      <div style={{ position: "absolute", top: 740, left: 0, right: 0, textAlign: "center", padding: "0 50px" }}>
        <Chroma text={"WALLET WATCH"} size={92} split={split} />
      </div>
      <div style={{ position: "absolute", top: 900, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 34, letterSpacing: 3, color: GREEN, opacity: rise(f, 20, 38) }}>watch the whales. watch the devs.</div>
      <div style={{ position: "absolute", top: 970, left: 0, right: 0, textAlign: "center", padding: "0 90px", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.7)", opacity: rise(f, 36, 54) }}>get pinged the second they sell — before the chart moves</div>
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
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>Point it at <span style={{ color: GREEN }}>any wallet</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>a whale · a token&apos;s dev · your own bag</div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 80, right: 80, transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)` }}>
        <div style={{ borderRadius: 22, border: `1px solid ${GREEN}55`, background: "rgba(5,5,5,0.6)", padding: "28px 30px", fontFamily: "ui-monospace, monospace" }}>
          <div style={{ fontSize: 28, color: "rgba(245,247,248,0.55)" }}>Telegram</div>
          <div style={{ marginTop: 14, fontSize: 38, color: GREEN, fontWeight: 800 }}>/watchwallet</div>
          <div style={{ marginTop: 10, fontSize: 28, color: PAPER, wordBreak: "break-all" }}>5tzF…uAi9 <span style={{ color: "rgba(245,247,248,0.5)" }}>whale-1</span></div>
        </div>
        <div style={{ marginTop: 18, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: "rgba(245,247,248,0.6)", opacity: rise(f, 60, 76) }}>read-only · it never touches a wallet</div>
      </div>
    </AbsoluteFill>
  );
};

const Step2: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={2} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>It snapshots the <span style={{ color: GREEN }}>holdings</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>every token + SOL — locked as a baseline</div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 80, right: 80 }}>
        <div style={{ borderRadius: 22, border: `1px solid ${GREEN}55`, background: "rgba(5,5,5,0.6)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 26px", background: "rgba(124,255,79,0.08)" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: PAPER, fontFamily: "monospace" }}>5tzF…uAi9</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: GREEN }}>baseline</div>
          </div>
          <div style={{ padding: "6px 26px 14px" }}>
            <Pos sym="SOL" amt="1,204" color={GREEN} o={rise(f, 24, 38)} />
            <Pos sym="$WIF" amt="820,000" color={GREEN} o={rise(f, 34, 48)} />
            <Pos sym="$BONK" amt="41.2M" color={GREEN} o={rise(f, 44, 58)} />
          </div>
        </div>
        <div style={{ marginTop: 18, textAlign: "center", fontFamily: "monospace", fontSize: 28, color: GREEN, opacity: rise(f, 70, 86) }}>✓ holdings locked</div>
      </div>
    </AbsoluteFill>
  );
};

const Step3: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const rot = (f * 4) % 360;
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <Rail step={3} />
      <div style={{ position: "absolute", top: 430, left: 80, right: 80 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: PAPER }}>It re-checks every <span style={{ color: GREEN }}>3 hours</span>.</div>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>flags any position that dropped ≥ 25%</div>
      </div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 180, height: 180, borderRadius: 9999, border: `10px solid rgba(124,255,79,0.18)`, borderTopColor: GREEN, transform: `rotate(${rot}deg)`, boxShadow: `0 0 40px ${GREEN}33` }} />
      </div>
      <div style={{ position: "absolute", top: 990, left: 80, right: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", borderRadius: 18, border: `1px solid ${RED}66`, background: "rgba(255,92,92,0.07)", opacity: rise(f, 40, 54), fontSize: 34 }}>
          <span style={{ color: "rgba(245,247,248,0.9)", flex: 1, fontWeight: 700 }}>$WIF</span>
          <span style={{ color: "rgba(245,247,248,0.5)", textDecoration: "line-through" }}>820,000</span>
          <span style={{ color: RED, fontSize: 30 }}>→</span>
          <span style={{ color: RED, fontWeight: 800 }}>0</span>
        </div>
        <div style={{ marginTop: 16, textAlign: "center", fontFamily: "monospace", fontSize: 28, color: RED, opacity: rise(f, 62, 78) }}>⚠ whale exited $WIF</div>
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
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>the second smart money moves.</div>
      </div>
      <div style={{ position: "absolute", top: 660, left: 80, right: 80, transform: `translate(${buzz}px, ${interpolate(s, [0, 1], [40, 0])}px)` }}>
        <div style={{ borderRadius: 22, border: `1px solid ${RED}88`, background: "rgba(255,92,92,0.1)", padding: "26px 30px", fontSize: 32, lineHeight: 1.5, color: PAPER, fontFamily: "ui-monospace, monospace" }}>
          🐋 <b style={{ color: RED }}>WALLET MOVE</b>
          <div style={{ marginTop: 14, fontFamily: "monospace", color: "rgba(245,247,248,0.75)", fontSize: 28 }}>5tzF…uAi9 (whale-1)</div>
          <div style={{ marginTop: 12, color: RED }}>• exited <b>$WIF</b></div>
          <div style={{ color: RED }}>• sold ~62% of <b>$BONK</b></div>
          <div style={{ color: GREEN, marginTop: 14 }}>you saw it before the chart did.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Dedicated $GL1TCH utility scene — hold more = watch more wallets.
const Utility: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const tiers = [
    { name: "free", slots: "3", at: 20 },
    { name: "INFECTED", slots: "10", at: 32 },
    { name: "BEARER", slots: "25", at: 44 },
    { name: "CORE", slots: "50", at: 56 },
    { name: "GHOST", slots: "200", at: 68, top: true },
  ];
  return (
    <AbsoluteFill style={{ opacity: seg(f, 0, dur) }}>
      <div style={{ position: "absolute", top: 250, left: 80, right: 80, textAlign: "center" }}>
        <div style={{ fontSize: 54, fontWeight: 800, color: PAPER }}>Hold <span style={{ color: GREEN }}>$GL1TCH</span>,</div>
        <div style={{ fontSize: 54, fontWeight: 800, color: PAPER }}>watch <span style={{ color: GREEN }}>more wallets</span>.</div>
        <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 28, color: "rgba(245,247,248,0.7)" }}>your rank = your watch slots → <span style={{ color: GREEN }}>/verify</span></div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 90, right: 90 }}>
        {tiers.map((t) => {
          const o = rise(f, t.at, t.at + 12);
          const w = interpolate(f, [t.at, t.at + 20], [0, Math.min(100, 18 + Number(t.slots) * 0.42)], C);
          return (
            <div key={t.name} style={{ marginBottom: 22, opacity: o }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 800, color: t.top ? GREEN : PAPER, letterSpacing: 1 }}>{t.name}</span>
                <span style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 800, color: t.top ? GREEN : "rgba(245,247,248,0.85)" }}>{t.slots} wallets</span>
              </div>
              <div style={{ height: 18, borderRadius: 10, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${w}%`, background: t.top ? GREEN : `${GREEN}99`, boxShadow: t.top ? `0 0 18px ${GREEN}` : "none" }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 18, textAlign: "center", fontFamily: "monospace", fontSize: 27, color: GREEN, opacity: rise(f, 86, 100) }}>more $GL1TCH → up to 200 wallets guarded</div>
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
      <div style={{ position: "absolute", top: 540, left: 0, right: 0, textAlign: "center", fontSize: 120 }}>🐋</div>
      <div style={{ position: "absolute", top: 740, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <Chroma text={"WATCH THE WALLET.\nWE PING YOU."} size={78} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 34, color: GREEN }}>Telegram: <span style={{ color: PAPER }}>/watchwallet &lt;address&gt;</span></div>
      <div style={{ position: "absolute", top: 1100, left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 800, color: GREEN }}>coin-three-mu.vercel.app/scan</div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 3, color: GREEN, opacity: 0.85 }}>t.me/gl1tch_infected · free · non-custodial</div>
    </AbsoluteFill>
  );
};

const T = 110, S = 175, S2 = 175, S3 = 185, S4 = 175, U = 200, CTA = 150;
let acc = 0;
const at = (d: number) => { const v = acc; acc += d - 12; return v; };
const tFrom = at(T), s1 = at(S), s2 = at(S2), s3 = at(S3), s4 = at(S4), util = at(U), cta = acc + 12;
const TOTAL = cta + CTA;

export const WalletWatch: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
    <Sequence durationInFrames={T}><Title dur={T} /></Sequence>
    <Sequence from={s1} durationInFrames={S}><Step1 dur={S} /></Sequence>
    <Sequence from={s2} durationInFrames={S2}><Step2 dur={S2} /></Sequence>
    <Sequence from={s3} durationInFrames={S3}><Step3 dur={S3} /></Sequence>
    <Sequence from={s4} durationInFrames={S4}><Step4 dur={S4} /></Sequence>
    <Sequence from={util} durationInFrames={U}><Utility dur={U} /></Sequence>
    <Sequence from={cta} durationInFrames={CTA}><Cta /></Sequence>
    <Scanlines />
    <HudCorners />
    <GlitchIn len={6} />
  </AbsoluteFill>
);

export const WALLET_WATCH_FRAMES = TOTAL;
