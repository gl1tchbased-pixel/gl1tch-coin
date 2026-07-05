// Drive Google Search Console (reuses the Google-logged-in "youtube" profile):
// add/verify the coin-three-mu.vercel.app property (HTML-file already live), then
// submit sitemap.xml. Screenshots each step. STAGE env: "inspect" (default) | "run".
import { launch, waitForLogin, shot } from "./lib/launch.mjs";

const SITE = "https://coin-three-mu.vercel.app";
const STAGE = process.env.STAGE || "inspect";
const { context, page } = await launch("youtube");

await page.goto("https://search.google.com/search-console", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(6000);
await waitForLogin(page, async (p) => !/accounts\.google\.com\/(signin|v3\/signin)/i.test(p.url()), "Google", 8 * 60_000);
await page.waitForTimeout(4000);
await shot(page, "gsc-0.png");
console.log("URL:", page.url());

const dump = async () => {
  const c = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button,a,[role=button]")).filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).map(e => (e.innerText || e.getAttribute("aria-label") || "").trim()).filter(Boolean).slice(0, 50)
  ).catch(() => []);
  console.log("CONTROLS: " + [...new Set(c)].join(" | "));
};
await dump();

if (STAGE === "add" || STAGE === "run") {
  // If we're on the welcome screen, add the URL-prefix property.
  if (/welcome/i.test(page.url())) {
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input")).map((e, i) => `#${i} type=${e.type} ph="${e.placeholder}" aria="${e.getAttribute("aria-label") || ""}"`)
    ).catch(() => []);
    console.log("INPUTS:\n" + inputs.join("\n"));
    // The URL-prefix input is identified by aria-label "https://www.example.com". Pick the
    // first VISIBLE one and fill it.
    const httpsInputs = page.locator('input[aria-label="https://www.example.com"]');
    const hc = await httpsInputs.count();
    let filled = false;
    for (let i = 0; i < hc; i++) {
      const el = httpsInputs.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 6000 }).catch(() => {});
        await el.fill(SITE).catch(() => {});
        filled = true;
        break;
      }
    }
    console.log("filled url input:", filled);
    await page.waitForTimeout(600);
    await shot(page, "gsc-1-filled.png");
    // Click the DEVAM/Continue under the URL-prefix column (the 2nd one).
    const devam = page.getByRole("button", { name: /DEVAM|Continue|Devam/i });
    const n = await devam.count();
    await devam.nth(n > 1 ? 1 : 0).click({ timeout: 8000 }).catch(() => console.log("devam missed"));
    await page.waitForTimeout(6000);
    await shot(page, "gsc-2-verify.png");
    await dump();
  }
}

if (STAGE === "sitemap" || STAGE === "run") {
  const resource = encodeURIComponent(`${SITE}/`);
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${resource}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(6000);
  await shot(page, "gsc-3-sitemaps.png");
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map((e, i) => `#${i} type=${e.type} vis=${!!(e.offsetParent) } ph="${e.placeholder}" aria="${e.getAttribute("aria-label") || ""}"`)
  ).catch(() => []);
  console.log("SITEMAP_INPUTS:\n" + inputs.join("\n"));
  // Fill ONLY the add-sitemap input (aria "Site haritası URL'sini girin"), not the top
  // URL-inspection search box.
  const smInput = page.locator('input[aria-label*="Site haritas" i]').first();
  let done = false;
  if (await smInput.count()) {
    await smInput.click({ timeout: 6000 }).catch(() => {});
    await smInput.fill("sitemap.xml").catch(() => {});
    await page.waitForTimeout(700);
    // GÖNDER enables once the field has text.
    await page.getByRole("button", { name: /^GÖNDER$|^Submit$|^Gönder$/i }).first().click({ timeout: 8000 }).catch(() => console.log("submit btn missed"));
    done = true;
  } else {
    console.log("sitemap input not found");
  }
  console.log("sitemap submit attempted:", done);
  await page.waitForTimeout(6000);
  await shot(page, "gsc-4-sitemap-result.png");
  const body = (await page.evaluate(() => document.body.innerText).catch(() => "")) || "";
  console.log("RESULT_HINT:", (body.match(/Başarılı|Success|alındı|gönderildi|hata|error|bekleniyor|pending/i) || ["?"])[0]);
}

console.log(`[gsc] stage=${STAGE} — window stays open 8 min.`);
await page.waitForTimeout(480000);
await context.close().catch(() => {});
