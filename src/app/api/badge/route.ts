import { NextRequest } from "next/server";

/**
 * Embeddable verdict BADGE (SVG). Any project can drop this on their site / README /
 * docs to show their token's GL1TCH verdict, linking back to the full scan — a free
 * distribution flywheel ("✓ Scanned by GL1TCH — CLEAN").
 *
 *   <a href="https://coin-three-mu.vercel.app/scan/<chain>-<addr>">
 *     <img src="https://coin-three-mu.vercel.app/api/badge?t=<chain>-<addr>" alt="GL1TCH scan" />
 *   </a>
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://coin-three-mu.vercel.app";
const TONE: Record<string, string> = {
  CLEAN: "#7CFF4F", "LOW RISK": "#A6FF8C", CAUTION: "#FFD14F", "HIGH RISK": "#FF9D4F", "RUG-SHAPED": "#FF5C5C", UNKNOWN: "#9aa0a6",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function svg(opts: { sym: string; verdict: string; score: string; tone: string; verified: boolean }): string {
  const { sym, verdict, score, tone, verified } = opts;
  const W = 360, H = 84;
  const symText = esc(sym).slice(0, 16);
  const vText = esc(verdict);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GL1TCH scan: ${vText} ${score}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0e0a"/><stop offset="1" stop-color="#050505"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#bg)" stroke="${tone}" stroke-opacity="0.45"/>
  <circle cx="26" cy="26" r="6" fill="#7CFF4F"/>
  <text x="42" y="31" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="17" font-weight="700" fill="#F5F7F8" letter-spacing="1.5">GL1TCH</text>
  <text x="128" y="31" font-family="ui-monospace,monospace" font-size="13" fill="#7CFF4F" letter-spacing="2">SCANNER</text>
  <text x="20" y="62" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="#F5F7F8">${symText}</text>
  ${verified ? `<text x="${20 + symText.length * 13 + 12}" y="61" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="#7CFF4F">VERIFIED</text>` : ""}
  <rect x="${W - 150}" y="22" width="130" height="40" rx="10" fill="${tone}" fill-opacity="0.14" stroke="${tone}" stroke-opacity="0.6"/>
  <text x="${W - 85}" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="800" fill="${tone}">${vText}</text>
  <text x="${W - 85}" y="56" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="#F5F7F8" fill-opacity="0.8">${score}</text>
</svg>`;
}

export async function GET(req: NextRequest) {
  const t = (req.nextUrl.searchParams.get("t") || "").trim();
  const dec = decodeURIComponent(t);
  const i = dec.indexOf("-");
  const chain = i > 0 ? dec.slice(0, i) : "";
  const address = i > 0 ? dec.slice(i + 1) : dec;

  let body = svg({ sym: "Scan a token", verdict: "GL1TCH", score: "scanner", tone: "#7CFF4F", verified: false });
  try {
    if (address) {
      const r = await fetch(`${SITE}/api/scan?mint=${encodeURIComponent(address)}${chain ? `&chain=${chain}` : ""}`, { signal: AbortSignal.timeout(12000) });
      if (r.ok) {
        const d = await r.json();
        if (d?.verdict) {
          body = svg({
            sym: d.symbol ? `$${d.symbol}` : (d.name || "token"),
            verdict: d.verdict,
            score: `${d.score}/100`,
            tone: TONE[d.verdict] || "#9aa0a6",
            verified: !!d.verified,
          });
        }
      }
    }
  } catch { /* serve the generic badge */ }

  return new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // CDN-cache so embeds are fast; refresh a few times an hour.
      "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
