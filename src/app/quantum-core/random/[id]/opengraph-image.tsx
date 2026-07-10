import { ImageResponse } from "next/og";

/** Branded, shareable proof card for /quantum-core/random/<id>. Fetches the record and
 *  renders a 1200×630 image (winners for a giveaway, or the result) — so every shared
 *  provably-fair proof unfurls on X / Telegram / Discord as on-brand distribution. */

export const alt = "GL1TCH verifiable randomness proof";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";
const PAPER = "#F5F7F8";
const SITE = "https://coin-three-mu.vercel.app";

interface Rec {
  status?: string;
  mode?: string;
  targetRound?: number;
  winners?: string[];
  result?: { kind: string; values: number[] };
  entrants?: string[];
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let d: Rec | null = null;
  try {
    const r = await fetch(`${SITE}/api/random/${id}`, { next: { revalidate: 60 } });
    if (r.ok) { const j = await r.json(); if (j?.status) d = j as Rec; }
  } catch { /* generic card */ }

  const fulfilled = d?.status === "fulfilled";
  const isAlloc = d?.mode === "allocation";
  const winners = (d?.winners ?? []).slice(0, 6);
  const values = (d?.result?.values ?? []).slice(0, 10);

  const headline = !d
    ? "Verifiable randomness"
    : fulfilled
      ? (isAlloc ? `${d!.winners?.length ?? 0} winners — provably fair` : "Provably-fair result")
      : "Committed — reveal pending";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INK, position: "relative", padding: "56px 64px", fontFamily: "monospace" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", opacity: 0.16, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 4px)" }} />
        <div style={{ position: "absolute", right: -120, top: -120, width: 560, height: 560, display: "flex", borderRadius: 9999, background: `radial-gradient(circle, ${GREEN}33 0%, transparent 66%)` }} />

        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 14px ${GREEN}` }} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, color: PAPER }}>GL1TCH</div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: GREEN }}>// RANDOMNESS</div>
          </div>
          {d?.targetRound ? <div style={{ display: "flex", fontSize: 20, color: PAPER, opacity: 0.7, border: "1px solid rgba(245,247,248,0.25)", borderRadius: 9999, padding: "6px 18px" }}>drand round {d.targetRound}</div> : <div style={{ display: "flex" }} />}
        </div>

        {/* center */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, zIndex: 2, flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: PAPER, letterSpacing: -1, textShadow: `0 0 40px ${GREEN}44` }}>{headline}</div>

          {fulfilled && isAlloc && winners.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
              {winners.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
                  <div style={{ display: "flex", width: 30, height: 30, borderRadius: 9999, background: GREEN, color: INK, alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>{i + 1}</div>
                  <div style={{ display: "flex", color: "rgba(245,247,248,0.94)", fontWeight: 700 }}>{w.length > 42 ? w.slice(0, 40) + "…" : w}</div>
                </div>
              ))}
              {(d!.winners?.length ?? 0) > 6 ? <div style={{ display: "flex", fontSize: 22, color: "rgba(245,247,248,0.5)" }}>+{(d!.winners!.length) - 6} more</div> : <div style={{ display: "flex" }} />}
            </div>
          )}

          {fulfilled && !isAlloc && values.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              {values.map((v, i) => (
                <div key={i} style={{ display: "flex", fontSize: 34, fontWeight: 800, color: PAPER, background: "rgba(124,255,79,0.14)", border: `1px solid ${GREEN}66`, borderRadius: 12, padding: "8px 18px" }}>{v}</div>
              ))}
            </div>
          )}

          {!fulfilled && (
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.4, color: "rgba(245,247,248,0.85)", marginTop: 22, maxWidth: 1000 }}>
              Committed to a future drand round that doesn’t exist yet — nobody can bias it. Reveals shortly.
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(245,247,248,0.6)" }}>quantum-seeded · BLS-verified in your browser · non-custodial</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: GREEN }}>verify it yourself ↗</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
