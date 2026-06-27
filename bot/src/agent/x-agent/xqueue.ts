/** X bridge queue — server-side hand-off between the Telegram "🤖 Auto-post"
 *  button and the LOCAL Playwright worker. The button enqueues a variant here;
 *  the worker polls GET /xqueue (claim), posts via a logged-in browser, then
 *  POSTs /xqueue/ack. Persisted to /tmp (resets on Railway redeploy — fine, the
 *  queue is short-lived). Mirrors the perf.ts store pattern. */

import fs from "node:fs";
import path from "node:path";

const STORE_PATH = process.env.XQUEUE_FILE ?? "/tmp/gl1tch-xqueue.json";

export type XQueueStatus = "pending" | "posting" | "done" | "error";

export interface XQueueItem {
  id: string;
  kind: "post" | "reply";
  text: string;
  imageUrl: string | null;
  handle: string | null;
  tweetUrl: string | null;
  status: XQueueStatus;
  enqueuedAt: number;
  postedUrl?: string | null;
  error?: string | null;
}

interface XQueueStore {
  items: XQueueItem[];
}

let store: XQueueStore = { items: [] };
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as XQueueStore;
      store = { items: Array.isArray(parsed.items) ? parsed.items : [] };
    }
  } catch (err) {
    console.warn("[xqueue] load failed:", (err as Error).message);
  }
}

function save(): void {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.warn("[xqueue] save failed:", (err as Error).message);
  }
}

function nextId(): string {
  load();
  const max = store.items.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0);
  return String(max + 1);
}

/** Enqueue a variant for local auto-posting. Returns the created item. */
export function enqueueX(input: {
  kind?: "post" | "reply";
  text: string;
  imageUrl?: string | null;
  handle?: string | null;
  tweetUrl?: string | null;
}): XQueueItem {
  load();
  const item: XQueueItem = {
    id: nextId(),
    kind: input.kind ?? "post",
    text: input.text,
    imageUrl: input.imageUrl ?? null,
    handle: input.handle ?? null,
    tweetUrl: input.tweetUrl ?? null,
    status: "pending",
    enqueuedAt: Date.now(),
    postedUrl: null,
    error: null,
  };
  store.items.push(item);
  // Keep the file from growing forever: drop done/error items older than ~2 days.
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  store.items = store.items.filter(
    (it) => it.status === "pending" || it.status === "posting" || it.enqueuedAt > cutoff,
  );
  save();
  return item;
}

/** Atomically claim all pending items (pending -> posting) and return them.
 *  Claim-on-read prevents the worker from double-posting across poll cycles. */
export function claimPendingX(): XQueueItem[] {
  load();
  const claimed = store.items.filter((it) => it.status === "pending");
  if (claimed.length) {
    for (const it of claimed) it.status = "posting";
    save();
  }
  return claimed;
}

/** Acknowledge a posted/failed item from the worker. */
export function ackX(input: {
  id: string;
  status: "done" | "error";
  postedUrl?: string | null;
  error?: string | null;
}): boolean {
  load();
  const it = store.items.find((x) => x.id === input.id);
  if (!it) return false;
  it.status = input.status;
  it.postedUrl = input.postedUrl ?? null;
  it.error = input.error ?? null;
  save();
  return true;
}

export function pendingCountX(): number {
  load();
  return store.items.filter((it) => it.status === "pending").length;
}
