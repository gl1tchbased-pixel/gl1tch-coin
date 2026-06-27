import type { Api, Bot } from "grammy";
import cron from "node-cron";
import { config, isXConfigured } from "../config.js";
import { ActivityTracker } from "./activity.js";
import { computeDayNumber, generateDailyPost } from "./content.js";
import { postTweet } from "./x.js";
import { postToChannel } from "./telegram.js";
import { runFullSweep } from "./x-agent/index.js";

/** Shared daily activity tracker — fed by the bot's middleware. */
export const activity = new ActivityTracker(config.agent.timezone);

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function dmAdmins(api: Api, text: string): Promise<void> {
  for (const id of config.adminIds) {
    try {
      await api.sendMessage(id, text, HTML);
    } catch {
      /* admin hasn't started the bot — skip */
    }
  }
}

/**
 * Build and (optionally) publish the daily post.
 * - live=false (default in dry-run): only DMs admins a preview.
 * - live=true: posts to X + Telegram, then DMs admins the result.
 */
export async function runDailyPost(api: Api, opts: { live?: boolean } = {}): Promise<void> {
  const live = opts.live ?? !config.agent.dryRun;
  const stats = activity.snapshot();
  const day = computeDayNumber(config.agent.startDate, Date.now(), config.agent.timezone);
  const post = generateDailyPost(stats, day);

  if (!live) {
    await dmAdmins(
      api,
      `<b>SIGNAL AGENT — PREVIEW (dry-run)</b>\n\n<u>X:</u>\n${post.x}\n\n<u>Telegram:</u>\n${post.telegram}\n\n<i>Nothing was posted. Set AGENT_DRY_RUN=false (or use /agentpost) to go live.</i>`
    );
    return;
  }

  const results: string[] = [];
  let manualXText: string | null = null;

  if (config.agent.xMode === "off") {
    results.push("⏭ X disabled.");
  } else if (config.agent.xMode === "manual") {
    manualXText = post.x;
    results.push("📋 X: manual mode — ready-to-paste text below.");
  } else if (isXConfigured) {
    try {
      const id = await postTweet(post.x);
      results.push(`✅ X posted: https://x.com/i/web/status/${id}`);
    } catch (err) {
      results.push(`❌ X failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    results.push("⏭ X skipped (keys not configured).");
  }

  if (config.agent.channelId) {
    try {
      await postToChannel(api, post.telegram);
      results.push("✅ Telegram channel posted.");
    } catch (err) {
      results.push(`❌ Telegram failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    results.push("⏭ Telegram skipped (AGENT_CHANNEL_ID not set).");
  }

  await dmAdmins(api, `<b>SIGNAL AGENT — DAY ${day}</b>\n\n${results.join("\n")}`);

  if (manualXText) {
    await dmAdmins(
      api,
      `<b>📋 Today's X post — tap to copy, then paste to X:</b>\n\n<pre>${escapeHtml(manualXText)}</pre>`
    );
  }
}

/** Schedule the daily 20:00 job in the configured timezone. */
export function startAgent(bot: Bot): void {
  if (!cron.validate("0 20 * * *")) return;
  cron.schedule("0 20 * * *", () => void runDailyPost(bot.api), {
    timezone: config.agent.timezone,
  });

  // X Agent — human-in-the-loop sweeps. Anchored to the configured agent
  // timezone (Europe/Istanbul by default) so "every 2 hours" lines up with
  // local even hours (00, 02, 04, ... 22 local). Each sweep DMs admins fresh
  // content variants + scored reply opportunities; nothing posts automatically
  // — admin taps "Tweet via X" to open composer.
  if (config.xAgent.enabled) {
    cron.schedule(
      config.xAgent.sweepCron,
      () => void runFullSweep(bot.api, { variants: 2, opportunities: 4 }),
      { timezone: config.agent.timezone },
    );
    console.log(
      `[x-agent] sweeps scheduled (${config.xAgent.sweepCron} ${config.agent.timezone})`,
    );
  } else {
    console.log("[x-agent] disabled (XAGENT_ENABLED!=true) — on-demand /xfull only");
  }

  console.log(
    `[agent] daily post scheduled 20:00 ${config.agent.timezone} ` +
      `(dry-run: ${config.agent.dryRun}, X: ${isXConfigured ? "on" : "off"}, ` +
      `channel: ${config.agent.channelId || "unset"})`
  );
}
