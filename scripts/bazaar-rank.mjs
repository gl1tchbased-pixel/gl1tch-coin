#!/usr/bin/env node
/**
 * Where GL1TCH's paid routes rank in the Coinbase x402 Bazaar search, for the queries agents use.
 * Public API, no key. Run it from a machine that can reach api.cdp.coinbase.com (from the Oracle VM:
 * `ssh … 'node --input-type=module -' < scripts/bazaar-rank.mjs`). Prints one line per query:
 * our positions (route@rank) and the top result with its 30-day calls/payers.
 */

const SEARCH = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/search";
const QUERIES = [
  "token safety",
  "rug check",
  "solana token risk",
  "honeypot check",
  "new token launches solana",
  "memecoin feed",
  "verifiable random number",
  "random number",
  "deployer reputation",
  "agent wallet trust",
  "token verdict",
  "defi yield",
  "solana yield",
];

for (const q of QUERIES) {
  const r = await fetch(`${SEARCH}?query=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
  if (!r.ok) {
    console.log(`${q.padEnd(28)} HTTP ${r.status}`);
    continue;
  }
  const { resources = [] } = await r.json();
  const ours = resources
    .map((x, i) => [x.resource, i + 1])
    .filter(([url]) => url.includes("gl1tchbased.xyz"))
    .map(([url, rank]) => `${url.split("/").pop()}@${rank}`);
  const top = resources[0];
  const topText = top ? `${top.resource.replace(/^https?:\/\//, "").slice(0, 48)} [${top.quality?.l30DaysTotalCalls ?? "?"}/${top.quality?.l30DaysUniquePayers ?? "?"}]` : "-";
  console.log(`${q.padEnd(28)} n=${String(resources.length).padEnd(3)} ours=${(ours.join(",") || "-").padEnd(22)} top=${topText}`);
}
