import type { NextRequest } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { sweepOnce, lastSweep, type RadarSweep } from "@/lib/radar";
import { checkApiKey } from "@/lib/apikey";

/**
 * RUG RADAR LIVE STREAM (Server-Sent Events / SSE).
 *
 * Streams live radar snapshots and heartbeat pulses to clients that toggle "Live Feed"
 * on `/radar`. Reuses the cached instance sweep (`lastSweep` / `sweepOnce`) so opening
 * a stream never amplifies RPC load. VIP keys (`x-gl1tch-key` / `?key=`) receive higher throughput.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const view = (r: RadarSweep) => ({
  scanned: r.scanned,
  flagged: r.flagged,
  caught: r.ranked.slice(0, 8),
  updatedAt: r.updatedAt,
});

export async function GET(req: NextRequest) {
  sweepBuckets();

  const rawKey = (req.headers.get("x-gl1tch-key") ?? req.nextUrl.searchParams.get("key") ?? "").trim();
  const keyInfo = rawKey ? await checkApiKey(rawKey) : null;
  const isVip = Boolean(keyInfo && keyInfo.tier >= 1);
  const limit = isVip ? 120 : 6;
  const bucketKey = isVip ? `radar-stream:key:${rawKey}` : `radar-stream:${clientIp(req)}`;

  if (!rateLimit(bucketKey, limit, 60_000).ok) {
    return new Response("rate limited", { status: 429, headers: { "retry-after": "60" } });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          /* stream already closed */
        }
      };

      try {
        const initial = lastSweep() ?? (await sweepOnce());
        send("radar", view(initial));
      } catch {
        send("ping", { ts: Date.now() });
      }

      intervalId = setInterval(async () => {
        try {
          const cur = lastSweep() ?? (await sweepOnce());
          send("radar", view(cur));
        } catch {
          send("ping", { ts: Date.now() });
        }
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

