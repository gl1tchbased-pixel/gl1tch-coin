// Capture a REAL scanner result from the live site as social proof.
// Loads a permalink (auto-runs the scan), waits for the verdict, screenshots the
// result card. Output: pump-pack/images/scan-proof-<token>.png
//   NODE_OPTIONS=--use-system-ca node e2e/x/capture-scan.mjs ethereum:0x6982... pepe
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const OUT = path.resolve(REPO, "pump-pack", "images");
fs.mkdirSync(OUT, { recursive: true });

const t = process.argv[2] || "ethereum:0x6982508145454ce325ddbe47a25d4ec3d2311933";
const tag = process.argv[3] || "pepe";
const url = `https://coin-three-mu.vercel.app/scan?t=${encodeURIComponent(t)}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
console.log("[cap] loading", url);
await page.goto(url, { waitUntil: "domcontentloaded" });

// Wait for the result card to render (scan completed) — the footer "Sources:" line
// is the last thing painted, so it signals a fully-loaded card.
const card = page.locator('[class*="result"]').first();
await card.waitFor({ state: "visible", timeout: 70_000 });
await page.getByText(/Sources:/i).first().waitFor({ state: "visible", timeout: 70_000 }).catch(() => {});
await page.waitForTimeout(1500); // let the breakdown bar + meta settle
const file = path.resolve(OUT, `scan-proof-${tag}.png`);
await card.screenshot({ path: file }).catch(async () => {
  await page.screenshot({ path: file, fullPage: false });
});
console.log("[cap] saved", file);
await browser.close();
process.exit(0);
