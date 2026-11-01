import path from "node:path";
import fs from "node:fs";
import { openX, shot, REPO, OUT } from "./x-lib.mjs";

const tweets = [
  `Submitted PR #642 to @sendaifun Solana Agent Kit:
Native GL1TCH multi-vector pre-trade token safety scanning for @solana AI agents! 🛡️⚡

Zero API key required on public tier.

Inspect the PR 👇
https://github.com/sendaifun/solana-agent-kit/pull/642`,

  `What this brings to Solana AI agents:

• Pre-trade risk score (0-100) & verdict (CLEAN to RUG-SHAPED)
• Mint & freeze authority audit
• LP lock % & top holder concentration
• Deployer reputation via GL1TCH Signal Graph

Preventing rugs autonomously before trade execution.`,

  `Builders can also test GL1TCH today via:
• Free API: https://gl1tchbased.xyz/api/scan
• Streamable MCP: https://gl1tchbased.xyz/api/mcp
• Agent402 Router: agent402.tools
• Docs: https://gl1tchbased.xyz/agents/docs

Cc @sendaifun @Aryan8103 — PR #642 is ready for review! 🚀
$GL1TCH #Solana`
];

// Validate lengths before launching browser
for (const [i, t] of tweets.entries()) {
  const norm = t.replace(/https?:\/\/\S+/g, "x".repeat(23));
  if (norm.length > 280) throw new Error(`Tweet ${i + 1} exceeds 280 chars (${norm.length})`);
  console.log(`[x-sak-pr] Tweet ${i + 1} validated: ${norm.length}/280 chars`);
}

async function typeInto(page, idx, text) {
  const box = page.locator(`[data-testid="tweetTextarea_${idx}"]`).first();
  await box.click({ timeout: 15000 });
  await page.keyboard.insertText(text);
  await page.waitForTimeout(600);
}

async function main() {
  console.log(`[x-sak-pr] Preparing to post ${tweets.length}-tweet thread to @gl1tchbased...`);
  const { context, page } = await openX();

  try {
    await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);

    // Tweet 1
    console.log("[x-sak-pr] Typing tweet 1...");
    await typeInto(page, 0, tweets[0]);

    // Add subsequent tweets
    for (let i = 1; i < tweets.length; i++) {
      console.log(`[x-sak-pr] Adding tweet ${i + 1}...`);
      const addBtn = page.locator('[data-testid="addButton"]').first();
      await addBtn.click({ timeout: 10000 });
      await page.waitForTimeout(1000);
      await typeInto(page, i, tweets[i]);
    }

    await page.waitForTimeout(1500);
    await shot(page, "x-sak-composed.png");

    console.log("[x-sak-pr] Dismissing any mention autocomplete...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    console.log("[x-sak-pr] Sending post (Ctrl+Enter / Click)...");
    // Try Ctrl+Enter shortcut first
    await page.keyboard.down("Control");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Control");
    await page.waitForTimeout(1000);

    // If still attached, click with force: true
    const isAttached = await page.locator('[data-testid="tweetTextarea_0"]').isVisible().catch(() => false);
    if (isAttached) {
      console.log("[x-sak-pr] Clicking tweet button with force: true...");
      const postBtn = page.locator('[data-testid="tweetButton"]').first();
      await postBtn.click({ force: true, timeout: 10000 }).catch(async () => {
        await page.getByRole("button", { name: /^Post all$|^Post$|^Gönder$|^Tümünü gönder$/i }).first().click({ force: true, timeout: 10000 });
      });
    }

    const posted = await page
      .waitForSelector('[data-testid="tweetTextarea_0"]', { state: "detached", timeout: 20000 })
      .then(() => true)
      .catch(() => false);

    await shot(page, "x-sak-posted.png");
    const toast = (await page.getByText(/posts? (were|was) sent|Your post was sent|Gönderildi|View/i).count().catch(() => 0)) > 0;
    const ok = posted || toast;

    if (ok) {
      console.log("[x-sak-pr] ✅ Thread successfully posted to @gl1tchbased!");
      fs.writeFileSync(path.resolve(OUT, "x-sak-result.txt"), "POSTED\n");
    } else {
      console.log("[x-sak-pr] ⚠️ Post status unconfirmed, inspect x-sak-posted.png");
      fs.writeFileSync(path.resolve(OUT, "x-sak-result.txt"), "UNCONFIRMED\n");
    }

    await page.waitForTimeout(3000);
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error("[x-sak-pr] Error:", err.message);
  process.exit(1);
});

