/**
 * Wrap a route handler as a paid x402 endpoint. Order per request (see access.ts): not configured
 * → 503; over the rate limit → 429; a $GL1TCH API key → served free at the key's tier rate;
 * otherwise x402 — a 402 challenge, then the handler, then settlement only if it answered < 400.
 * Every handler response is `private, no-store` so no CDN can hand a paid body to an unpaid caller.
 */

import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { accessMode } from "./access";
import { PAID_ROUTES, buildAccepts, readPayTo, type PaidRouteId } from "./config";
import { bazaarDiscovery } from "./discovery";
import { getX402Server } from "./server";
import { checkApiKey } from "@/lib/apikey";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { OFFICIAL } from "@/lib/official";

/** Per-IP requests per minute on paid routes; guards the upstream sources, not revenue. */
const PAID_RATE_PER_MIN = 120;
const NO_STORE = "private, no-store";

type Handler = (req: NextRequest) => Promise<NextResponse>;

function noStore(handler: Handler): Handler {
  return async (req) => {
    const res = await handler(req);
    res.headers.set("cache-control", NO_STORE);
    return res;
  };
}

export function paidRoute(id: PaidRouteId, handler: Handler): (req: NextRequest) => Promise<Response> {
  const route = PAID_ROUTES[id];
  let paid: Handler | null = null;

  return async function GET(req: NextRequest): Promise<Response> {
    const accepts = buildAccepts(route.price, readPayTo(process.env));

    sweepBuckets();
    const key = req.headers.get("x-gl1tch-key") ?? "";
    const keyInfo = accepts.length > 0 && key ? await checkApiKey(key) : null;
    const rl = keyInfo
      ? rateLimit(`x402:k:${key}`, keyInfo.ratePerMin, 60_000)
      : rateLimit(`x402:${clientIp(req)}`, PAID_RATE_PER_MIN, 60_000);

    switch (accessMode({ configured: accepts.length > 0, limited: !rl.ok, holder: !!keyInfo })) {
      case "unconfigured":
        return NextResponse.json({ error: "paid API not configured" }, { status: 503, headers: { "cache-control": NO_STORE } });
      case "limited":
        return NextResponse.json(
          { error: `rate limited — ${keyInfo ? keyInfo.ratePerMin : PAID_RATE_PER_MIN}/min` },
          { status: 429, headers: { "retry-after": String(rl.retryAfter), "cache-control": NO_STORE } }
        );
      case "holder": {
        const res = await noStore(handler)(req);
        res.headers.set("x-gl1tch-access", "holder");
        return res;
      }
      case "paid":
        paid ??= withX402(
          noStore(handler),
          {
            // Keyed by path so catalogs list the bare endpoint, not one caller's query string.
            [route.path]: {
              accepts,
              description: route.description,
              mimeType: "application/json",
              serviceName: "GL1TCH",
              tags: ["crypto", "security", "token-risk", "solana", "agents"],
              iconUrl: `${OFFICIAL.SITE_URL}/icon.svg`,
              extensions: declareDiscoveryExtension(bazaarDiscovery(id)),
            },
          },
          getX402Server()
        );
        return paid(req);
    }
  };
}
