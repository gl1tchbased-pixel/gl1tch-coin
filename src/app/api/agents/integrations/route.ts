import { OFFICIAL } from "@/lib/official";
import { PAID_ROUTES } from "@/lib/x402/config";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      ok: true,
      name: "GL1TCH Agent & B2B Monetization Integrations",
      version: "1.1.0",
      site: OFFICIAL.SITE_URL,
      repository: OFFICIAL.GITHUB_URL,
      channels: {
        mcp: {
          endpoint: `${OFFICIAL.SITE_URL}/api/mcp`,
          manifest: `${OFFICIAL.SITE_URL}/server.json`,
          toolsCount: 11,
          tools: [
            "scan_token",
            "deployer_reputation",
            "rug_radar",
            "xray_yield",
            "audit_solidity",
            "analyze_insiders",
            "agent_trust",
            "quantum_random",
            "quantum_beacon",
            "quantum_verify",
            "verify_attestation",
          ],
        },
        x402: {
          openApi: `${OFFICIAL.SITE_URL}/openapi.json`,
          wellKnown: `${OFFICIAL.SITE_URL}/.well-known/x402`,
          ledger: `${OFFICIAL.SITE_URL}/revenue.json`,
          holderFreeAccess: "Pass x-gl1tch-key (gk_... or gl1tch_zkap_...) to call any x402 endpoint at $0.00",
          routes: PAID_ROUTES,
        },
        solanaAgentKit: {
          package: "@gl1tch/agent-toolkit",
          path: "packages/gl1tch-agent-toolkit",
          exports: ["Gl1tchClient", "createSolanaAgentKitTools", "gl1tchElizaPlugin"],
        },
        apifyActor: {
          name: "gl1tch-solana-token-safety-yield-xray",
          path: "apify-actor",
          pricingModel: "Pay-Per-Event ($0.005/event · 80% creator revenue share)",
          supportedActions: ["scan", "batch", "yield", "deployer", "radar"],
        },
        telegramGuardian: {
          bot: "https://t.me/gl1tch_infected_bot?startgroup=guardian",
          command: "/guardian",
          freeQuota: "15 automatic contract scans per group per UTC day",
          holderUnlock: "Unlimited auto-scans for groups where an admin verifies a $GL1TCH holding (/verify + /guardian unlock)",
        },
        quantumGiveaway: {
          botCommand: "/giveaway",
          webConsole: `${OFFICIAL.SITE_URL}/quantum-core/random`,
          x402Endpoint: `${OFFICIAL.SITE_URL}/api/x402/random`,
          freeQuota: "1 verifiable drand draw/day (25/day for verified $GL1TCH holders)",
        },
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*",
      },
    }
  );
}

