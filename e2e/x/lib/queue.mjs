// Simple file-backed post queue shared by the enqueuer and the worker.
// Lives under out/ (gitignored). Holds CONTENT, not secrets.
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR } from './paths.mjs';

const QUEUE_PATH = path.join(OUT_DIR, 'post-queue.json');

function read() {
  try {
    const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(items) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(items, null, 2));
}

// Counter-based id (no Date.now/Math.random — keep it deterministic-ish).
function nextId(items) {
  const max = items.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0);
  return String(max + 1);
}

export function enqueue(item) {
  const items = read();
  const rec = {
    id: nextId(items),
    kind: item.kind || 'post',
    text: item.text,
    media: item.media || null,
    handle: item.handle || null,
    tweetUrl: item.tweetUrl || null,
    status: 'pending',
    enqueuedAt: item.enqueuedAt || null, // caller may stamp
    error: null,
  };
  items.push(rec);
  write(items);
  return rec;
}

export function listPending() {
  return read().filter((it) => it.status === 'pending');
}

export function takeNextPending() {
  const items = read();
  const idx = items.findIndex((it) => it.status === 'pending');
  if (idx < 0) return null;
  items[idx].status = 'posting';
  write(items);
  return items[idx];
}

export function mark(id, status, patch = {}) {
  const items = read();
  const it = items.find((x) => x.id === id);
  if (it) {
    it.status = status;
    Object.assign(it, patch);
    write(items);
  }
  return it;
}

export { QUEUE_PATH };
