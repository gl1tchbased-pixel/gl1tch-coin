/**
 * RFC 9116 security.txt, served at /.well-known/security.txt via a rewrite in next.config.ts
 * (Next.js does not serve dot-directories from public/). Machine-readable security contact.
 */
export const dynamic = "force-static";

const BODY = `# GL1TCH — security contact (RFC 9116)
# https://coin-three-mu.vercel.app/security

Contact: https://t.me/gl1tch_infected
Contact: https://github.com/gl1tchbased-pixel/gl1tch-coin/security/advisories/new
Expires: 2027-07-05T00:00:00.000Z
Preferred-Languages: en, tr
Canonical: https://coin-three-mu.vercel.app/.well-known/security.txt
Policy: https://github.com/gl1tchbased-pixel/gl1tch-coin/blob/main/SECURITY.md
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
