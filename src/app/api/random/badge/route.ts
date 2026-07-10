import { NextRequest } from "next/server";

/**
 * Embeddable "Provably Fair by GL1TCH" BADGE (SVG). A project running a giveaway/allocation
 * drops this on their site / README / announcement; it renders the LIVE status of the proof
 * and links back to the verifiable proof page — a free distribution flywheel where every fair
 * draw advertises GL1TCH.
 *
 *   <a href="https://coin-three-mu.vercel.app/quantum-core/random/<id>">
 *     <img src="https://coin-three-mu.vercel.app/api/random/badge?id=<id>" alt="Provably fair by GL1TCH" />
 *   </a>
 *
 * With no ?id= it renders a generic "Provably Fair · GL1TCH" badge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://coin-three-mu.vercel.app";
const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const GRAY = "#9aa0a6";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function svg(opts: { tone: string; status: string; detail: string }): string {
  const { tone, status, detail } = opts;
  const W = 360, H = 84;
  const sText = esc(status).slice(0, 14);
  const dText = esc(detail).slice(0, 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Provably fair by GL1TCH: ${sText} ${dText}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0e0a"/><stop offset="1" stop-color="#050505"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#bg)" stroke="${tone}" stroke-opacity="0.45"/>
  <circle cx="26" cy="26" r="6" fill="${GREEN}"/>
  <text x="42" y="31" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="17" font-weight="700" fill="#F5F7F8" letter-spacing="1.5">GL1TCH</text>
  <text x="128" y="31" font-family="ui-monospace,monospace" font-size="13" fill="${GREEN}" letter-spacing="2">RANDOMNESS</text>
  <text x="20" y="62" font-family="Arial,Helvetica,sans-serif" font-size="21" font-weight="800" fill="#F5F7F8">PROVABLY FAIR</text>
  <rect x="${W - 150}" y="22" width="130" height="40" rx="10" fill="${tone}" fill-opacity="0.14" stroke="${tone}" stroke-opacity="0.6"/>
  <text x="${W - 85}" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="800" fill="${tone}">${sText}</text>
  <text x="${W - 85}" y="56" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="#F5F7F8" fill-opacity="0.8">${dText}</text>
</svg>`;
}

interface Rec {
  status?: string;
  mode?: string;
  targetRound?: number;
  winners?: string[];
}

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim();

  // Generic badge when no (valid) id is supplied.
  let body = svg({ tone: GREEN, status: "FAIR RNG", detail: "verify ↗" });

  try {
    if (/^[0-9a-f]{64}$/.test(id)) {
      const r = await fetch(`${SITE}/api/random/${id}`, { signal: AbortSignal.timeout(9000) });
      if (r.ok) {
        const d = (await r.json()) as Rec;
        if (d?.status === "fulfilled") {
          const detail = d.mode === "allocation" && d.winners ? `${d.winners.length} winner${d.winners.length === 1 ? "" : "s"}` : `round ${d.targetRound}`;
          body = svg({ tone: GREEN, status: "VERIFIED", detail });
        } else if (d?.status === "pending") {
          body = svg({ tone: PURPLE, status: "COMMITTED", detail: `round ${d.targetRound}` });
        } else if (d?.status === "void") {
          body = svg({ tone: GRAY, status: "VOID", detail: "—" });
        }
      }
    }
  } catch { /* serve the generic badge */ }

  return new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    },
  });
}
