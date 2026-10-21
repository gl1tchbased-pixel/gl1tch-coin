// Browser-side Sentry. Dormant until NEXT_PUBLIC_SENTRY_DSN is set (without a DSN the import below is
// dead code and never ships). Loaded once the page has finished loading and the main thread is idle, so
// the SDK isn't downloaded ahead of the first paint; an error thrown before that point isn't reported.
// Low sample rate + no PII: we never want wallet addresses or signatures leaving the client.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const start = () =>
    import("@sentry/nextjs")
      .then((Sentry) =>
        Sentry.init({
          dsn,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
          sendDefaultPii: false,
        }),
      )
      .catch(() => {});
  const idle = () =>
    "requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1000);
  if (document.readyState === "complete") idle();
  else addEventListener("load", idle, { once: true });
}
