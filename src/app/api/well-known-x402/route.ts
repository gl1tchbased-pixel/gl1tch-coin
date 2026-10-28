import { wellKnownX402 } from "@/lib/x402/discovery";
import { OFFICIAL } from "@/lib/official";

/**
 * x402 resource list, served at /.well-known/x402 via a rewrite in next.config.ts (Next.js does not
 * serve dot-directories from public/). Compatibility discovery next to /openapi.json.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(wellKnownX402(OFFICIAL.SITE_URL), {
    headers: { "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" },
  });
}
