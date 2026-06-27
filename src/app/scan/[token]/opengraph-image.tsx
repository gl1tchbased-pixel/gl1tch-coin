import { ImageResponse } from "next/og";

/** Branded, shareable verdict card for /scan/<chain>-<address>. Fetches the live scan
 *  and renders a 1200×630 image that unfurls on X / Telegram / Discord — turning every
 *  shared scan into on-brand distribution. */

export const alt = "GL1TCH token safety scan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const RED = "#FF5C5C";
const INK = "#050505";
const PAPER = "#F5F7F8";
const SITE = "https://coin-three-mu.vercel.app";

const TONE: Record<string, string> = {
  CLEAN: GREEN, "LOW RISK": "#A6FF8C", CAUTION: "#FFD14F", "HIGH RISK": "#FF9D4F", "RUG-SHAPED": RED, UNKNOWN: "#9aa0a6",
};
const CHIP_COLOR: Record<string, string> = { pass: GREEN, warn: "#FFD14F", fail: RED, unknown: "#9aa0a6" };

interface SC { key: string; label: string; status: string; value: string }
interface SR {
  symbol?: string | null; name?: string | null; chain: string; verdict: string; score: number;
  verified?: boolean; aiVerdict?: string; bottomLine?: string; checks: SC[];
  meta: { insiderPct?: number | null; lpLockedPct?: number | null };
}

function parse(token: string) {
  const dec = decodeURIComponent(token);
  const i = dec.indexOf("-");
  return i > 0 ? { chain: dec.slice(0, i), address: dec.slice(i + 1) } : { chain: "", address: dec };
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { chain, address } = parse(token);
  let d: SR | null = null;
  try {
    const r = await fetch(`${SITE}/api/scan?mint=${encodeURIComponent(address)}${chain ? `&chain=${chain}` : ""}`, { next: { revalidate: 300 } });
    if (r.ok) { const j = await r.json(); if (j?.verdict) d = j as SR; }
  } catch { /* generic card */ }

  const tone = d ? (TONE[d.verdict] || "#9aa0a6") : GREEN;
  const sym = d ? (d.symbol ? `$${d.symbol}` : (d.name || "Token")) : "Scan any token";
  const chainName = (d?.chain || chain || "").replace(/^\w/, (c) => c.toUpperCase());

  // pick the most decision-relevant checks present, in priority order
  const PRIORITY = ["honeypot", "lp_lock", "mint_authority", "freeze_authority", "mintable", "ownership", "insiders", "liquidity", "concentration"];
  const chips = d
    ? PRIORITY.map((k) => d!.checks.find((c) => c.key === k)).filter(Boolean).slice(0, 4) as SC[]
    : [];
  const ai = (d?.aiVerdict || d?.bottomLine || "").slice(0, 150);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INK, position: "relative", padding: "56px 64px", fontFamily: "monospace" }}>
        {/* scanlines */}
        <div style={{ position: "absolute", inset: 0, display: "flex", opacity: 0.16, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)" }} />
        {/* verdict aura */}
        <div style={{ position: "absolute", right: -120, top: -120, width: 560, height: 560, display: "flex", borderRadius: 9999, background: `radial-gradient(circle, ${tone}33 0%, transparent 66%)` }} />
        {/* HUD corners */}
        {[{ top: 32, left: 32, b: { borderTop: `2px solid ${tone}`, borderLeft: `2px solid ${tone}` } }, { top: 32, right: 32, b: { borderTop: `2px solid ${tone}`, borderRight: `2px solid ${tone}` } }, { bottom: 32, left: 32, b: { borderBottom: `2px solid ${tone}`, borderLeft: `2px solid ${tone}` } }, { bottom: 32, right: 32, b: { borderBottom: `2px solid ${tone}`, borderRight: `2px solid ${tone}` } }].map((c, i) => { const { b, ...pos } = c; return <div key={i} style={{ position: "absolute", ...pos, width: 44, height: 44, display: "flex", opacity: 0.7, ...b }} />; })}

        {/* top row: brand + chain */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 14px ${GREEN}` }} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, color: PAPER }}>GL1TCH</div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: GREEN }}>// SCANNER</div>
          </div>
          {chainName ? <div style={{ display: "flex", fontSize: 22, color: PAPER, opacity: 0.7, border: "1px solid rgba(245,247,248,0.25)", borderRadius: 9999, padding: "6px 18px" }}>{chainName}</div> : <div style={{ display: "flex" }} />}
        </div>

        {/* center: token + verdict */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 30, zIndex: 2, flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 74, fontWeight: 800, color: PAPER, letterSpacing: -2 }}>{sym}</div>
            {d?.verified ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontWeight: 800, color: INK, background: GREEN, borderRadius: 9999, padding: "8px 18px", boxShadow: `0 0 22px ${GREEN}66` }}><div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: INK }} />VERIFIED</div> : <div style={{ display: "flex" }} />}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: 14 }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: 1, color: tone, textShadow: `0 0 40px ${tone}55` }}>{d ? d.verdict : "READ THE CHAIN"}</div>
            {d ? <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: PAPER, opacity: 0.85, paddingBottom: 12 }}>{d.score}/100</div> : <div style={{ display: "flex" }} />}
          </div>

          {/* check chips */}
          {chips.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              {chips.map((c) => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, border: `1px solid ${CHIP_COLOR[c.status] || PAPER}66`, background: "rgba(255,255,255,0.03)", borderRadius: 9999, padding: "8px 16px" }}>
                  <div style={{ display: "flex", width: 13, height: 13, borderRadius: 9999, background: CHIP_COLOR[c.status] || PAPER, boxShadow: `0 0 10px ${CHIP_COLOR[c.status] || PAPER}88` }} />
                  <div style={{ display: "flex", color: "rgba(245,247,248,0.88)" }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI read snippet */}
          {ai ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 28, maxWidth: 1060 }}>
              <div style={{ display: "flex", width: 14, height: 14, marginTop: 8, borderRadius: 9999, background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
              <div style={{ display: "flex", fontSize: 26, lineHeight: 1.4, color: "rgba(245,247,248,0.92)", fontStyle: "italic" }}>{ai}{ai.length >= 150 ? "…" : ""}</div>
            </div>
          ) : <div style={{ display: "flex" }} />}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(245,247,248,0.6)" }}>scanned by GL1TCH · non-custodial · any chain</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: GREEN }}>coin-three-mu.vercel.app/scan</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
