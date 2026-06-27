import { createServer, type Server } from "node:http";

export interface VerifyServerOptions {
  /** Allowed browser origin (the website). Used for CORS. */
  origin: string;
  /** Handles a parsed POST /verify body and returns an HTTP status + JSON body. */
  handle: (body: unknown) => Promise<{ status: number; body: Record<string, unknown> }>;
  /** Max requests per IP per minute. */
  rateLimit?: number;
  /** Optional X bridge: lets the local Playwright worker pull queued posts.
   *  When present, exposes GET /xqueue (claim pending) + POST /xqueue/ack,
   *  both guarded by a shared token (header `x-bridge-token` or `?token=`). */
  xBridge?: {
    token: string;
    claim: () => unknown[];
    ack: (body: unknown) => boolean;
  };
}

const RATE_WINDOW_MS = 60_000;

/** Minimal HTTP server (no framework) for the wallet-signature verification endpoint.
 *  Exposes POST /verify and GET /health. CORS-locked to the website origin. */
export function createVerifyServer(opts: VerifyServerOptions): Server {
  const limit = opts.rateLimit ?? 20;
  const hits = new Map<string, number[]>();

  function rateLimited(ip: string): boolean {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > limit;
  }

  return createServer((req, res) => {
    const cors = {
      "Access-Control-Allow-Origin": opts.origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // ---- X bridge endpoints (local Playwright worker ⇄ bot) ----
    const reqPath = (req.url ?? "").split("?")[0];
    if (opts.xBridge && (reqPath === "/xqueue" || reqPath === "/xqueue/ack")) {
      const bridge = opts.xBridge;
      const hdr = req.headers["x-bridge-token"];
      const qToken = new URLSearchParams((req.url ?? "").split("?")[1] ?? "").get("token");
      const token = (Array.isArray(hdr) ? hdr[0] : hdr) ?? qToken ?? "";
      if (!bridge.token || token !== bridge.token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
        return;
      }
      if (req.method === "GET" && reqPath === "/xqueue") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, items: bridge.claim() }));
        return;
      }
      if (req.method === "POST" && reqPath === "/xqueue/ack") {
        let ackRaw = "";
        let ackTooLarge = false;
        req.on("data", (chunk) => {
          ackRaw += chunk;
          if (ackRaw.length > 4096) { ackTooLarge = true; req.destroy(); }
        });
        req.on("end", () => {
          if (ackTooLarge) return;
          try {
            const ok = bridge.ack(JSON.parse(ackRaw));
            res.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok }));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "bad_json" }));
          }
        });
        return;
      }
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
      return;
    }

    if (req.method !== "POST" || req.url !== "/verify") {
      res.writeHead(404, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
      return;
    }

    const ip = req.socket.remoteAddress ?? "unknown";
    if (rateLimited(ip)) {
      res.writeHead(429, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ ok: false, error: "rate_limited" }));
      return;
    }

    let raw = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 4096) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", async () => {
      if (tooLarge) return;
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json", ...cors });
        res.end(JSON.stringify({ ok: false, error: "bad_json" }));
        return;
      }
      try {
        const { status, body: out } = await opts.handle(body);
        res.writeHead(status, { "Content-Type": "application/json", ...cors });
        res.end(JSON.stringify(out));
      } catch {
        res.writeHead(500, { "Content-Type": "application/json", ...cors });
        res.end(JSON.stringify({ ok: false, error: "internal" }));
      }
    });
  });
}

/** Narrow an unknown POST body to a verify request, or null if malformed. */
export function parseVerifyBody(
  body: unknown
): { nonce: string; publicKey: string; signature: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.nonce === "string" &&
    typeof b.publicKey === "string" &&
    typeof b.signature === "string"
  ) {
    return { nonce: b.nonce, publicKey: b.publicKey, signature: b.signature };
  }
  return null;
}
