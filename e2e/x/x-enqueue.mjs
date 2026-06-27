// Add an item to the local post queue. The worker (x-worker.mjs) picks it up and
// posts it via the logged-in browser. This is the CLI/test front-end; the
// Telegram bridge will call enqueue() the same way once wired.
//
//   node e2e/x/x-enqueue.mjs --text "gm 🤖" [--media glitchy-share-square.mp4] [--reply @handle|url]
import { enqueue, listPending } from './lib/queue.mjs';

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };

const text = get('--text');
const media = get('--media');
const reply = get('--reply');

if (!text) {
  console.error('Kullanım: node e2e/x/x-enqueue.mjs --text "..." [--media dosya] [--reply @handle|url]');
  process.exit(1);
}

const item = reply
  ? { kind: 'reply', text, media, [/^https?:/.test(reply) ? 'tweetUrl' : 'handle']: reply }
  : { kind: 'post', text, media };

const rec = enqueue(item);
console.log(`✓ Kuyruğa eklendi (id=${rec.id}, ${rec.kind}). Bekleyen: ${listPending().length}`);
console.log('  Worker çalışıyorsa otomatik atılacak. Değilse: npm run x:worker');
