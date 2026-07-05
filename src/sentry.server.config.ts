import * as Sentry from "@sentry/nextjs";

// Server-side Sentry (Node.js runtime). Dormant until SENTRY_DSN is set — Sentry.init with
// no DSN is a no-op, so this ships safely and activates the moment the env var lands.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || "development",
  tracesSampleRate: 0.1,
  // Never capture request bodies / headers that could contain wallet data or tokens.
  sendDefaultPii: false,
});
