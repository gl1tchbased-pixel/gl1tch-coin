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
import { recordQuote } from "@/lib/revenue";
import { SELF_TEST_HEADER } from "./settle";

/** Per-IP requests per minute on paid routes; guards the upstream sources, not revenue. */
const PAID_RATE_PER_MIN = 120;
const NO_STORE = "private, no-store";

/** The free version of each paid check, offered in the 402 body. */
const FREE_ALTERNATIVE: Record<PaidRouteId, string> = {
  scan: "/api/scan",
  agent: "/api/agent/check",
  deployer: "/api/scan", // a scan's meta.deployerReputation carries the same record
  verdict: "/api/scan", // the card is a condensed scan
  radar: "/api/radar", // the free feed shows the eight riskiest of the same sweep
  random: "/quantum-core/random", // $GL1TCH holders' key-gated Randomness API
  quick: "/api/scan", // the quick check is a condensed scan
  batch: "/api/scan", // one free scan per token
};

type Handler = (req: NextRequest) => Promise<NextResponse>;

let warnedMisconfig = false;

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
    const payTo = readPayTo(process.env);
    if (payTo.rejected.length > 0) {
      // Fail closed: a mistyped wallet must not quietly drop a network (or route money elsewhere).
      if (!warnedMisconfig) {
        warnedMisconfig = true;
        console.error(`[x402] paid API disabled: ${payTo.rejected.join(", ")} is not a valid receiving address (or is the attester)`);
      }
      return NextResponse.json({ error: "paid API misconfigured" }, { status: 503, headers: { "cache-control": NO_STORE } });
    }
    const accepts = buildAccepts(route.price, payTo);

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
            // The key only matches the request; `resource` is what catalogs list. Without it the
            // first caller's query string would be advertised as the endpoint.
            [route.path]: {
              resource: `${OFFICIAL.SITE_URL}${route.path}`,
              accepts,
              description: route.description,
              mimeType: "application/json",
              serviceName: "GL1TCH",
              tags: route.tags,
              // Raster on purpose: the Coinbase Bazaar drops SVG icons (JPG/PNG/WebP/GIF only).
              iconUrl: `${OFFICIAL.SITE_URL}/brand/gl1tch-logo-256.png`,
              extensions: declareDiscoveryExtension(bazaarDiscovery(id)),
              // For clients that don't speak x402: what this costs, and where the free version is.
              unpaidResponseBody: () => ({
                contentType: "application/json",
                body: {
                  error: "payment required",
                  price: route.price,
                  currency: "USDC",
                  networks: accepts.map((a) => a.network),
                  docs: `${OFFICIAL.SITE_URL}/agents/docs#x402`,
                  free: `${OFFICIAL.SITE_URL}${FREE_ALTERNATIVE[id]}`,
                },
              }),
            },
          },
          getX402Server()
        );
        const res = await paid(req);
        // A 402 is a price quote: counted so the ledger shows found-versus-bought (our own test client excluded).
        if (res.status === 402 && req.headers.get(SELF_TEST_HEADER) !== "1") recordQuote(id, req.headers.get("user-agent"));
        return res;
    }
  };
}
