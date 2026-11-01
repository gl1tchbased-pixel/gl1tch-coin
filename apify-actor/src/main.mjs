/**
 * GL1TCH Apify Store Actor: token safety scanner, Rug Radar and Yield X-Ray, charged per result.
 * Runs on Apify (`apify` SDK) or standalone for testing. The results come from GL1TCH's free public API.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_SITE = "https://gl1tchbased.xyz";
export const CHARGE_EVENT = "gl1tch-query";
const MIN_CONFIDENCE = 60;
const MAX_BATCH = 10;
export const DEFAULT_PREFILL_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

/**
 * Fetch one query's results as dataset items.
 * @param {object} input
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]
 * @param {typeof fetch} [opts.fetch]
 */
export async function executeActorInput(input = {}, opts = {}) {
  const action = input.action || "scan";
  const baseUrl = (opts.baseUrl || DEFAULT_SITE).replace(/\/$/, "");
  const fetchImpl = opts.fetch || globalThis.fetch;
  // The source header keeps these runs out of the site's count of people scanning.
  const headers = { accept: "application/json", "user-agent": "GL1TCH-Apify-Actor/1.2", "x-gl1tch-source": "apify" };

  const getJson = async (pathWithQuery) => {
    const res = await fetchImpl(`${baseUrl}${pathWithQuery}`, { headers, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GL1TCH API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  };

  const scan = async (mint) => {
    const q = new URLSearchParams({ mint });
    if (input.chain) q.set("chain", String(input.chain));
    return { ...(await getJson(`/api/scan?${q}`)) };
  };

  if (action === "scan") {
    const mint = String(input.mint || DEFAULT_PREFILL_MINT).trim();
    return [markScan({ action, ...(await scan(mint)) })];
  }

  if (action === "batch") {
    const mints = (Array.isArray(input.mints) ? input.mints : [])
      .map((m) => String(m).trim())
      .filter(Boolean);
    if (!mints.length) throw new Error("mints is required when action=batch");
    if (mints.length > MAX_BATCH) throw new Error(`At most ${MAX_BATCH} tokens per run, got ${mints.length}`);
    const items = [];
    for (const mint of mints) {
      // One unreadable token shouldn't lose the others.
      try {
        items.push(markScan({ action, ...(await scan(mint)) }));
      } catch (err) {
        items.push({ action, mint, error: String(err.message || err) });
      }
    }
    return items;
  }

  if (action === "radar") {
    const data = await getJson("/api/radar");
    return (Array.isArray(data.caught) ? data.caught : []).map((t) => ({ action, ...t }));
  }

  if (action === "yield") {
    const q = new URLSearchParams();
    if (input.chain) q.set("chain", String(input.chain));
    if (input.yieldKind) q.set("kind", String(input.yieldKind));
    if (input.stableOnly) q.set("stable", "true");
    const qs = q.toString();
    const data = await getJson(`/api/yield${qs ? `?${qs}` : ""}`);
    const pools = Array.isArray(data.opportunities) ? data.opportunities : Array.isArray(data.pools) ? data.pools : [];
    return pools.map((p) => ({ action, ...p }));
  }

  throw new Error(`Unsupported action: ${action}`);
}

/** Same rule as the paid API: a read missing too many sources isn't worth money. */
function markScan(item) {
  return typeof item.confidence === "number" && item.confidence < MIN_CONFIDENCE && item.verified !== true
    ? { ...item, degraded: true }
    : item;
}

/** Only a real result costs money. */
export function isChargeable(item) {
  return !item.error && !item.degraded;
}

/** Save first, then charge, one item at a time, so a stopped run never bills for what it didn't deliver. */
export async function deliver(items, actor) {
  let charged = 0;
  for (const item of items) {
    await actor.pushData(item);
    if (!isChargeable(item)) continue;
    const result = await actor.charge({ eventName: CHARGE_EVENT, count: 1 });
    charged += result?.chargedCount ?? 0;
    if (result?.eventChargeLimitReached) break;
  }
  return charged;
}

async function runCli() {
  let Actor = null;
  try {
    Actor = (await import("apify")).Actor;
  } catch {
    /* Standalone mode without the apify package installed */
  }

  if (!Actor) {
    const input = process.env.APIFY_INPUT ? JSON.parse(process.env.APIFY_INPUT) : { action: "scan", mint: DEFAULT_PREFILL_MINT };
    console.log(JSON.stringify(await executeActorInput(input), null, 2));
    return;
  }

  await Actor.init();
  const input = (await Actor.getInput()) || {};
  const items = await executeActorInput(input);
  const charged = await deliver(items, Actor);
  console.log(`Delivered ${items.length} item(s), charged ${charged}.`);
  await Actor.exit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((err) => {
    console.error("[gl1tch-apify-actor]", err);
    process.exit(1);
  });
}
