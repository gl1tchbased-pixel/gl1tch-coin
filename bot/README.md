# GL1TCH Telegram Bot

grammy (TypeScript) bot for The Infected. Brand-consistent onboarding, ranks, lore, anti-scam.

## Setup
1. `cd bot && npm install`
2. Create a bot via [@BotFather](https://t.me/BotFather), copy the token.
3. `cp .env.example .env` and fill `BOT_TOKEN`, `ADMIN_IDS` (comma-separated Telegram user IDs), `GROUP_ID`.
4. `npm run dev` (watch) or `npm start`.

## Commands
**Public:** `/start` `/menu` `/rank` `/lore` `/faq` `/links` `/rules` `/raid` `/submit` `/support`
**Admin (gated + logged):** `/announce` `/pin` `/warn` `/mute` `/ban` `/incident`

## Premium UX
- HTML-formatted messages (bold headers, monospace, no link-preview clutter).
- Inline keyboards everywhere; `/menu` is an interactive hub that navigates **in place** (edits one message via callbacks) — Ranks / Lore / FAQ / Rules / Official Links.
- `/links` shows tappable channel buttons (X / Telegram / Website).
- `/lore` is sequential with a **Next fragment →** button.
- `/rank` includes a **Verify Rank ↗** button to the website.

## Safety
- Admins never DM first — surfaced in `/start`, `/rules`, `/support`.
- Per-user rate limiting and a scam-phrase filter run on every message.
- Official links live in `src/content.ts` — keep in sync with the website's `src/lib/official.ts`.

## Notes
- The bot needs admin rights in the group for `/pin` `/mute` `/ban`.
- For new-member greetings, enable the bot to receive `chat_member` updates (it requests them via long polling).
