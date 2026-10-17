// Read-only: print the current bio / website fields of the logged-in social profiles.
// Usage: node e2e/social/profile-read.mjs x|instagram|youtube
import { launch } from "./lib/launch.mjs";

const which = process.argv[2] || "x";
const { context, page } = await launch(which);
try {
  if (which === "x") {
    await page.goto("https://x.com/gl1tchbased", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const profile = await page.evaluate(() => ({
      bio: document.querySelector('[data-testid="UserDescription"]')?.innerText ?? null,
      url: document.querySelector('[data-testid="UserUrl"]')?.innerText ?? null,
      header: document.querySelector('[data-testid="UserProfileHeader_Items"]')?.innerText ?? null,
    }));
    console.log("profile:", JSON.stringify(profile, null, 1));
    await page.goto("https://x.com/settings/profile", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="url"], textarea[name="description"]', { timeout: 20000 }).catch(() => {});
    const vals = await page.evaluate(() =>
      [...document.querySelectorAll("input, textarea")].map((e) => `${e.name || e.getAttribute("aria-label") || ""}: ${e.value}`)
    );
    console.log("edit url:", page.url());
    console.log(vals.filter((v) => v.trim() !== ":").join("\n") || "(edit form not found)");
    await page.screenshot({ path: "e2e/social/out/x-profile-edit.png" });
  } else if (which === "instagram") {
    await page.goto("https://www.instagram.com/accounts/edit/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("textarea, input[type=text]", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/social/out/ig-profile-edit.png" });
    console.log("url:", page.url());
    const vals = await page.evaluate(() =>
      [...document.querySelectorAll("input, textarea")].filter((e) => e.type !== "hidden").map((e) => `${e.id || e.name || e.getAttribute("aria-label") || e.placeholder || ""}: ${e.value}`)
    );
    console.log(vals.join("\n"));
    console.log((await page.evaluate(() => document.body.innerText)).replace(/\n{2,}/g, "\n").slice(0, 600));
  } else if (which === "youtube") {
    await page.goto("https://studio.youtube.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const m = page.url().match(/channel\/(UC[\w-]+)/);
    console.log("studio url:", page.url());
    if (m) {
      await page.goto(`https://studio.youtube.com/channel/${m[1]}/editing/details`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(10000);
      const vals = await page.evaluate(() =>
        [...document.querySelectorAll("input, textarea, #textbox")].map((e) => `${e.getAttribute("aria-label") || e.id || ""}: ${(e.value ?? e.innerText ?? "").slice(0, 200)}`).filter((v) => v.length > 3)
      );
      console.log(vals.join("\n"));
      await page.screenshot({ path: "e2e/social/out/yt-basic-info.png", fullPage: true });
    }
  }
} finally {
  await context.close();
}
