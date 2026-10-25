import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Demo } from "./demos";
import { BODY, C, DISPLAY, FAINT, GREEN, INK, MONO, MUTED, PAPER, PURPLE, rise, seeded, seg } from "./theme";
import type { FeatureProps } from "./types";

// Scene boundaries (frames at 30 fps, 22 s total).
const HOOK = [0, 100] as const;
const PAIN = [100, 200] as const;
const DEMO = [200, 480] as const;
const BENEFITS = [480, 565] as const;
const CTA = [565, 660] as const;
const CUTS = [PAIN[0], DEMO[0], BENEFITS[0], CTA[0]];

/** Font size that keeps one line of Tektur inside maxW. */
const fit = (text: string, maxW: number, max: number, em = 0.52) => Math.min(max, Math.floor(maxW / (em * Math.max(text.length, 1))));

const Backdrop: React.FC<{ tint: FeatureProps["tint"]; seed: string }> = ({ tint, seed }) => {
  const f = useCurrentFrame();
  const r = seeded(seed);
  const gx = 30 + r() * 40, gy = 30 + r() * 30;
  const glow = tint === "green" ? "124,255,79" : "122,60,255";
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 900px 1100px at ${gx + Math.sin(f / 90) * 8}% ${gy + Math.cos(f / 110) * 6}%, rgba(${glow},0.32), transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 700px 600px at ${100 - gx}% 85%, rgba(${tint === "green" ? "122,60,255" : "124,255,79"},0.10), transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: "linear-gradient(rgba(245,247,248,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(245,247,248,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          backgroundPosition: `0 ${(f * 0.6) % 72}px`,
          maskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 80%)",
        }}
      />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(245,247,248,0.03) 0 1px, transparent 1px 4px)" }} />
    </AbsoluteFill>
  );
};

/** Horizontal slices + RGB bars for a few frames at each scene cut. */
const GlitchCuts: React.FC<{ seed: string }> = ({ seed }) => {
  const f = useCurrentFrame();
  const cut = CUTS.find((c) => f >= c - 4 && f < c + 6);
  if (cut === undefined) return null;
  const r = seeded(`${seed}-${cut}-${f}`);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${r() * 100}%`, height: 6 + r() * 60, background: i % 2 ? `rgba(124,255,79,${0.15 + r() * 0.3})` : `rgba(122,60,255,${0.2 + r() * 0.3})`, transform: `translateX(${(r() - 0.5) * 200}px)` }} />
      ))}
    </AbsoluteFill>
  );
};

const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = seg(f, -10, CTA[0] + 6, 10); // visible from frame 0: the first frame is the thumbnail
  return (
    <div style={{ position: "absolute", top: 230, left: 80, display: "flex", alignItems: "center", gap: 18, opacity: o }}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: PAPER, textShadow: `-2px 0 ${PURPLE}aa, 2px 0 ${GREEN}66` }}>GL1TCH</span>
      <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: GREEN, padding: "8px 16px", border: `1px solid ${GREEN}55`, borderRadius: 99, background: "rgba(7,8,11,0.6)", textTransform: "uppercase" }}>{text}</span>
    </div>
  );
};

const HookLine: React.FC<{ text: string; size: number; color: string; style: FeatureProps["hookStyle"]; start: number; seed: string }> = ({ text, size, color, style, start, seed }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shadow = color === PAPER ? `-3px 0 ${PURPLE}99, 3px 0 ${GREEN}55` : "none";
  const base: React.CSSProperties = { fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.04, color, textShadow: shadow, whiteSpace: "nowrap" };
  if (style === "type") {
    const n = Math.floor(interpolate(f, [start, start + text.length * 1.6], [0, text.length], C));
    return <div style={base}>{text.slice(0, n)}<span style={{ opacity: n < text.length && Math.floor(f / 4) % 2 ? 1 : 0, color: GREEN }}>▍</span></div>;
  }
  if (style === "glitch") {
    const r = seeded(`${seed}-${f}`);
    const settle = 1 - rise(f, start, start + 16);
    return <div style={{ ...base, opacity: f < start ? 0 : 1, transform: `translateX(${(r() - 0.5) * 60 * settle}px) skewX(${(r() - 0.5) * 20 * settle}deg)`, filter: settle > 0.1 ? `blur(${settle * 2}px)` : "none" }}>{text}</div>;
  }
  return (
    <div style={base}>
      {text.split(" ").map((w, i) => {
        const p = spring({ frame: f - start - i * 4, fps, config: { damping: 11, mass: 0.6 } });
        return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + p * 0.4})`, opacity: p, marginRight: size * 0.25 }}>{w}</span>;
      })}
    </div>
  );
};

/** Transparent 3D still with a slow tilt, float and an entry spring. */
const Mascot: React.FC<{ pose: string; f: number; size: number; x: number; y: number; flip?: boolean; enter: number }> = ({ pose, f, size, x, y, flip, enter }) => {
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - enter, fps, config: { damping: 12, mass: 0.8 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, perspective: 1200, opacity: p }}>
      <Img
        src={staticFile(`mascot/${pose}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `translateY(${Math.sin(f / 18) * 18 + (1 - p) * 200}px) rotateY(${Math.sin(f / 40) * 14 + (flip ? 180 : 0)}deg) rotateX(${Math.cos(f / 50) * 6}deg) scale(${0.7 + p * 0.3})`,
          filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.6))",
        }}
      />
    </div>
  );
};

export const FeatureShort: React.FC<FeatureProps> = (props) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const { fps } = useVideoConfig();
  const left = props.layout === "left";
  const textW = 920;
  const s1 = fit(props.hook[0], textW, 150), s2 = fit(props.hook[1], textW, 150);

  // Mascot path: big in the hook, parked in a corner for the pain line, gone for the demo.
  const parkT = rise(f, PAIN[0] - 6, PAIN[0] + 14);
  const mSize = interpolate(parkT, [0, 1], [880, 380]);
  const mX = interpolate(parkT, [0, 1], [left ? 40 : width - 920, left ? width - 430 : 50]);
  const mY = interpolate(parkT, [0, 1], [820, 1180]);
  const mascotOut = 1 - rise(f, DEMO[0] - 10, DEMO[0] + 4);

  return (
    <AbsoluteFill>
      <Backdrop tint={props.tint} seed={props.id} />
      <Kicker text={props.kicker} />

      {/* HOOK */}
      <AbsoluteFill style={{ opacity: seg(f, HOOK[0] - 6, PAIN[0] + 4, 6) }}>
        <div style={{ position: "absolute", top: 380, left: 80 }}>
          <HookLine text={props.hook[0]} size={s1} color={PAPER} style={props.hookStyle} start={-60} seed={props.id} />
          <HookLine text={props.hook[1]} size={s2} color={GREEN} style={props.hookStyle} start={10} seed={`${props.id}b`} />
        </div>
      </AbsoluteFill>

      {/* PAIN */}
      <AbsoluteFill style={{ opacity: seg(f, PAIN[0], DEMO[0], 8) }}>
        <div style={{ position: "absolute", top: 480, left: 80, right: 80 }}>
          {props.painStat && (
            <div style={{ transform: `scale(${spring({ frame: f - PAIN[0] - 4, fps, config: { damping: 10 } })})`, transformOrigin: "left center" }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, color: GREEN, lineHeight: 1 }}>{props.painStat.value}</div>
              <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: FAINT, textTransform: "uppercase", margin: "10px 0 40px" }}>{props.painStat.label}</div>
            </div>
          )}
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 76, lineHeight: 1.16, color: PAPER, opacity: rise(f, PAIN[0] + 8, PAIN[0] + 22), transform: `translateY(${(1 - rise(f, PAIN[0] + 8, PAIN[0] + 22)) * 30}px)` }}>{props.pain}</div>
        </div>
      </AbsoluteFill>

      {/* Mascot for hook + pain */}
      {f < DEMO[0] + 6 && (
        <div style={{ opacity: mascotOut }}>
          <Mascot pose={props.pose} f={f} size={mSize} x={mX} y={mY} enter={-30} />
        </div>
      )}

      {/* DEMO */}
      <Sequence from={DEMO[0] - 6} durationInFrames={DEMO[1] - DEMO[0] + 12} layout="none">
        <AbsoluteFill style={{ opacity: seg(f, DEMO[0] - 6, DEMO[1] + 6, 8) }}>
          <div style={{ position: "absolute", top: 320, bottom: 400, left: 64, right: 64, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Demo spec={props.demo} f={f - DEMO[0]} dur={DEMO[1] - DEMO[0]} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* BENEFITS */}
      <AbsoluteFill style={{ opacity: seg(f, BENEFITS[0], CTA[0] + 4, 8) }}>
        <div style={{ position: "absolute", top: 600, left: 80, right: 80 }}>
          {props.benefits.map((b, i) => {
            const p = spring({ frame: f - BENEFITS[0] - 4 - i * 8, fps, config: { damping: 13 } });
            return (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 34, marginBottom: 64, transform: `translateX(${(1 - p) * (left ? -200 : 200)}px) perspective(1000px) rotateY(${(1 - p) * (left ? 30 : -30)}deg)`, opacity: p }}>
                <span style={{ width: 108, height: 108, borderRadius: 30, display: "grid", placeItems: "center", background: `${GREEN}1c`, border: `2px solid ${GREEN}66`, color: GREEN, fontFamily: DISPLAY, fontWeight: 800, fontSize: 50 }}>✓</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: fit(b, 760, 80, 0.6), color: PAPER, whiteSpace: "nowrap" }}>{b}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* CTA */}
      <Sequence from={CTA[0] - 4} layout="none">
        <AbsoluteFill style={{ opacity: rise(f, CTA[0] - 4, CTA[0] + 8) }}>
          <div style={{ position: "absolute", top: 210, left: (width - 860) / 2, width: 860, height: 900, overflow: "hidden", maskImage: "radial-gradient(ellipse 48% 50% at 50% 50%, #000 62%, transparent 100%)" }}>
            {/* crop the clip's HUD labels away; keep the mascot */}
            <OffthreadVideo src={staticFile(`clips/${props.clip}`)} muted style={{ position: "absolute", width: 1180, height: 1180, left: -160, top: -150 }} />
          </div>
          <div style={{ position: "absolute", top: 1110, left: 0, right: 0, textAlign: "center" }}>
            <div style={{ display: "inline-block", fontFamily: MONO, fontSize: 56, color: PAPER, padding: "22px 40px", borderRadius: 999, border: `2px solid ${GREEN}88`, background: "rgba(7,8,11,0.7)", boxShadow: `0 0 60px ${GREEN}33`, transform: `scale(${spring({ frame: f - CTA[0] - 6, fps, config: { damping: 11 } })})` }}>
              {(() => {
                const [host, ...rest] = props.cta.split("/");
                const path = rest.length ? `/${rest.join("/")}` : "";
                const size = Math.min(56, Math.floor(1300 / Math.max(props.cta.length, 1)));
                return <span style={{ fontSize: size, whiteSpace: "nowrap" }}><span style={{ color: GREEN, fontWeight: 700 }}>{host}</span>{path}</span>;
              })()}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 36, color: MUTED, marginTop: 34, opacity: rise(f, CTA[0] + 16, CTA[0] + 28) }}>Free · no wallet needed · any chain</div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: FAINT, marginTop: 22, letterSpacing: 1, opacity: rise(f, CTA[0] + 24, CTA[0] + 36) }}>Built by the $GL1TCH team · not financial advice</div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <GlitchCuts seed={props.id} />
    </AbsoluteFill>
  );
};
