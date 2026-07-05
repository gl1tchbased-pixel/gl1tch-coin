import { NextRequest } from "next/server";

/**
 * Embeddable AGENT TRUST badge (SVG) — the Guardrail widget (Agent Trust Layer v2).
 * Any agent framework, wallet, or dapp drops this in to show an agent's live KYA trust,
 * linking back to the full assessment. A free distribution + adoption flywheel.
 *
 *   <a href="https://coin-three-mu.vercel.app/agents">
 *     <img src="https://coin-three-mu.vercel.app/api/agent/badge?address=<wallet>&chain=solana" alt="GL1TCH Agent Trust" />
 *   </a>
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://coin-three-mu.vercel.app";
const TONE: Record<string, string> = {
  trusted: "#7CFF4F", neutral: "#9aa0a6", caution: "#FF5C5C", unknown: "#FFD14F",
};
const LABEL: Record<string, string> = {
  trusted: "TRUSTED", neutral: "NEUTRAL", caution: "CAUTION", unknown: "UNKNOWN",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function svg(opts: { addr: string; level: string; score: string; tone: string; verified: boolean }): string {
  const { addr, level, score, tone, verified } = opts;
  const W = 360, H = 84;
  const lvl = LABEL[level] || "UNKNOWN";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GL1TCH Agent Trust: ${lvl} ${score}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e0a"/><stop offset="1" stop-color="#050505"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#bg)" stroke="${tone}" stroke-opacity="0.45"/>
  <circle cx="26" cy="26" r="6" fill="#7CFF4F"/>
  <text x="42" y="31" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="17" font-weight="700" fill="#F5F7F8" letter-spacing="1.5">GL1TCH</text>
  <text x="128" y="31" font-family="ui-monospace,monospace" font-size="13" fill="#7CFF4F" letter-spacing="2">KYA · AGENT TRUST</text>
  <text x="20" y="62" font-family="ui-monospace,monospace" font-size="15" font-weight="700" fill="#F5F7F8">${esc(addr)}</text>
  ${verified ? `<text x="150" y="62" font-family="ui-monospace,monospace" font-size="11" font-weight="700" fill="#7CFF4F">✓ID</text>` : ""}
  <rect x="${W - 150}" y="22" width="130" height="40" rx="10" fill="${tone}" fill-opacity="0.14" stroke="${tone}" stroke-opacity="0.6"/>
  <text x="${W - 85}" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="800" fill="${tone}">${lvl}</text>
  <text x="${W - 85}" y="56" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="#F5F7F8" fill-opacity="0.8">${score}</text>
</svg>`;
}

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get("address") || "").trim();
  const chain = (req.nextUrl.searchParams.get("chain") || "solana").trim();

  let body = svg({ addr: "Check an agent", level: "unknown", score: "KYA", tone: "#7CFF4F", verified: false });
  try {
    if (address) {
      const r = await fetch(`${SITE}/api/agent/check?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}`, { signal: AbortSignal.timeout(9000) });
      if (r.ok) {
        const d = await r.json();
        if (d?.level) {
          const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
          body = svg({ addr: short, level: d.level, score: `${d.score}/100`, tone: TONE[d.level] || "#9aa0a6", verified: !!d.verified });
        }
      }
    }
  } catch { /* serve the generic badge */ }

  return new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
