import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { AMBER, BODY, C, DISPLAY, FAINT, GREEN, MONO, MUTED, PAPER, PURPLE, RED, rise, toneOf } from "./theme";
import type { CheckStatus, DemoSpec } from "./types";

type DemoProps<K extends DemoSpec["kind"]> = { spec: Extract<DemoSpec, { kind: K }>; f: number; dur: number };

const MARK: Record<CheckStatus, [string, string]> = { ok: ["✓", GREEN], warn: ["!", AMBER], bad: ["✕", RED], unknown: ["?", FAINT] };
const short = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a);

/** Glass panel that swings in from a 3D tilt. */
export const Panel: React.FC<{ f: number; children: React.ReactNode; label?: string; live?: string }> = ({ f, children, label, live }) => {
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 16, mass: 0.9 } });
  return (
    <div style={{ perspective: 1600, width: "100%" }}>
      <div
        style={{
          transform: `rotateX(${(1 - p) * 28}deg) translateY(${(1 - p) * 140}px) scale(${0.9 + p * 0.1})`,
          opacity: p,
          transformOrigin: "50% 100%",
          borderRadius: 40,
          padding: "44px 46px",
          background: "linear-gradient(160deg, rgba(22,24,34,0.92), rgba(10,11,16,0.92))",
          border: "1px solid rgba(245,247,248,0.10)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(245,247,248,0.06)",
        }}
      >
        {(label || live) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, fontFamily: MONO, fontSize: 20, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap", gap: 20 }}>
            <span style={{ color: FAINT }}>{label}</span>
            {live && (
              <span style={{ color: GREEN, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 99, background: GREEN, boxShadow: `0 0 14px ${GREEN}`, opacity: 0.5 + 0.5 * Math.sin(f / 5) }} />
                {live}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

const Meter: React.FC<{ score: number; verdict: string; t: number }> = ({ score, verdict, t }) => {
  const tone = toneOf(verdict);
  const shown = Math.round(score * t);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 34 }}>
      <div style={{ flex: 1, height: 18, borderRadius: 99, background: "rgba(245,247,248,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${shown}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${tone}88, ${tone})`, boxShadow: `0 0 24px ${tone}` }} />
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: tone, minWidth: 150, textAlign: "right" }}>
        {shown}
        <span style={{ fontSize: 28, color: FAINT }}>/100</span>
      </div>
    </div>
  );
};

export const ScanDemo: React.FC<DemoProps<"scan">> = ({ spec, f, dur }) => {
  const typed = spec.token.address.slice(0, Math.floor(rise(f, 6, 40) * spec.token.address.length));
  const per = (dur - 110) / Math.max(spec.checks.length, 1);
  const meterT = rise(f, dur - 80, dur - 40);
  return (
    <Panel f={f} label="GL1TCH SCANNER" live={spec.live}>
      <div style={{ fontFamily: MONO, fontSize: 26, color: MUTED, padding: "20px 24px", borderRadius: 18, background: "rgba(245,247,248,0.05)", border: "1px solid rgba(124,255,79,0.25)", overflow: "hidden", whiteSpace: "nowrap" }}>
        {typed}
        <span style={{ opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: GREEN }}>▍</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, margin: "30px 0 18px", opacity: rise(f, 40, 52) }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, color: PAPER }}>{spec.token.symbol ? `$${spec.token.symbol}` : spec.token.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 22, color: FAINT, textTransform: "uppercase" }}>{spec.token.chain}</span>
      </div>
      {spec.checks.map((c, i) => {
        const t = rise(f, 50 + i * per, 50 + i * per + 10);
        const [mark, tone] = MARK[c.status];
        return (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 22, padding: "20px 0", borderTop: "1px solid rgba(245,247,248,0.06)", opacity: t, transform: `translateX(${(1 - t) * 40}px)` }}>
            <span style={{ width: 58, height: 58, borderRadius: 16, display: "grid", placeItems: "center", background: `${tone}22`, color: tone, fontFamily: MONO, fontWeight: 800, fontSize: 32 }}>{mark}</span>
            <span style={{ fontFamily: BODY, fontSize: 40, color: PAPER, flex: 1 }}>{c.label}</span>
            {c.note && <span style={{ fontFamily: MONO, fontSize: 26, color: tone }}>{c.note}</span>}
          </div>
        );
      })}
      <div style={{ opacity: rise(f, dur - 90, dur - 75) }}>
        <div style={{ marginTop: 30, fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, color: toneOf(spec.verdict), letterSpacing: 2 }}>{spec.verdict}</div>
        <Meter score={spec.score} verdict={spec.verdict} t={meterT} />
      </div>
    </Panel>
  );
};

export const RadarDemo: React.FC<DemoProps<"radar">> = ({ spec, f }) => {
  const sweep = (f * 4) % 360;
  return (
    <Panel f={f} label="RUG RADAR · FRESH LAUNCHES" live={spec.live}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 26, perspective: 900 }}>
        <div style={{ position: "relative", width: 380, height: 380, transform: "rotateX(58deg)", transformStyle: "preserve-3d" }}>
          {[1, 0.7, 0.4].map((r) => (
            <div key={r} style={{ position: "absolute", inset: `${(1 - r) * 50}%`, borderRadius: "50%", border: `2px solid ${GREEN}55` }} />
          ))}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(from ${sweep}deg, ${GREEN}66, transparent 60deg)` }} />
          {spec.rows.slice(0, 5).map((r, i) => {
            const a = (i * 71 + 30) * (Math.PI / 180), d = 60 + i * 26;
            const lit = rise(f, 30 + i * 22, 40 + i * 22);
            return <div key={i} style={{ position: "absolute", left: 190 + Math.cos(a) * d - 9, top: 190 + Math.sin(a) * d - 9, width: 18, height: 18, borderRadius: 99, background: toneOf(r.verdict), boxShadow: `0 0 18px ${toneOf(r.verdict)}`, opacity: lit }} />;
          })}
        </div>
      </div>
      {spec.rows.slice(0, 5).map((r, i) => {
        const t = rise(f, 30 + i * 22, 44 + i * 22);
        const tone = toneOf(r.verdict);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 0", borderTop: "1px solid rgba(245,247,248,0.06)", opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 38, color: PAPER, width: 290, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.symbol ? `$${r.symbol}` : r.name}</span>
            <span style={{ fontFamily: BODY, fontSize: 28, color: MUTED, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</span>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: tone, padding: "8px 14px", borderRadius: 10, background: `${tone}1f` }}>{r.verdict}</span>
          </div>
        );
      })}
    </Panel>
  );
};

export const AlertDemo: React.FC<DemoProps<"alert">> = ({ spec, f }) => {
  const { fps } = useVideoConfig();
  const drop = spring({ frame: f - 40, fps, config: { damping: 12 } });
  const shake = f > 40 && f < 60 ? Math.sin(f * 2.2) * 6 : 0;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: 640, height: 1080, borderRadius: 72, padding: 22, background: "#0d0f15", border: "2px solid rgba(245,247,248,0.12)", boxShadow: "0 50px 140px rgba(0,0,0,0.6)", transform: `perspective(1600px) rotateY(${interpolate(f, [0, 60], [-18, -6], C)}deg) translateX(${shake}px)`, opacity: rise(f, 0, 14) }}>
        <div style={{ height: "100%", borderRadius: 54, background: "linear-gradient(180deg, #151826, #0a0b10)", padding: "70px 30px", overflow: "hidden" }}>
          <div style={{ fontFamily: BODY, fontSize: 110, fontWeight: 300, color: PAPER, textAlign: "center", opacity: 0.9 }}>21:47</div>
          <div style={{ fontFamily: BODY, fontSize: 26, color: FAINT, textAlign: "center", marginBottom: 60 }}>Telegram · @gl1tch_infected_bot</div>
          <div style={{ transform: `translateY(${(1 - drop) * -260}px)`, opacity: drop, borderRadius: 30, padding: "28px 28px", background: "rgba(30,34,48,0.95)", border: `1px solid ${spec.app === "wallet" ? AMBER : RED}55`, boxShadow: `0 0 50px ${spec.app === "wallet" ? AMBER : RED}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: PURPLE, display: "grid", placeItems: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: PAPER }}>G</span>
              <span style={{ fontFamily: MONO, fontSize: 22, color: MUTED, letterSpacing: 1 }}>{spec.app === "wallet" ? "WALLET WATCH" : "WATCHTOWER"}</span>
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: PAPER, marginBottom: 12 }}>{spec.title}</div>
            {spec.lines.map((l, i) => (
              <div key={i} style={{ fontFamily: BODY, fontSize: 26, color: MUTED, lineHeight: 1.45, opacity: rise(f, 60 + i * 14, 72 + i * 14) }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SealDemo: React.FC<DemoProps<"seal">> = ({ spec, f, dur }) => {
  const leaves = 8;
  const stamp = spring({ frame: f - (dur - 120), fps: 30, config: { damping: 9 } });
  return (
    <Panel f={f} label="VERDICT ANCHORING · SOLANA" live={spec.live}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        {[1, 2, 4, 8].map((n, lvl) => (
          <div key={n} style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {Array.from({ length: n }).map((_, i) => {
              const t = rise(f, 20 + (3 - lvl) * 30 + i * 3, 34 + (3 - lvl) * 30 + i * 3);
              return <div key={i} style={{ width: n === 1 ? 420 : 820 / n - 14, height: 76, borderRadius: 16, display: "grid", placeItems: "center", fontFamily: MONO, fontSize: n === 1 ? 28 : 22, color: n === 1 ? GREEN : MUTED, background: n === 1 ? `${GREEN}18` : "rgba(245,247,248,0.06)", border: `1px solid ${n === 1 ? GREEN + "77" : "rgba(245,247,248,0.10)"}`, opacity: t, transform: `scale(${0.8 + t * 0.2})` }}>{n === 1 ? `root ${spec.root.slice(0, 8)}…` : n === leaves ? "✓" : "#"}</div>;
            })}
          </div>
        ))}
        <div style={{ fontFamily: BODY, fontSize: 32, color: MUTED, opacity: rise(f, 150, 170) }}>{spec.count} verdicts → one Merkle root → one SPL Memo</div>
      </div>
      <div style={{ marginTop: 34, padding: "26px 28px", borderRadius: 22, border: `2px solid ${GREEN}`, background: `${GREEN}10`, transform: `scale(${0.6 + stamp * 0.4}) rotate(${(1 - stamp) * -8}deg)`, opacity: Math.min(1, stamp * 1.4) }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 60, color: GREEN, letterSpacing: 4 }}>SEALED ON SOLANA</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: MUTED, marginTop: 12 }}>slot {spec.slot.toLocaleString("en-US")} · tx {short(spec.sig)}</div>
        <div style={{ fontFamily: MONO, fontSize: 24, color: FAINT, marginTop: 8 }}>signer {short(spec.attester)}</div>
      </div>
    </Panel>
  );
};

export const GraphDemo: React.FC<DemoProps<"graph">> = ({ spec, f }) => {
  const nodes = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + 0.3, r = i % 3 === 0 ? 230 : 150 + (i % 4) * 22;
    return { x: 330 + Math.cos(a) * r, y: 280 + Math.sin(a) * r * 0.82, bad: i === 3 || i === 9 || i === 14 };
  });
  const center = { x: 330, y: 280 };
  const flagT = rise(f, 150, 175);
  return (
    <Panel f={f} label="SIGNAL GRAPH · DEPLOYER MEMORY" live={spec.live}>
      <svg width="100%" viewBox="0 0 660 560" style={{ display: "block" }}>
        {nodes.map((n, i) => {
          const t = rise(f, 20 + i * 6, 34 + i * 6);
          return <line key={`l${i}`} x1={center.x} y1={center.y} x2={center.x + (n.x - center.x) * t} y2={center.y + (n.y - center.y) * t} stroke={n.bad && flagT > 0 ? RED : "rgba(245,247,248,0.18)"} strokeWidth={n.bad && flagT > 0 ? 3 : 1.5} />;
        })}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.bad ? 16 : 11} fill={n.bad && flagT > 0 ? RED : PURPLE} opacity={rise(f, 30 + i * 6, 40 + i * 6)} />
        ))}
        <circle cx={center.x} cy={center.y} r={34 + Math.sin(f / 6) * 3} fill={flagT > 0 ? RED : GREEN} opacity={0.9} />
        <text x={center.x} y={center.y + 8} textAnchor="middle" fontFamily="Martian, monospace" fontSize="20" fill="#07080B">DEV</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontFamily: MONO }}>
        <div><div style={{ fontSize: 54, fontFamily: DISPLAY, fontWeight: 800, color: PAPER }}>{Math.round(spec.deployers * rise(f, 30, 120)).toLocaleString("en-US")}</div><div style={{ fontSize: 20, color: FAINT, letterSpacing: 2 }}>DEPLOYERS MAPPED</div></div>
        <div style={{ textAlign: "right", opacity: flagT }}><div style={{ fontSize: 54, fontFamily: DISPLAY, fontWeight: 800, color: RED }}>⚠ SERIAL</div><div style={{ fontSize: 20, color: FAINT, letterSpacing: 2 }}>FLAGGED ON THE NEXT LAUNCH</div></div>
      </div>
    </Panel>
  );
};

export const BadgeDemo: React.FC<DemoProps<"badge">> = ({ spec, f }) => {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 70, fps, config: { damping: 10 } });
  const tone = toneOf(spec.verdict);
  return (
    <Panel f={f} label="YOUR SITE · README · DOCS">
      <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(245,247,248,0.10)" }}>
        <div style={{ height: 52, background: "rgba(245,247,248,0.06)", display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
          {[RED, AMBER, GREEN].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c, opacity: 0.7 }} />)}
          <span style={{ marginLeft: 16, fontFamily: MONO, fontSize: 20, color: FAINT }}>yourtoken.xyz</span>
        </div>
        <div style={{ padding: "40px 36px", background: "#0b0c12" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, color: PAPER }}>{spec.token}</div>
          {[0.9, 0.7, 0.8].map((w, i) => <div key={i} style={{ height: 18, width: `${w * 100}%`, borderRadius: 9, background: "rgba(245,247,248,0.07)", marginTop: 20 }} />)}
          <div style={{ marginTop: 40, display: "inline-flex", alignItems: "center", gap: 18, padding: "18px 26px", borderRadius: 18, background: "#11131c", border: `2px solid ${tone}`, boxShadow: `0 0 40px ${tone}55`, transform: `scale(${pop})`, transformOrigin: "left center" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, color: FAINT }}>SCANNED BY</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: PAPER }}>GL1TCH</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: tone }}>{spec.verdict} {spec.score}</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 24, color: MUTED, marginTop: 22, opacity: rise(f, 110, 130) }}>Updates itself when the verdict changes · links to the full scan</div>
        </div>
      </div>
    </Panel>
  );
};

export const GameDemo: React.FC<DemoProps<"game">> = ({ spec, f, dur }) => {
  const per = Math.floor(dur / spec.cards.length);
  return (
    <Panel f={f} label="RUG OR NOT? · 8 TOKENS">
      <div style={{ position: "relative", height: 640, perspective: 1400 }}>
        {spec.cards.map((c, i) => {
          const s = i * per, t = f - s;
          if (t < -per || t > per + 20) return null;
          const out = rise(t, per - 26, per);
          const dir = c.answer === "SAFE" ? 1 : -1;
          const tone = c.answer === "SAFE" ? GREEN : RED;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, borderRadius: 30, padding: 40, background: "linear-gradient(160deg, #191c28, #0e1017)", border: "1px solid rgba(245,247,248,0.12)", transform: `translateX(${out * dir * 820}px) rotateZ(${out * dir * 18}deg) rotateY(${(1 - rise(t, 0, 16)) * 60}deg)`, opacity: t < 0 ? 0 : 1 - out * 0.4 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, color: PAPER, marginBottom: 26 }}>${c.name}</div>
              {c.flags.map((fl, k) => <div key={k} style={{ fontFamily: BODY, fontSize: 30, color: MUTED, padding: "12px 0", borderTop: "1px solid rgba(245,247,248,0.06)" }}>{fl}</div>)}
              <div style={{ position: "absolute", top: 40, right: 40, fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, color: tone, border: `4px solid ${tone}`, borderRadius: 16, padding: "4px 18px", transform: `rotate(${dir * 12}deg) scale(${rise(t, per - 50, per - 36)})`, opacity: rise(t, per - 50, per - 40) }}>{c.answer}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export const PhoneDemo: React.FC<DemoProps<"phone">> = ({ spec, f }) => {
  const { fps } = useVideoConfig();
  const sheet = spring({ frame: f - 20, fps, config: { damping: 15 } });
  const result = spring({ frame: f - 110, fps, config: { damping: 14 } });
  const tone = toneOf(spec.verdict);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: 620, height: 1100, borderRadius: 70, padding: 20, background: "#0d0f15", border: "2px solid rgba(245,247,248,0.12)", transform: `perspective(1600px) rotateY(${interpolate(f, [0, 80], [16, 4], C)}deg)`, boxShadow: "0 50px 140px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "relative", height: "100%", borderRadius: 52, overflow: "hidden", background: "linear-gradient(180deg, #13151f, #0a0b10)" }}>
          <div style={{ padding: "90px 34px 0", fontFamily: BODY, fontSize: 30, color: MUTED }}>pump.fun/coin/<span style={{ color: PAPER }}>{spec.token.toLowerCase()}…</span></div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 520, borderRadius: "40px 40px 0 0", background: "#1b1e2b", transform: `translateY(${(1 - sheet) * 560 + result * 560}px)`, padding: 36 }}>
            <div style={{ fontFamily: BODY, fontSize: 28, color: FAINT, marginBottom: 30 }}>Share to…</div>
            <div style={{ display: "flex", gap: 30 }}>
              {["GL1TCH", "Chat", "Notes"].map((n, i) => (
                <div key={n} style={{ textAlign: "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: 30, background: i === 0 ? PURPLE : "rgba(245,247,248,0.08)", display: "grid", placeItems: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: PAPER, boxShadow: i === 0 && f > 70 ? `0 0 0 6px ${GREEN}` : "none" }}>{i === 0 ? "G" : ""}</div>
                  <div style={{ fontFamily: BODY, fontSize: 22, color: MUTED, marginTop: 12 }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", left: 30, right: 30, top: 300, borderRadius: 30, padding: 34, background: "#151826", border: `2px solid ${tone}`, transform: `scale(${result})`, opacity: result }}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: FAINT, letterSpacing: 2 }}>SCANNED ON ARRIVAL</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 54, color: PAPER, margin: "16px 0" }}>${spec.token}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, color: tone }}>{spec.verdict} · {spec.score}/100</div>
            <div style={{ fontFamily: BODY, fontSize: 24, color: MUTED, marginTop: 16 }}>Read-only. No transaction to sign.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Demo: React.FC<{ spec: DemoSpec; f: number; dur: number }> = ({ spec, f, dur }) => {
  switch (spec.kind) {
    case "scan": return <ScanDemo spec={spec} f={f} dur={dur} />;
    case "radar": return <RadarDemo spec={spec} f={f} dur={dur} />;
    case "alert": return <AlertDemo spec={spec} f={f} dur={dur} />;
    case "seal": return <SealDemo spec={spec} f={f} dur={dur} />;
    case "graph": return <GraphDemo spec={spec} f={f} dur={dur} />;
    case "badge": return <BadgeDemo spec={spec} f={f} dur={dur} />;
    case "game": return <GameDemo spec={spec} f={f} dur={dur} />;
    case "phone": return <PhoneDemo spec={spec} f={f} dur={dur} />;
  }
};
