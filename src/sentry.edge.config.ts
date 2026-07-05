import * as Sentry from "@sentry/nextjs";

// Edge/middleware runtime Sentry. Dormant until SENTRY_DSN is set (no-op without a DSN).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
