/**
 * Automated Health & Specification Linter for all 9 x402 endpoints.
 * Eliminates the risk of "quiet failures", header slips, and unauthorized paid inspection scams.
 * Runs on-demand or via /api/x402/health with zero external subscription costs.
 */

import { NextRequest } from "next/server";
import { PAID_ROUTES, readPayTo, SOLANA_MAINNET, BASE_MAINNET, type PaidRouteId } from "./config";
import { OFFICIAL, DEPLOYER_WALLET, PAY_TO_SOLANA, PAY_TO_BASE } from "@/lib/official";
import { SELF_TEST_HEADER } from "./settle";

// Static imports of all 9 route handlers to prevent dynamic import warnings in Vite/Next
import { GET as scanGet } from "@/app/api/x402/scan/route";
import { GET as agentGet } from "@/app/api/x402/agent/route";
import { GET as deployerGet } from "@/app/api/x402/deployer/route";
import { GET as verdictGet } from "@/app/api/x402/verdict/route";
import { GET as radarGet } from "@/app/api/x402/radar/route";
import { GET as randomGet } from "@/app/api/x402/random/route";
import { GET as quickGet } from "@/app/api/x402/quick/route";
import { GET as batchGet } from "@/app/api/x402/batch/route";
import { GET as yieldGet } from "@/app/api/x402/yield/route";

const ROUTE_HANDLERS: Record<PaidRouteId, (req: NextRequest) => Promise<Response>> = {
  scan: scanGet,
  agent: agentGet,
  deployer: deployerGet,
  verdict: verdictGet,
  radar: radarGet,
  random: randomGet,
  quick: quickGet,
  batch: batchGet,
  yield: yieldGet,
};

const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export interface RouteHealthCheck {
  id: PaidRouteId;
  path: string;
  status: "healthy" | "degraded" | "down";
  httpStatus: number;
  latencyMs: number;
  x402Version: number;
  networks: string[];
  price: string;
  priceMicro: number;
  slips: string[];
}

export interface X402HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  checkedAt: number;
  specCompliancePct: number;
  routesTotal: number;
  routesHealthy: number;
  totalSlips: number;
  uptimeWindow: string;
  officialTreasuries: {
    solana: string;
    base: string;
  };
  securityAdvisory: {
    warning: string;
    flaggedScamAddress: string;
    policy: string;
  };
  routes: RouteHealthCheck[];
}

/** Decoded payload of the Payment-Required header */
interface DecodedPaymentRequired {
  x402Version?: number;
  error?: string;
  resource?: { url?: string; description?: string; mimeType?: string; iconUrl?: string };
  accepts?: Array<{
    scheme?: string;
    network?: string;
    amount?: string;
    asset?: string;
    payTo?: string;
    maxTimeoutSeconds?: number;
    extra?: Record<string, unknown>;
  }>;
  extensions?: {
    bazaar?: {
      info?: { input?: Record<string, unknown>; output?: Record<string, unknown> };
      schema?: Record<string, unknown>;
    };
  };
}

/**
 * Runs a rigorous, non-custodial health & spec lint across all 9 x402 endpoints.
 * Flags any header slip, schema omission, or network drift.
 */
export async function checkX402Health(): Promise<X402HealthReport> {
  const startAll = Date.now();
  const routeIds = Object.keys(PAID_ROUTES) as PaidRouteId[];
  const payTo = readPayTo(process.env);
  const results: RouteHealthCheck[] = [];

  for (const id of routeIds) {
    const config = PAID_ROUTES[id];
    const slips: string[] = [];
    const t0 = Date.now();

    try {
      const handler = ROUTE_HANDLERS[id];
      if (!handler) {
        slips.push(`No route handler registered for '${id}'`);
        results.push({
          id,
          path: config.path,
          status: "down",
          httpStatus: 500,
          latencyMs: Date.now() - t0,
          x402Version: 0,
          networks: [],
          price: config.price,
          priceMicro: config.priceMicro,
          slips,
        });
        continue;
      }

      // Mark as self-test so revenue counter does not record this internal check as an external quote
      const req = new NextRequest(`https://gl1tchbased.xyz${config.path}`, {
        headers: {
          [SELF_TEST_HEADER]: "1",
          "user-agent": "GL1TCH-Internal-HealthCheck/1.0",
        },
      });

      const res = await handler(req);
      const latencyMs = Date.now() - t0;

      // 1. Status Code Check
      if (res.status !== 402) {
        slips.push(`Expected HTTP 402 Payment Required, received ${res.status}`);
      }

      // 2. Cache-Control Check
      const cc = res.headers.get("cache-control") || "";
      if (!cc.includes("no-store")) {
        slips.push(`Missing 'no-store' in Cache-Control (got '${cc}')`);
      }

      // 3. Payment-Required Header Check
      const payHeader = res.headers.get("payment-required");
      let decoded: DecodedPaymentRequired = {};
      if (!payHeader) {
        slips.push("Missing 'Payment-Required' header in 402 response");
      } else {
        try {
          const raw = Buffer.from(payHeader, "base64").toString("utf-8");
          decoded = JSON.parse(raw);
        } catch (e) {
          slips.push(`Invalid Base64 or non-JSON Payment-Required header: ${(e as Error).message}`);
        }
      }

      // 4. x402 Version Check
      if (decoded.x402Version !== 2) {
        slips.push(`Expected x402Version=2, got ${decoded.x402Version}`);
      }

      // 5. Accepts Array Check
      const accepts = decoded.accepts || [];
      if (accepts.length === 0) {
        slips.push("Empty 'accepts' requirements in challenge");
      } else {
        // Solana check
        const sol = accepts.find((a) => a.network === SOLANA_MAINNET);
        if (!sol) {
          slips.push(`Missing Solana mainnet accept requirement (${SOLANA_MAINNET})`);
        } else {
          if (sol.scheme !== "exact") slips.push(`Solana scheme must be 'exact', got '${sol.scheme}'`);
          if (sol.amount !== String(config.priceMicro)) {
            slips.push(`Solana amount mismatch: expected '${config.priceMicro}', got '${sol.amount}'`);
          }
          if (sol.asset !== USDC_SOLANA) slips.push(`Solana asset must be USDC mint '${USDC_SOLANA}'`);
          if (!sol.extra?.feePayer) slips.push("Missing pinned feePayer in Solana requirement extra");
        }

        // Base check
        const base = accepts.find((a) => a.network === BASE_MAINNET);
        if (!base) {
          slips.push(`Missing Base mainnet accept requirement (${BASE_MAINNET})`);
        } else {
          if (base.scheme !== "exact") slips.push(`Base scheme must be 'exact', got '${base.scheme}'`);
          if (base.amount !== String(config.priceMicro)) {
            slips.push(`Base amount mismatch: expected '${config.priceMicro}', got '${base.amount}'`);
          }
          if (base.asset?.toLowerCase() !== USDC_BASE.toLowerCase()) {
            slips.push(`Base asset must be USDC address '${USDC_BASE}'`);
          }
        }
      }

      // 6. Resource URL Check
      if (decoded.resource?.url !== `https://gl1tchbased.xyz${config.path}`) {
        slips.push(`Resource URL mismatch: expected 'https://gl1tchbased.xyz${config.path}', got '${decoded.resource?.url}'`);
      }

      // 7. Bazaar Extension Check
      if (!decoded.extensions?.bazaar?.schema) {
        slips.push("Missing Bazaar extension JSON schema in challenge");
      }

      const status = slips.length === 0 ? "healthy" : res.status === 402 ? "degraded" : "down";
      results.push({
        id,
        path: config.path,
        status,
        httpStatus: res.status,
        latencyMs,
        x402Version: decoded.x402Version ?? 0,
        networks: (decoded.accepts || []).map((a) => a.network || "unknown"),
        price: config.price,
        priceMicro: config.priceMicro,
        slips,
      });
    } catch (err) {
      slips.push(`Unhandled execution error: ${(err as Error).message}`);
      results.push({
        id,
        path: config.path,
        status: "down",
        httpStatus: 500,
        latencyMs: Date.now() - t0,
        x402Version: 0,
        networks: [],
        price: config.price,
        priceMicro: config.priceMicro,
        slips,
      });
    }
  }

  const healthyCount = results.filter((r) => r.status === "healthy").length;
  const totalSlips = results.reduce((acc, r) => acc + r.slips.length, 0);
  const specCompliancePct = Math.round((healthyCount / routeIds.length) * 100);

  return {
    status: totalSlips === 0 ? "healthy" : healthyCount > 0 ? "degraded" : "unhealthy",
    checkedAt: Date.now(),
    specCompliancePct,
    routesTotal: routeIds.length,
    routesHealthy: healthyCount,
    totalSlips,
    uptimeWindow: "Continuous Real-Time Self-Lint",
    officialTreasuries: {
      solana: payTo.solana || PAY_TO_SOLANA,
      base: payTo.base || PAY_TO_BASE,
    },
    securityAdvisory: {
      warning:
        "GL1TCH runs automated, continuous spec-linting internally. GL1TCH never solicits manual route-watch or audit fees to private addresses.",
      flaggedScamAddress: "0x202B73254C28fA012BD11ff50425D94534b95594",
      policy:
        "Any unsolicited message offering to run external linting/health reports for 3 USDC on Base is an unverified third-party pitch/scam. Only interact with official GL1TCH contracts and verified endpoints.",
    },
    routes: results,
  };
}
