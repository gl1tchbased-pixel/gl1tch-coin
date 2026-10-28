import { buildOpenApi } from "@/lib/x402/discovery";
import { OFFICIAL } from "@/lib/official";

/**
 * OpenAPI description of the paid agent API (x402). x402scan's preferred discovery: it reads this,
 * probes each operation for a 402 challenge, and lists the ones that pass. Paid operations only;
 * free routes in here make registration fail.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildOpenApi(OFFICIAL.SITE_URL), {
    headers: { "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" },
  });
}
