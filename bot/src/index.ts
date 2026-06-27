import { Bot } from "grammy";
import { config } from "./config.js";
import { antiSpam, scamFilter, logging } from "./middleware.js";
import { publicCommands } from "./commands.js";
import { scanCommands, autoScan } from "./scan.js";
import { watchCommands, startWatchtower } from "./watch/index.js";
import { callbacks } from "./callbacks.js";
import { xCallbacks } from "./agent/x-agent/handlers.js";
import { adminCommands } from "./admin.js";
import { messages } from "./content.js";
import { startKb } from "./keyboards.js";
import { startVerification } from "./verify/index.js";
import { startAgent, activity } from "./agent/index.js";

const bot = new Bot(config.botToken);

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

// Middleware order: logging → anti-spam → scam filter.
bot.use(logging);
bot.use(antiSpam);
bot.use(scamFilter);

// Privacy-safe daily activity counters for the Signal agent.
bot.use(async (ctx, next) => {
  if (ctx.message) activity.recordMessage(ctx.from?.id);
  await next();
});

// Greet new members.
bot.on("chat_member", async (ctx) => {
  const status = ctx.chatMember?.new_chat_member?.status;
  if (status === "member") {
    activity.recordJoin();
    try {
      await ctx.reply(messages.welcome, { ...HTML, reply_markup: startKb() });
    } catch {
      /* ignore */
    }
  }
});

// Callbacks (inline-button navigation) + commands.
bot.use(callbacks);
bot.use(xCallbacks);
bot.use(adminCommands);
bot.use(scanCommands);
bot.use(watchCommands);
bot.use(publicCommands);

// Auto-scan any contract address pasted in chat (calls next() so other handlers
// still run). Needs group privacy mode OFF to see non-command messages in groups.
bot.use(autoScan);

// Unknown command fallback.
bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    await ctx.reply(messages.fallback, HTML);
  }
});

bot.catch((err) => {
  console.error("[bot error]", err.error);
});

async function main() {
  await bot.api.setMyCommands([
    { command: "start", description: "Enter The Infected" },
    { command: "scan", description: "🔍 Safety-scan any token (any chain)" },
    { command: "watch", description: "👁 Watch a token — alert me if its safety changes" },
    { command: "watching", description: "👁 Your Watchtower list" },
    { command: "unwatch", description: "🚫 Stop watching a token" },
    { command: "menu", description: "Open the control menu" },
    { command: "rank", description: "Rank ladder & verification" },
    { command: "verify", description: "Link wallet to verify your rank" },
    { command: "myrank", description: "Show your verified rank" },
    { command: "lore", description: "A fragment from the archive" },
    { command: "faq", description: "Verified answers" },
    { command: "links", description: "Official links only" },
    { command: "rules", description: "Community rules" },
    { command: "raid", description: "Current raid target" },
    { command: "submit", description: "Submit a meme/content" },
    { command: "support", description: "How to get help" },
  ]);
  startVerification(bot);
  startAgent(bot);
  startWatchtower(bot);
  console.log("GL1TCH bot online. The signal is live.");
  await bot.start({ allowed_updates: ["message", "chat_member", "callback_query"] });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
