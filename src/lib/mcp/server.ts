/**
 * GL1TCH as an MCP server (Streamable HTTP at /api/mcp): token rug-risk scans, Know Your Agent checks and deployer
 * reputation as tools any MCP client (Claude, Cursor, agent frameworks) can call. Free, like the scanner itself,
 * with a per-IP limit; agents that need volume or no limit can pay per call through the x402 endpoints.
 * The data sources are injected so the tools can be tested without the network.
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import type { ScanReport } from "@/lib/scan-report";
import type { AgentAssessment } from "@/lib/agent-trust";
import type { DeployerReputation } from "@/lib/signal-graph";
import { isAddress, isChain, parseScanInput } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { OFFICIAL } from "@/lib/official";

export interface McpDeps {
  scan: (mint: string, chain: string | undefined) => Promise<ScanReport>;
  agent: (address: string, chain: string) => Promise<AgentAssessment | null>;
  deployer: (address: string, chain: string) => Promise<DeployerReputation | null>;
}

const SITE = OFFICIAL.SITE_URL;
const NOT_ADVICE = "A risk signal, not a guarantee and not financial advice.";

const reply = (text: string) => ({ content: [{ type: "text" as const, text }] });
const failure = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

const address = z.string().max(64).describe("Wallet or token address: a Solana base58 address or a 0x EVM address");
const chain = z.string().max(16).optional().describe("solana (default), ethereum, base, bsc, arbitrum, polygon, …");

function scanText(b: Record<string, unknown>): string {
  const risks = Array.isArray(b.risks) ? (b.risks as { name?: string }[]).map((r) => r.name).filter(Boolean) : [];
  const lines = [
    `${b.name ?? "Token"} (${b.symbol ?? "?"}) on ${b.chain}: ${b.verdict} — safety score ${b.score}/100${typeof b.confidence === "number" ? ` (confidence ${b.confidence}%)` : ""}.`,
    typeof b.bottomLine === "string" ? b.bottomLine : "",
    risks.length ? `Risks: ${risks.join("; ")}.` : "No named risks.",
    `Full report: ${SITE}/scan?t=${b.chain}:${b.mint}`,
    NOT_ADVICE,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildMcpHandler(deps: McpDeps): (req: Request) => Promise<Response> {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        "scan_token",
        {
          title: "Scan a token for rug risk",
          description:
            "Pre-trade token safety check (Solana and EVM): rug-pull and honeypot verdict, 0-100 safety score, mint/freeze authority, LP lock, buy/sell tax, holder concentration, deployer history and bot-volume flags.",
          inputSchema: z.object({ mint: address, chain }),
        },
        async ({ mint, chain: c }) => {
          const parsed = parseScanInput({ mint, chain: c ?? null, q: null });
          if (!parsed || parsed.kind !== "scan") return failure("Invalid input: pass a Solana mint or an EVM contract address (and a known chain, if any).");
          const r = await deps.scan(parsed.mint, parsed.chain || undefined);
          if (r.status !== 200) return failure(`Scan failed: ${String(r.body.error ?? r.status)}. Try again shortly.`);
          return reply(scanText(r.body));
        }
      );

      server.registerTool(
        "check_agent_wallet",
        {
          title: "Know Your Agent: trust-check a wallet",
          description:
            "Trust score and level for an AI-agent wallet (or any wallet) before you transact with it: signature-verified identity plus its on-chain track record in GL1TCH scans.",
          inputSchema: z.object({ address, chain }),
        },
        async ({ address: a, chain: c }) => {
          const ch = (c ?? "solana").toLowerCase();
          if (!isAddress(a) || !isChain(ch)) return failure("Invalid input: pass a wallet address and a known chain.");
          const r = await deps.agent(a, ch);
          if (!r) return failure("Assessment unavailable right now. Try again shortly.");
          const text = [
            `Agent wallet ${r.address} on ${r.chain}: trust ${r.score}/100, level "${r.level}".`,
            `Registered: ${r.registered ? "yes" : "no"}; signature-verified: ${r.verified ? "yes" : "no"}.`,
            r.reasons.length ? `Why: ${r.reasons.join("; ")}.` : "",
            `Profile: ${SITE}/agents/${r.chain}-${r.address}`,
            NOT_ADVICE,
          ];
          return reply(text.filter(Boolean).join("\n"));
        }
      );

      server.registerTool(
        "deployer_reputation",
        {
          title: "Token deployer reputation",
          description:
            "How many tokens a deployer wallet launched and how many scanned as high risk or rug-shaped (serial rugger check), from the GL1TCH Signal Graph.",
          inputSchema: z.object({ address, chain }),
        },
        async ({ address: a, chain: c }) => {
          const ch = (c ?? "solana").toLowerCase();
          if (!isAddress(a) || !isChain(ch)) return failure("Invalid input: pass a wallet address and a known chain.");
          const r = await deps.deployer(a, ch);
          if (!r) return failure("Reputation unavailable right now. Try again shortly.");
          return reply(
            [`Deployer ${a} on ${ch}: ${r.level}. ${r.note}.`, `Tokens seen: ${r.tokensSeen}; flagged: ${r.flaggedCount}.`, NOT_ADVICE].join("\n")
          );
        }
      );
    },
    { serverInfo: { name: "gl1tch", version: "1.0.0" } }
  );
}

/** Per-IP request budget per minute in front of the MCP handler (the scanner's sources are shared and finite). */
export function withRateLimit(handler: (req: Request) => Promise<Response>, perMinute: number): (req: Request) => Promise<Response> {
  return async (req) => {
    sweepBuckets();
    const rl = rateLimit(`mcp:${clientIp(req)}`, perMinute, 60_000);
    if (!rl.ok) {
      return Response.json(
        { error: `rate limited — ${perMinute} requests/min per IP. Need more? Pay per call: ${SITE}/agents/docs#x402` },
        { status: 429, headers: { "retry-after": String(rl.retryAfter) } }
      );
    }
    return handler(req);
  };
}
