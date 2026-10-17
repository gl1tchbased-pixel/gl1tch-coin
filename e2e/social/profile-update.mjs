// Point the social profiles' website field at the canonical site.
// Usage: node e2e/social/profile-update.mjs x
import { launch } from "./lib/launch.mjs";

const SITE = "https://gl1tchbased.xyz";
const which = process.argv[2] || "x";
const { context, page } = await launch(which);
try {
  if (which === "x") {
    await page.goto("https://x.com/settings/profile", { waitUntil: "domcontentloaded" });
    const url = page.locator('input[name="url"]');
    await url.waitFor({ timeout: 20000 });
    await url.fill(SITE);
    await page.locator('[data-testid="Profile_Save_Button"]').click();
    await page.waitForTimeout(5000);
    await page.goto("https://x.com/gl1tchbased", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(7000);
    const shown = await page.evaluate(() => document.querySelector('[data-testid="UserUrl"]')?.innerText ?? null);
    console.log("x profile url now:", shown);
  }
} finally {
  await context.close();
}
