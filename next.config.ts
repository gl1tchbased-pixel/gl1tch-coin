import type { NextConfig } from "next";

// Content-Security-Policy — the primary XSS/clickjacking mitigation (Phase -1, PREMIUM-PLAN-v3).
// Tuned for a web3 app: wallet adapters need script eval; market data + token logos come from
// many https CDNs; the live chart is an iframe from GeckoTerminal/DexScreener. 'unsafe-inline'/
// 'unsafe-eval' on script is a pragmatic compromise for Next + wallet libs — a nonce-based
// policy is the premium follow-up (tracked in docs/threat-model.md).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://www.geckoterminal.com https://dexscreener.com",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // next build type-checks the whole tsconfig program with the tsc CLI (Next 16.4+). Tests import
  // bot/, which .vercelignore keeps out of the deploy, so builds use a config without tests;
  // CI still type-checks the tests with the full tsconfig.json.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  // Ship CSS inside the HTML: as a separate file the stylesheet competed with ~450 KB of scripts and
  // arrived ~2 s late on a phone connection, holding the first paint. Most visitors are first-time.
  experimental: { inlineCss: true },
  // Share cards pick their image (Risk Orb still, Glitchy pose) at runtime, which the tracer can't follow.
  outputFileTracingIncludes: { "/scan/**": ["./assets/orb/*.png"], "/play/**": ["./assets/play/*.png"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The old pre-launch founder dashboard is retired; the public network page replaces it.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/network", permanent: true },
      { source: "/dashboard/:path*", destination: "/network", permanent: true },
    ];
  },
  // Serve well-known files (public/ dot-dirs aren't served): RFC 9116 security.txt, and the x402
  // resource list for paid-API discovery.
  async rewrites() {
    return [
      { source: "/.well-known/security.txt", destination: "/api/security-txt" },
      { source: "/.well-known/x402", destination: "/api/well-known-x402" },
    ];
  },
};

export default nextConfig;
