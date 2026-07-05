import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry. Dormant until NEXT_PUBLIC_SENTRY_DSN is set (no-op without a DSN).
// Low sample rate + no PII: we never want wallet addresses or signatures leaving the client.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});
