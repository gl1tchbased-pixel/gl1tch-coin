import { buildMcpHandler, withRateLimit } from "@/lib/mcp/server";
import { runScanReport } from "@/lib/scan-report";
import { agentCheck } from "@/lib/agent-trust";
import { deployerReputation } from "@/lib/signal-graph";

/** GL1TCH MCP server (Streamable HTTP): connect any MCP client to https://gl1tchbased.xyz/api/mcp. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = withRateLimit(
  buildMcpHandler({
    // MCP calls may come from people's assistants or from automation; counted as automation to keep the
    // public people-only number conservative.
    scan: (mint, chain) => runScanReport(mint, chain, "auto"),
    agent: agentCheck,
    deployer: deployerReputation,
  }),
  60
);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
