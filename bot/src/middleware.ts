import type { Context, NextFunction } from "grammy";
import { isAdmin } from "./config.js";

/** Basic per-user rate limiting to curb spam. */
const lastSeen = new Map<number, number[]>();
const WINDOW_MS = 10_000;
const MAX_IN_WINDOW = 6;

export async function antiSpam(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const times = (lastSeen.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  lastSeen.set(userId, times);

  if (times.length > MAX_IN_WINDOW) {
    // Silently drop excess messages.
    return;
  }
  return next();
}

const SCAM_PATTERNS = [
  /\bairdrop\b.*\bclaim\b/i,
  /\bdm\b.*\b(support|admin|help)\b/i,
  /seed\s*phrase/i,
  /connect\s*(your)?\s*wallet\s*(here|now)/i,
  /t\.me\/\w+_support/i,
];

/** Flags likely scam/impersonation content. Logs and lets admins moderate. */
export async function scamFilter(ctx: Context, next: NextFunction) {
  const text = ctx.message?.text ?? "";
  if (text && SCAM_PATTERNS.some((re) => re.test(text))) {
    console.warn(
      `[scam-flag] user=${ctx.from?.id} chat=${ctx.chat?.id} text=${text.slice(0, 120)}`
    );
    try {
      await ctx.reply("⚠ This message was flagged as a possible scam. Admins never DM first. Verify via /links.");
    } catch {
      /* ignore */
    }
  }
  return next();
}

/** Gate that only lets configured admins proceed. */
export async function adminOnly(ctx: Context, next: NextFunction) {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.reply("Unauthorized. This command is admin-only.");
    return;
  }
  return next();
}

/** Lightweight logging of incoming updates. */
export async function logging(ctx: Context, next: NextFunction) {
  const kind = ctx.message?.text ? "msg" : ctx.update ? "update" : "?";
  console.log(`[in] ${kind} from=${ctx.from?.id ?? "?"} chat=${ctx.chat?.id ?? "?"}`);
  return next();
}
