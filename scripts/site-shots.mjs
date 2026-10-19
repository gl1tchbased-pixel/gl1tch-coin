// Screenshot sweep for the site (v2 phase checks): every main page at desktop 1440 and mobile 390,
// fold + full page, and a report of horizontal overflow, console errors and WebGL contexts.
//   node scripts/site-shots.mjs [baseUrl] [outDir]
//   node scripts/site-shots.mjs http://localhost:3123 test-results/site-shots
// Waits for "load" (not networkidle: the radar API is long-running) and scrolls through each page
// so lazy 3D scenes and reveals boot before the full-page capture.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const OUT = path.resolve(process.argv[3] || "test-results/site-shots");
mkdirSync(OUT, { recursive: true });

const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const PAGES = [
  ["home", "/"], ["scan", "/scan"], ["scan-token", `/scan/solana-${CA}`], ["network", "/network"],
  ["quantum", "/quantum-core"], ["radar", "/radar"], ["proof", "/proof"], ["token", "/token"],
  ["live", "/live"], ["agents", "/agents"], ["ranks", "/ranks"], ["verify", "/verify"],
  ["security", "/security"], ["thesis", "/thesis"], ["whitepaper", "/whitepaper"],
  ["roadmap", "/roadmap"], ["play", "/play"], ["play-result", "/play/r/6"],
];
const VIEWPORTS = [["d", 1440, 900, false], ["m", 390, 844, true]];
const IGNORE = /insights|Failed to load resource|favicon/;

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const report = [];
for (const [name, route] of PAGES) {
  for (const [vp, w, h, mobile] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(m.text()); });
    let status = 0;
    try {
      const res = await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
      status = res?.status() ?? 0;
    } catch (e) { errors.push(`goto: ${e.message.split("\n")[0]}`); }
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(OUT, `${name}-${vp}-fold.png`) });
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += h * 0.8) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(220); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `${name}-${vp}-full.png`), fullPage: true });
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      height: document.documentElement.scrollHeight,
      // count canvases that already hold a WebGL context (getContext with another type returns null)
      webgl: [...document.querySelectorAll("canvas")].filter((c) => { try { return !c.getContext("2d"); } catch { return true; } }).length,
    }));
    const row = { page: name, vp, status, ...info, errors: errors.slice(0, 4) };
    report.push(row);
    console.log(`${name.padEnd(12)} ${vp} ${status} h=${info.height} overflow=${info.overflow} webgl=${info.webgl}${errors.length ? ` errors=${errors.length}` : ""}`);
    await ctx.close();
  }
}
await browser.close();
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.status >= 400 || r.overflow || r.errors.length || r.webgl > 3);
console.log(bad.length ? `\n${bad.length} issue(s) — see report.json` : "\nall pages clean");
