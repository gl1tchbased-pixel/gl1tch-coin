import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook (PREMIUM-PLAN-v3, Phase -1 ops). Loads the right Sentry
 * config per runtime and forwards server errors to Sentry. Fully dormant until SENTRY_DSN
 * is set, so it ships safely and activates the moment the founder adds the DSN in Vercel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in Server Components, route handlers, and middleware.
export const onRequestError = Sentry.captureRequestError;
