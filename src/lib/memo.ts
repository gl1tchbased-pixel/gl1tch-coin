/**
 * Small in-process cache for API routes. On Vercel the CDN honoured our `s-maxage` headers; the
 * Oracle server has no CDN in front, so without this every poll and every repeat scan recomputes.
 * Concurrent callers for the same key share one in-flight promise. Failures are never cached.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 2000;

/**
 * Returns the cached value for `key` while it is fresh, otherwise runs `load`.
 * `ttlMs` may be a function of the result so weak results can expire sooner (0 = don't cache).
 */
export async function memo<T>(key: string, ttlMs: number | ((value: T) => number), load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const p = load()
    .then((value) => {
      const ttl = typeof ttlMs === "function" ? ttlMs(value) : ttlMs;
      if (ttl > 0) {
        if (store.size >= MAX_ENTRIES) prune(Date.now());
        store.set(key, { value, expires: Date.now() + ttl });
      }
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function prune(now: number) {
  for (const [k, e] of store) if (e.expires <= now) store.delete(k);
  // Still full of live entries: drop the oldest inserted ones (Map keeps insertion order).
  for (const k of store.keys()) {
    if (store.size < MAX_ENTRIES * 0.9) break;
    store.delete(k);
  }
}

/** Test helper. */
export function clearMemo() {
  store.clear();
  inflight.clear();
}
