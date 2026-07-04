// Inspect + publish YouTube SHORTS drafts. Opens Studio Content → Shorts tab, dumps
// each row (title + visibility), and screenshots. With PUBLISH=1 it opens each draft
// and completes the publish flow (Public → Publish).
import { launch, waitForLogin, shot } from "./lib/launch.mjs";

const CHANNEL = process.env.YT_CHANNEL || "UCPQoz5vfqnlrGmok36UZCoA";
const PUBLISH = process.env.PUBLISH === "1";

// Proper title/desc for the two known drafts (matched by the draft's filename title).
const META = [
  { match: /product tour/i, title: "GL1TCH — one free tool that reads every rug 👁 (full tour) #Shorts",
    desc: "Everything GL1TCH does, in 40 seconds. One free, non-custodial tool: scan any token on any chain, Rug Radar hunts fresh rugs live, Watchtower + Wallet Watch alert you when safety drops or a whale/dev sells, and it passes its own scan. Free. It never touches your wallet.\nSite: https://coin-three-mu.vercel.app\nTelegram: https://t.me/gl1tch_infected\n#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts" },
  { match: /wallet watch/i, title: "Get pinged when a whale or dev sells — GL1TCH Wallet Watch 🐋 #Shorts",
    desc: "GL1TCH can watch any Solana wallet — a whale, a token's dev, or your own bag — and ping you the moment it sells or moves a position out. Hold $GL1TCH, watch more wallets. Free, non-custodial.\nSite: https://coin-three-mu.vercel.app\nTelegram: https://t.me/gl1tch_infected\n#crypto #memecoin #solana #whalealert #rugpull #web3 #AI #Shorts" },
];
const metaFor = (t) => META.find((m) => m.match.test(t));

const { context, page } = await launch("youtube");

await page.goto("https://studio.youtube.com/channel/" + CHANNEL + "/videos/upload", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(4000);
await waitForLogin(page, async (p) => (await p.locator("ytcp-app, #avatar-btn").count()) > 0, "YouTube", 8 * 60_000);
await page.waitForTimeout(4000);

// Click the Shorts tab (TR: "Shorts videoları", EN: "Shorts").
await page.getByRole("tab", { name: /Shorts/i }).first().click({ timeout: 12000 }).catch(async () => {
  await page.getByText(/Shorts videolar|^Shorts$/i).first().click({ timeout: 8000 }).catch(() => console.log("[yt] shorts tab missed"));
});
await page.waitForTimeout(5000);
await shot(page, "yt-shorts.png");

function dumpRows() {
  return page.evaluate(() => {
    const out = [];
    for (const r of Array.from(document.querySelectorAll("ytcp-video-row"))) {
      const title = (r.querySelector("#video-title")?.textContent || "").trim().slice(0, 44);
      // visibility cell
      let vis = "";
      for (const c of Array.from(r.querySelectorAll("[id*='visibility'], .tablecell-visibility, ytcp-video-visibility-select"))) {
        const t = (c.textContent || "").trim();
        if (t) { vis = t.slice(0, 24); break; }
      }
      out.push({ title, vis });
    }
    return out;
  }).catch(() => []);
}

let rows = await dumpRows();
console.log("SHORTS(" + rows.length + "):");
rows.forEach((r, i) => console.log(`  [${i}] ${r.vis || "?"} :: ${r.title}`));

if (PUBLISH) {
  // Find draft rows and complete them.
  for (let i = 0; i < rows.length; i++) {
    rows = await dumpRows();
    const r = rows[i];
    if (!r || !/draft|taslak/i.test(r.vis)) continue;
    console.log(`[yt] publishing draft [${i}] ${r.title}…`);
    // Click the row's "Edit draft" / open the draft dialog. The visibility cell of a
    // draft shows an "Edit draft" affordance; clicking the title opens the editor.
    const rowLoc = page.locator("ytcp-video-row").nth(i);
    // The draft row has an explicit "Taslağı düzenle" / "Edit draft" BUTTON — click it
    // (not the "Taslak" visibility label, which only shows a tooltip).
    await rowLoc.getByRole("button", { name: /Taslağı düzenle|Edit draft/i }).first().click({ timeout: 8000 }).catch(async () => {
      await rowLoc.locator("ytcp-button:has-text('Taslağı düzenle'), ytcp-button:has-text('Edit draft')").first().click({ timeout: 6000 }).catch(() => console.log("  open draft missed"));
    });
    // Wait for the upload dialog (title textbox) to appear.
    await page.locator('#title-textarea #textbox').first().waitFor({ state: "visible", timeout: 30000 }).catch(() => console.log("  dialog didn't open"));
    await page.waitForTimeout(2500);
    await shot(page, `yt-draft-${i}.png`);

    // Fill proper title + description (the draft only has the raw filename).
    const meta = metaFor(r.title);
    if (meta) {
      const title = page.locator('#title-textarea #textbox').first();
      if (await title.count()) {
        await title.click().catch(() => {});
        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Delete").catch(() => {});
        await title.type(meta.title.slice(0, 99), { delay: 8 }).catch(() => {});
      }
      const desc = page.locator('#description-textarea #textbox').first();
      if (await desc.count()) { await desc.click().catch(() => {}); await page.keyboard.press("Control+A").catch(() => {}); await page.keyboard.press("Delete").catch(() => {}); await desc.type(meta.desc, { delay: 3 }).catch(() => {}); }
      // Not made for kids.
      await page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, `yt-draft-${i}-filled.png`);
    }

    // Advance to Görünürlük (Visibility): click İleri/Next until the Public option or
    // the Publish button is visible. Text/role selectors — ids differ per Studio build.
    const pubRadio = () => page.getByRole("radio", { name: /Herkese açık|Public/i }).first();
    const publishBtn = () => page.getByRole("button", { name: /^Yayınla$|^Publish$/i }).first();
    for (let k = 0; k < 4; k++) {
      const seen = (await pubRadio().count() && await pubRadio().isVisible().catch(() => false)) ||
                   (await publishBtn().count() && await publishBtn().isVisible().catch(() => false));
      if (seen) break;
      await page.getByRole("button", { name: /^İleri$|^Next$/i }).first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1700);
    }
    await pubRadio().click({ timeout: 8000 }).catch(async () => {
      await page.locator('tp-yt-paper-radio-button[name="PUBLIC"]').first().click({ timeout: 5000 }).catch(() => console.log("  public radio missed"));
    });
    await page.waitForTimeout(1000);
    await shot(page, `yt-vis-${i}.png`);
    await publishBtn().click({ timeout: 10000 }).catch(async () => {
      await page.locator("#done-button").first().click({ timeout: 5000 }).catch(() => console.log("  publish button missed"));
    });
    await page.waitForTimeout(6000);
    await shot(page, `yt-published-${i}.png`);
    // close any success dialog
    await page.locator("#close-button, ytcp-button#close-button").first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  rows = await dumpRows();
  console.log("AFTER:");
  rows.forEach((r, i) => console.log(`  [${i}] ${r.vis || "?"} :: ${r.title}`));
}

console.log("[yt] done — window stays open 5 min.");
await page.waitForTimeout(300000);
await context.close().catch(() => {});
