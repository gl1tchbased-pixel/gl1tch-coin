import { type NextRequest } from "next/server";
import { actionCorsResponse, actionJsonResponse } from "@/lib/actions/cors";
import { runScanReport } from "@/lib/scan-report";
import { OFFICIAL, CONTRACT_ADDRESS } from "@/lib/official";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return actionCorsResponse();
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || CONTRACT_ADDRESS;
  const isCustom = mint !== CONTRACT_ADDRESS;

  let title = "GL1TCH Token Safety Scanner";
  let description =
    "Read a token's mint & freeze authority, LP lock, honeypot tax, insider graph, and deployer history before trading.";
  let label = "Scan Token";

  if (mint) {
    try {
      const rep = await runScanReport(mint, "solana", "auto");
      if (rep.status === 200 && rep.body) {
        const symbol = String(rep.body.symbol || rep.body.name || "Token");
        const verdict = String(rep.body.verdict || "UNKNOWN");
        const score = Number(rep.body.score ?? 0);
        title = `GL1TCH Safety Scan: ${symbol} (${verdict} · ${score}/100)`;
        description = String(
          rep.body.bottomLine ||
            `Authorities: ${verdict}. Verified on-chain via GL1TCH security engine.`
        );
        label = `View Report: ${symbol}`;
      }
    } catch {
      /* fallback to default copy */
    }
  }

  return actionJsonResponse({
    type: "action",
    icon: `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`,
    title,
    description,
    label,
    links: {
      actions: [
        {
          label: "Scan $GL1TCH",
          href: `/api/actions/scan?mint=${CONTRACT_ADDRESS}`,
        },
        {
          label: "Scan $BONK",
          href: `/api/actions/scan?mint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`,
        },
        {
          label: "Scan Custom CA",
          href: `/api/actions/scan?mint={mint}`,
          parameters: [
            {
              name: "mint",
              label: "Paste Solana Token Mint Address",
              required: true,
            },
          ],
        },
      ],
    },
  });
}

export async function POST(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || CONTRACT_ADDRESS;
  const rep = await runScanReport(mint, "solana", "auto");
  const symbol = rep.body ? String(rep.body.symbol || "Token") : "Token";
  const verdict = rep.body ? String(rep.body.verdict || "UNKNOWN") : "UNKNOWN";
  const score = rep.body ? Number(rep.body.score ?? 0) : 0;

  return actionJsonResponse({
    type: "completed",
    title: `Scan Completed: ${symbol}`,
    description: `Verdict: ${verdict} (${score}/100). Full report at ${OFFICIAL.SITE_URL}/scan/solana-${mint}`,
    icon: `${OFFICIAL.SITE_URL}/brand/gl1tch-terminal-og.png`,
  });
}

