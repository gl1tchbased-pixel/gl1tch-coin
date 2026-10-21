// Median of the Lighthouse runs per page, as a Markdown table for the Actions job summary.
//   node .github/scripts/lighthouse-summary.mjs <reports-dir>
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2] || "reports";
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
// The LCP element moved from an audit (v12) to the lcp-breakdown insight (v13); find the first node in either.
const findNode = (x) => {
  if (!x || typeof x !== "object") return null;
  if (x.type === "node" && (x.selector || x.snippet)) return x;
  for (const v of Object.values(x)) { const n = findNode(v); if (n) return n; }
  return null;
};
const lcpElement = (a) => {
  const n = findNode(a["lcp-breakdown-insight"]?.details) || findNode(a["largest-contentful-paint-element"]?.details);
  return n ? (n.nodeLabel || n.selector || n.snippet).replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 60) : "?";
};
const pages = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".report.json"))) {
  const page = f.replace(/-\d+\.report\.json$/, "");
  let j;
  try { j = JSON.parse(readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
  const a = j.audits || {};
  if (!a["largest-contentful-paint"]?.numericValue) continue;
  const row = pages.get(page) || { score: [], lcp: [], fcp: [], tbt: [], cls: [], si: [], el: new Set() };
  row.el.add(lcpElement(a));
  row.score.push(Math.round((j.categories?.performance?.score ?? 0) * 100));
  row.lcp.push(a["largest-contentful-paint"].numericValue / 1000);
  row.fcp.push(a["first-contentful-paint"].numericValue / 1000);
  row.tbt.push(a["total-blocking-time"].numericValue);
  row.cls.push(a["cumulative-layout-shift"].numericValue);
  row.si.push(a["speed-index"].numericValue / 1000);
  pages.set(page, row);
}

const out = [
  "## Lighthouse — mobile, production (median)",
  "",
  "| Page | Runs | Score | LCP | FCP | TBT | CLS | Speed Index | LCP element |",
  "|---|---|---|---|---|---|---|---|---|",
];
for (const [page, r] of pages) {
  const lcp = median(r.lcp);
  out.push(`| \`/${page === "home" ? "" : page}\` | ${r.score.length} | ${median(r.score)} | ${lcp.toFixed(1)} s${lcp <= 2.5 ? " ✅" : ""} | ${median(r.fcp).toFixed(1)} s | ${Math.round(median(r.tbt))} ms | ${median(r.cls).toFixed(3)} | ${median(r.si).toFixed(1)} s | ${[...r.el].join("; ")} |`);
}
out.push("", "Targets (spec §3): LCP ≤ 2.5 s, CLS ≤ 0.1. Full HTML reports are in the `lighthouse-reports` artifact.");
console.log(out.join("\n"));
