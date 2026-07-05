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

if (STAGE === "index") {
  const urls = [
    `${SITE}/`,
    `${SITE}/scan`,
    `${SITE}/learn/how-to-spot-a-rug-pull`,
    `${SITE}/radar`,
  ];
  // Make sure a property context is loaded (URL-inspection box lives on any property page).
  await page.goto(`https://search.google.com/search-console?resource_id=${encodeURIComponent(`${SITE}/`)}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(6000);
  // Dismiss the onboarding tooltip popup ("Anladım"/"Got it") — it can intercept clicks.
  const dismissTip = async () => {
    for (const re of [/^Anladım$/, /^Got it$/, /^Anla[dt]/]) {
      await page.getByRole("button", { name: re }).first().click({ timeout: 2500 }).catch(() => {});
    }
  };
  await dismissTip();

  for (let u = 0; u < urls.length; u++) {
    const url = urls[u];
    console.log(`\n[index] (${u + 1}/${urls.length}) ${url}`);
    // Top URL-inspection search box.
    const box = page.locator('input[aria-label*="denetleyin" i], input[aria-label*="inceleyin" i]').first();
    if (!(await box.count())) { console.log("  inspection box not found"); break; }
    await box.click({ timeout: 8000 }).catch(() => {});
    await page.keyboard.press("Control+A").catch(() => {});
    await page.keyboard.type(url, { delay: 8 }).catch(() => {});
    await page.keyboard.press("Enter").catch(() => {});
    // Inspection runs (retrieving from index) — can take 20–30s for uncached pages.
    await page.waitForTimeout(22000);
    await shot(page, `gsc-idx-${u}-inspect.png`);
    // Click "Request indexing". ASCII-safe match — Turkish uppercase İ breaks JS
    // case-insensitive regex ("İSTE"↛iste). Let Playwright's click handle visibility.
    await dismissTip();
    // Native DOM click — GSC's custom-rendered "DİZİNE EKLENMESİNİ İSTE" resists Playwright's
    // locator/visibility checks. Find the visible leaf element containing the text and click it.
    const clicked = await page.evaluate(() => {
      // Normalize to ASCII (NFKD strips Turkish İ → I) so plain-ASCII matching works,
      // avoiding the U+0130 regex pitfall. Button "DİZİNE EKLENMESİNİ İSTE" → "...EKLENMESINI ISTE".
      const norm = (s) => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
      const rx = /EKLENMES.{0,6}ISTE|Request indexing/i;
      const all = Array.from(document.querySelectorAll("span,div,a,button"));
      const hits = all
        .filter((e) => rx.test(norm(e.textContent)) && e.getClientRects().length > 0)
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);
      const target = hits[0];
      if (target) { target.click(); return norm(target.textContent).slice(0, 40); }
      return null;
    }).catch(() => null);
    console.log("  native click:", clicked || "NO MATCH");
    if (clicked) {
      {
        await page.waitForTimeout(75000); // live test runs ~1–1.5 min
        await shot(page, `gsc-idx-${u}-done.png`);
        const body = (await page.evaluate(() => document.body.innerText).catch(() => "")) || "";
        console.log("  RESULT:", (body.match(/istendi|alınd|istek|requested|zaten|already|hata|error/i) || ["?"])[0]);
        await page.getByRole("button", { name: /Tamam|Anladım|Kapat|Got it|^OK$/i }).first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
    } else {
      console.log("  request-indexing link NOT FOUND on page");
    }
    await page.waitForTimeout(2000);
  }
  console.log("\n[index] done.");
}

console.log(`[gsc] stage=${STAGE} — window stays open 4 min.`);
await page.waitForTimeout(240000);
await context.close().catch(() => {});
