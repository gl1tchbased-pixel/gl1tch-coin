/**
 * GL1TCH Apify Store Actor — Pay-Per-Event Token Safety Scanner, Deployer Graph & DeFi Yield X-Ray.
 * Supports both Apify Cloud runtime (`apify` SDK with PPE charging) and standalone execution/testing.
 */

export const DEFAULT_SITE = "https://gl1tchbased.xyz";

/**
 * Execute a GL1TCH Actor query and return normalized dataset items.
 * @param {object} input
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]
 * @param {typeof fetch} [opts.fetch]
 */
export async function executeActorInput(input = {}, opts = {}) {
  const action = input.action || "scan";
  const baseUrl = (opts.baseUrl || DEFAULT_SITE).replace(/\/$/, "");
  const fetchImpl = opts.fetch || globalThis.fetch;
  const headers = {
    accept: "application/json",
    "user-agent": "GL1TCH-Apify-Actor/1.1",
  };
  if (input.apiKey) headers["x-gl1tch-key"] = String(input.apiKey).trim();

  const getJson = async (pathWithQuery) => {
    const res = await fetchImpl(`${baseUrl}${pathWithQuery}`, { headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`GL1TCH API ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json();
  };

  if (action === "scan") {
    const mint = String(input.mint || "").trim();
    if (!mint) throw new Error("mint is required when action=scan");
    const q = new URLSearchParams({ mint });
    if (input.chain) q.set("chain", String(input.chain));
    const data = await getJson(`/api/v1/scan?${q.toString()}`);
    return [{ action: "scan", ...data }];
  }

  if (action === "batch") {
    const rawMints = Array.isArray(input.mints)
      ? input.mints
      : String(input.mint || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (!rawMints.length) throw new Error("mints array is required when action=batch");
    const items = [];
    for (const m of rawMints.slice(0, 10)) {
      const q = new URLSearchParams({ mint: String(m).trim() });
      if (input.chain) q.set("chain", String(input.chain));
      const data = await getJson(`/api/v1/scan?${q.toString()}`);
      items.push({ action: "batch", ...data });
    }
    return items;
  }

  if (action === "yield") {
    const q = new URLSearchParams();
    if (input.chain) q.set("chain", String(input.chain));
    if (input.yieldKind) q.set("kind", String(input.yieldKind));
    if (input.stableOnly) q.set("stable", "true");
    const qs = q.toString();
    const data = await getJson(`/api/yield${qs ? `?${qs}` : ""}`);
    const pools = Array.isArray(data.opportunities)
      ? data.opportunities
      : Array.isArray(data.pools)
        ? data.pools
        : [];
    return pools.map((p) => ({ action: "yield", ...p }));
  }

  if (action === "deployer") {
    const address = String(input.mint || "").trim();
    if (!address) throw new Error("mint (deployer wallet address) is required when action=deployer");
    const q = new URLSearchParams({ address, chain: String(input.chain || "solana") });
    const data = await getJson(`/api/v1/deployer?${q.toString()}`);
    return [{ action: "deployer", ...data }];
  }

  if (action === "radar") {
    const data = await getJson("/api/radar");
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    return tokens.map((t) => ({ action: "radar", ...t }));
  }

  throw new Error(`Unsupported action: ${action}`);
}

async function runCli() {
  let Actor = null;
  try {
    const mod = await import("apify");
    Actor = mod.Actor;
  } catch {
    /* Standalone mode without apify package installed */
  }

  if (Actor) {
    await Actor.init();
    const input = (await Actor.getInput()) || {
      action: "scan",
      mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      chain: "solana",
    };
    const items = await executeActorInput(input);
    await Actor.pushData(items);
    if (typeof Actor.charge === "function") {
      await Actor.charge({ eventName: "gl1tch-query", count: Math.max(1, items.length) }).catch(() => {});
    }
    await Actor.exit();
  } else {
    const sampleInput = process.env.APIFY_INPUT
      ? JSON.parse(process.env.APIFY_INPUT)
      : { action: "scan", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" };
    const items = await executeActorInput(sampleInput);
    console.log(JSON.stringify(items, null, 2));
  }
}

import path from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((err) => {
    console.error("[gl1tch-apify-actor]", err);
    process.exit(1);
  });
}
