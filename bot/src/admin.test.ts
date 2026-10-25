import { describe, it, expect, beforeAll } from "vitest";
import { Composer, Context } from "grammy";

const ADMIN = 111;
const USER = 999;
let adminCommands: Composer<Context>;

beforeAll(async () => {
  // config.ts validates required env at import time.
  process.env.BOT_TOKEN = "test-token";
  process.env.ADMIN_IDS = String(ADMIN);
  ({ adminCommands } = await import("./admin.js"));
});

/** Runs one private-chat message through the admin composer the way index.ts mounts it (before the public
 *  handlers) and reports what it replied and whether the update reached the handlers after it. */
async function send(text: string, from: number) {
  const replies: string[] = [];
  const api = new Proxy({}, {
    get: (_t, method) => async (...args: unknown[]) => {
      if (method === "sendMessage") replies.push(String(args[1]));
      return {};
    },
  }) as never;
  const command = text.startsWith("/") ? [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] : undefined;
  const update = {
    update_id: 1,
    message: { message_id: 1, date: 0, chat: { id: 5, type: "private" }, from: { id: from, is_bot: false, first_name: "u" }, text, entities: command },
  } as never;
  const me = { id: 1, is_bot: true, first_name: "bot", username: "gl1tch_infected_bot" } as never;
  let reachedPublic = false;
  const bot = new Composer<Context>();
  bot.use(adminCommands);
  bot.use(() => {
    reachedPublic = true;
  });
  await bot.middleware()(new Context(update, api, me), async () => {});
  return { replies, reachedPublic };
}

describe("admin gate", () => {
  it("lets a non-admin's public command and pasted address through to the public handlers", async () => {
    for (const text of ["/scan 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump"]) {
      const r = await send(text, USER);
      expect(r.reachedPublic).toBe(true);
      expect(r.replies).toEqual([]);
    }
  });

  it("refuses an admin command from a non-admin", async () => {
    const r = await send("/announce hello", USER);
    expect(r.reachedPublic).toBe(false);
    expect(r.replies).toEqual(["Unauthorized. This command is admin-only."]);
  });

  it("runs an admin command for an admin", async () => {
    const r = await send("/chatid", ADMIN);
    expect(r.replies[0]).toMatch(/^Chat ID:/);
  });
});
