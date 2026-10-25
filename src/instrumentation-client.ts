// Page translators (Chrome's "Translate this page", some extensions) wrap text in their own elements. When React
// later removes or reorders those nodes it throws NotFoundError (removeChild / insertBefore) and the page can break
// (Sentry JAVASCRIPT-NEXTJS-4). Skip the call when the node has already been moved instead of throwing
// (facebook/react#11538). Runs before hydration.
if (typeof Node === "function") {
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref) as T;
  };
}

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
