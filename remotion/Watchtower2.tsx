import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, Sequence, Loop, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Scanlines, HudCorners, GlitchIn } from "./MascotProduced";

/**
 * GL1TCH WATCHTOWER v2 — a higher-quality, better-told explainer (~26s, 9:16).
 * Tells it as a real Telegram conversation over cinematic b-roll:
 * hook ("you were asleep") → /watch + baseline → 3h later → 🚨 alert → payoff/CTA.
 * Local render, brand palette only.
 */

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const INK = "#050505";
const PAPER = "#F5F7F8";

const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const fade = (f: number, s: number, e: number, d = 12) => interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0.001], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Chroma: React.FC<{ text: string; size: number; split: number; color?: string }> = ({ text, size, split, color = PAPER }) => (
  <div style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
    <div style={{ position: "absolute", left: -split, top: -2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: PURPLE, opacity: 0.5, lineHeight: 1.08 }}>{text}</div>
    <div style={{ position: "absolute", left: split, top: 2, fontSize: size, fontWeight: 800, letterSpacing: -1.5, color: GREEN, opacity: 0.5, lineHeight: 1.08 }}>{text}</div>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5, color, textShadow: "0 6px 50px rgba(5,5,5,0.98)", lineHeight: 1.08 }}>{text}</div>
  </div>
);

const Bg: React.FC<{ clip: string; frames: number; opacity?: number }> = ({ clip, frames, opacity = 1 }) => (
  <>
    <Loop durationInFrames={frames}>
      <OffthreadVideo src={staticFile(`brand/${clip}`)} muted style={{ width: "100%", height: "100%", objectFit: "cover", opacity }} />
    </Loop>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,5,5,0.86) 0%, rgba(5,5,5,0.5) 30%, rgba(5,5,5,0.5) 55%, rgba(5,5,5,0.9) 80%, rgba(5,5,5,0.98) 100%)" }} />
  </>
);

/* ---------------- S1 hook ---------------- */
const Hook: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0, dur) }}>
      <Bg clip="gl1tch-web-datacenter-broll.mp4" frames={151} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 28, letterSpacing: 7, color: GREEN, opacity: rise(f, 6, 20) }}>03:14 // WHILE YOU SLEPT</div>
      <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center", padding: "0 64px", opacity: rise(f, 14, 34) }}>
        <Chroma text={"YOUR BAG WAS\nFINE AT MIDNIGHT."} size={80} split={split} />
      </div>
      <div style={{ position: "absolute", top: 1020, left: 0, right: 0, textAlign: "center", padding: "0 80px", fontFamily: "monospace", fontSize: 34, letterSpacing: 1, color: RED, opacity: rise(f, 56, 78) }}>
        a rug doesn&apos;t wait for you to wake up.
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Chat (S2 setup → S3 time → S4 alert) ---------------- */
const Bubble: React.FC<{ side: "l" | "r"; tone: "user" | "bot" | "alert"; appear: number; f: number; children: React.ReactNode }> = ({ side, tone, appear, f, children }) => {
  const op = rise(f, appear, appear + 10);
  const y = interpolate(f, [appear, appear + 12], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bg = tone === "user" ? "rgba(124,255,79,0.14)" : tone === "alert" ? "rgba(255,92,92,0.12)" : "rgba(255,255,255,0.05)";
  const border = tone === "user" ? `${GREEN}66` : tone === "alert" ? `${RED}88` : "rgba(255,255,255,0.12)";
  return (
    <div style={{ display: "flex", justifyContent: side === "r" ? "flex-end" : "flex-start", opacity: op, transform: `translateY(${y}px)`, marginBottom: 22 }}>
      <div style={{ maxWidth: "82%", background: bg, border: `1px solid ${border}`, borderRadius: 22, padding: "22px 26px", fontSize: 33, lineHeight: 1.5, color: PAPER, fontFamily: "ui-monospace, monospace" }}>
        {children}
      </div>
    </div>
  );
};

const ChatScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  // background swaps menace as the alert nears
  const alertPhase = f >= 250;
  // scroll the stack up a touch once the alert lands so it stays in frame
  const shift = interpolate(f, [250, 280], [0, -120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const buzz = alertPhase ? Math.sin(f * 1.7) * (interpolate(f, [250, 300], [5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 0;

  return (
    <AbsoluteFill style={{ opacity: fade(f, 0, dur, 14) }}>
      <Bg clip={alertPhase ? "gl1tch-glitch-hook-9x16.mp4" : "gl1tch-web-datacenter-broll.mp4"} frames={alertPhase ? 121 : 151} opacity={0.5} />

      {/* chat header */}
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, display: "flex", alignItems: "center", gap: 16, opacity: rise(f, 4, 16) }}>
        <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 64, height: 64, filter: `drop-shadow(0 0 14px ${GREEN}88)` }} />
        <div>
          <div style={{ fontSize: 38, fontWeight: 800, color: PAPER, letterSpacing: 1 }}>GL1TCH BOT</div>
          <div style={{ fontFamily: "monospace", fontSize: 22, color: GREEN }}>● watchtower online</div>
        </div>
      </div>

      {/* chat stack */}
      <div style={{ position: "absolute", top: 300, left: 70, right: 70, transform: `translate(${buzz}px, ${shift}px)` }}>
        <Bubble side="r" tone="user" appear={14} f={f}>/watch $TOKEN</Bubble>
        <Bubble side="l" tone="bot" appear={56} f={f}>
          👁 <b>Watching.</b> I&apos;ll ping you if its safety changes.
          <div style={{ marginTop: 16, borderTop: `1px solid ${GREEN}33`, paddingTop: 14, fontSize: 28, color: "rgba(245,247,248,0.85)" }}>
            <div>✅ verdict <b style={{ color: GREEN }}>CLEAN 92</b></div>
            <div>✅ LP locked <b style={{ color: GREEN }}>100%</b></div>
            <div>✅ mint authority <b style={{ color: GREEN }}>REVOKED</b></div>
          </div>
        </Bubble>

        {/* time divider */}
        <div style={{ textAlign: "center", margin: "10px 0 26px", fontFamily: "monospace", fontSize: 26, letterSpacing: 4, color: "rgba(245,247,248,0.6)", opacity: rise(f, 150, 168) }}>
          — ⏳ 3 HOURS LATER · 03:14 —
        </div>

        {/* the alert */}
        <Bubble side="l" tone="alert" appear={210} f={f}>
          🚨 <b style={{ color: RED }}>WATCHTOWER ALERT</b>
          <div style={{ marginTop: 12, fontSize: 30, lineHeight: 1.5 }}>
            <div>🔴 <b>$TOKEN</b> · <b style={{ color: RED }}>RUG-SHAPED</b></div>
            <div style={{ color: RED }}>• LP lock 100% → 0%</div>
            <div style={{ color: RED }}>• verdict CLEAN → RUG-SHAPED</div>
          </div>
          <div style={{ marginTop: 12, color: GREEN, fontSize: 28 }}>the dev pulled liquidity. get out.</div>
        </Bubble>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- S5 payoff + CTA ---------------- */
const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = f < 12 ? Math.sin(f * 6) * 6 : 1.4;
  const s = spring({ frame: f - 16, fps, config: { damping: 16, stiffness: 80 } });
  const cardY = interpolate(s, [0, 1], [80, 0]);
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: rise(f, 0, 14) }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 36%, ${GREEN}1f 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 430, left: 0, right: 0, textAlign: "center" }}>
        <img src={staticFile("brand/gl1tch-logo-256.png")} style={{ width: 120, height: 120, filter: `drop-shadow(0 0 26px ${GREEN}aa)` }} />
      </div>
      <div style={{ position: "absolute", top: 620, left: 0, right: 0, textAlign: "center", padding: "0 56px" }}>
        <Chroma text={"YOU WERE ASLEEP.\nGL1TCH WASN'T. 👁"} size={84} split={split} />
      </div>
      <div style={{ position: "absolute", top: 980, left: 70, right: 70, transform: `translateY(${cardY}px)` }}>
        <div style={{ borderRadius: 28, padding: "32px 36px", background: "rgba(5,5,5,0.7)", border: `1px solid ${GREEN}55`, boxShadow: `0 0 70px ${PURPLE}44` }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: PAPER, textAlign: "center", letterSpacing: 1 }}>
            <span style={{ color: GREEN }}>/watch</span> any token. We watch it for you.
          </div>
          <div style={{ marginTop: 18, fontSize: 36, fontWeight: 800, color: GREEN, textAlign: "center" }}>coin-three-mu.vercel.app/scan</div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 24, fontFamily: "monospace", fontSize: 25, color: "rgba(245,247,248,0.82)" }}>
            <span>@gl1tchbased</span><span style={{ color: GREEN }}>·</span><span>t.me/gl1tch_infected</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: 24, letterSpacing: 4, color: GREEN, opacity: 0.85 }}>
        free · non-custodial · any chain
      </div>
    </AbsoluteFill>
  );
};

const HOOK = 150, CHAT_FROM = 140, CHAT_DUR = 470, PAYOFF_FROM = 600, TOTAL = 780;

export const Watchtower2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Sequence durationInFrames={HOOK + 14}><Hook dur={HOOK + 14} /></Sequence>
      <Sequence from={CHAT_FROM} durationInFrames={CHAT_DUR}><ChatScene dur={CHAT_DUR} /></Sequence>
      <Sequence from={PAYOFF_FROM} durationInFrames={TOTAL - PAYOFF_FROM}><Payoff /></Sequence>
      <Scanlines />
      <HudCorners />
      {frame < PAYOFF_FROM + 6 && (
        <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", opacity: 0.0 }} />
      )}
      <GlitchIn len={6} />
    </AbsoluteFill>
  );
};
