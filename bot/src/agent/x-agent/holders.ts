/** Holder count tracker — calls Solana RPC for the GL1TCH mint, tracks
 *  day-over-day delta, and triggers a "🛠 BUILD UPDATE: +N holders" content
 *  variant when growth is significant.
 *
 *  Uses Helius DAS `getTokenAccounts` if the configured RPC supports it
 *  (Helius does; the bot is already configured with a Helius URL), and falls
 *  back to vanilla `getProgramAccounts` filtered by mint memcmp. */

import fs from "node:fs";
import path from "node:path";
import { OFFICIAL } from "../../content.js";
import { config } from "../../config.js";
import type { Variant } from "./types.js";

const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const STORE_PATH = process.env.HOLDERS_FILE ?? "/tmp/gl1tch-holders.json";

interface HoldersStore {
  /** Most recent reading {timestamp, count}. */
  last?: { at: number; count: number };
  /** Reading from 24h+ ago, used as the baseline for delta. */
  baseline?: { at: number; count: number };
}

let store: HoldersStore = {};

function load(): void {
  try {
    if (fs.existsSync(STORE_PATH)) {
      store = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as HoldersStore;
    }
  } catch {
    store = {};
  }
}
function save(): void {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.warn("[holders] save failed:", (e as Error).message);
  }
}
load();

interface RpcResp<T> {
  result?: T;
  error?: { message?: string };
}

async function rpc<T>(url: string, method: string, params: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as RpcResp<T>;
  if (j.error) throw new Error(j.error.message ?? "rpc error");
  if (j.result === undefined) throw new Error("no result");
  return j.result;
}

/** Helius DAS getTokenAccounts — returns total holder count if RPC supports it. */
async function countViaHelius(rpcUrl: string, mint: string): Promise<number | null> {
  try {
    const result = await rpc<{ total?: number }>(rpcUrl, "getTokenAccounts", {
      mint,
      page: 1,
      limit: 1,
    });
    return typeof result.total === "number" ? result.total : null;
  } catch {
    return null;
  }
}

/** Fallback: count token accounts via getProgramAccounts memcmp on mint at offset 0.
 *  Counts distinct accounts (≈ holders; an owner could have multiple but it's rare). */
async function countViaFallback(rpcUrl: string, mint: string): Promise<number> {
  const result = await rpc<Array<{ pubkey: string }>>(rpcUrl, "getProgramAccounts", [
    TOKEN_2022_PROGRAM,
    {
      encoding: "base64",
      dataSlice: { offset: 0, length: 0 },
      filters: [{ memcmp: { offset: 0, bytes: mint } }],
    },
  ]);
  return result.length;
}

/** Get current GL1TCH holder count via the configured Solana RPC. */
export async function getHolderCount(): Promise<number> {
  const rpcUrl = config.verify.rpcUrl;
  const mint = OFFICIAL.CONTRACT;
  if (!mint) throw new Error("CA missing");
  const helius = await countViaHelius(rpcUrl, mint);
  if (helius !== null) return helius;
  return countViaFallback(rpcUrl, mint);
}

interface HolderDelta {
  current: number;
  previous: number | null;
  delta: number; // = current - previous, 0 if no baseline yet
  baselineAgeHours: number | null;
}

/** Read current count, compare to the 24h baseline, and roll the baseline if stale. */
export async function readDelta(): Promise<HolderDelta> {
  const current = await getHolderCount();
  const now = Date.now();
  const prev = store.baseline?.count ?? null;
  const baselineAge = store.baseline ? (now - store.baseline.at) / 36e5 : null;
  const delta = prev !== null ? current - prev : 0;
  store.last = { at: now, count: current };
  // Roll baseline forward when it's older than 24h, so the next read compares to "yesterday".
  if (!store.baseline || (baselineAge ?? 0) >= 24) {
    store.baseline = { at: now, count: current };
  }
  save();
  return { current, previous: prev, delta, baselineAgeHours: baselineAge };
}

/** Build a content Variant celebrating positive holder growth, or null if no growth. */
export function deltaToVariant(d: HolderDelta): Variant | null {
  if (d.delta <= 0 || d.previous === null) return null;
  // Frame two ways depending on magnitude.
  const text =
    d.delta >= 10
      ? `🛠 GROWTH LOG\n\n+${d.delta} new holders on $GL1TCH in the last ~24h.\nTotal: ${d.current}.\nNo paid acquisition. No fake volume. Just signal.\n\ncoin-three-mu.vercel.app`
      : `🛠 GROWTH LOG\n\n+${d.delta} new holder${d.delta === 1 ? "" : "s"} today on $GL1TCH.\nTotal: ${d.current}.\nQuiet days build cleanest charts.\n\n$GL1TCH`;
  return {
    id: `holders-${d.current}-${Date.now().toString(36)}`,
    voice: "proof",
    category: "build-update",
    text: text.length <= 280 ? text : text.slice(0, 279) + "…",
    imageAsset: "05-rugcheck-1.jpg",
  };
}
