import { OFFICIAL } from "@/lib/official";
import { PAID_ROUTES } from "@/lib/x402/config";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      ok: true,
      name: "GL1TCH Agent & B2B Monetization Integrations",
      version: "1.2.0",
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
          version: "1.2.0",
          path: "packages/gl1tch-agent-toolkit",
          exports: [
            "Gl1tchClient",
            "createSolanaAgentKitTools",
            "gl1tchElizaPlugin",
            "gl1tchPreTradeGuard",
            "gl1tchSafetyProvider",
            "gl1tchPreTradeEvaluator",
            "drawProvablyFairWinners",
            "rollProvablyFairDice",
            "shuffleProvablyFair",
            "createRadarStreamListener",
            "verifyAgentTrust",
          ],
        },
        apifyActor: {
          name: "gl1tch-token-safety-scanner",
          version: "1.2.0",
          store: "https://apify.com/gl1tch-pixel/gl1tch-token-safety-scanner",
          path: "apify-actor",
          pricingModel: "Pay-Per-Event ($0.005 per result · 80% creator revenue share)",
          supportedActions: ["scan", "batch", "radar", "yield"],
        },
        telegramGuardian: {
          bot: "https://t.me/gl1tch_infected_bot?startgroup=guardian",
          command: "/guardian",
          freeQuota: "100 automatic contract scans per group per UTC day, no token needed",
        },
        quantumGiveaway: {
          botCommand: "/giveaway",
          webConsole: `${OFFICIAL.SITE_URL}/quantum-core/random`,
          x402Endpoint: `${OFFICIAL.SITE_URL}/api/x402/random`,
          freeQuota: "1 verifiable drand draw/day (25/day for verified $GL1TCH holders)",
        },
        rugRadarStream: {
          endpoint: `${OFFICIAL.SITE_URL}/api/radar/stream`,
          protocol: "Server-Sent Events (SSE)",
          vipAccess: "Header x-gl1tch-key or ?key= for 120 req/min continuous stream",
          paidDeltaRoute: `${OFFICIAL.SITE_URL}/api/x402/radar?since=<cursor>`,
        },
        knowYourAgentErc8004: {
          endpoint: `${OFFICIAL.SITE_URL}/api/agent/erc8004`,
          badgeEndpoint: `${OFFICIAL.SITE_URL}/api/agent/badge`,
          paidCheckRoute: `${OFFICIAL.SITE_URL}/api/x402/agent`,
          protocol: "ERC-8004 Trustless Agents Specification",
        },
        solanaActionsAndBlinks: {
          actionsJson: `${OFFICIAL.SITE_URL}/actions.json`,
          specVersion: "2.4",
          endpoints: [
            `${OFFICIAL.SITE_URL}/api/actions/scan`,
            `${OFFICIAL.SITE_URL}/api/actions/safe-swap`,
          ],
          blinkSafeSwap: `https://dial.to/?action=solana-action:${OFFICIAL.SITE_URL}/api/actions/safe-swap`,
          platformFeeBps: "50 when the swap screen shows it, otherwise 0",
        },
        telegramSentinel: {
          bot: "https://t.me/gl1tch_infected_bot",
          command: "/sentinel",
          feedCommand: "/sentinel feed",
          feedFilter: "Score ≥ 90, CLEAN/LOW RISK, known LP lock. Not a recommendation",
          pricing: "Free for everyone",
        },
        defiYieldSpikes: {
          endpoint: `${OFFICIAL.SITE_URL}/api/yield/spikes`,
          model: "Free 7-chain APY and risk feed",
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
