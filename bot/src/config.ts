import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}. See .env.example.`);
  }
  return value;
}

/** Parse "tierId:chatId,tierId:chatId" into a map of gated chats per rank tier. */
function parseGatedChats(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = pair.indexOf(":");
    if (idx <= 0) continue;
    const tier = pair.slice(0, idx).trim();
    const chatId = pair.slice(idx + 1).trim();
    if (tier && chatId) out[tier] = chatId;
  }
  return out;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  adminIds: (process.env.ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
  groupId: process.env.GROUP_ID ?? "",
  verify: {
    // HTTP endpoint the website /verify page posts signed payloads to.
    // Railway/most hosts inject PORT — bind to it so the public HTTPS routes here.
    port: Number(process.env.PORT ?? process.env.VERIFY_PORT ?? 8787),
    // Allowed browser origin for CORS (the website). Empty disables the server.
    siteOrigin: process.env.SITE_ORIGIN ?? "",
    rpcUrl: process.env.SOLANA_RPC ?? "https://api.mainnet-beta.solana.com",
    // Empty until launch — balances cannot be read before the token exists.
    contractAddress: process.env.CONTRACT_ADDRESS ?? "",
    // tierId -> private chat id, e.g. "infected:-1001234567890,core:-1009876543210"
    gatedChats: parseGatedChats(process.env.GATED_CHATS ?? ""),
  },
  /** Global scan-counter: shared token guards the POST /stats/scan increment endpoint. */
  stats: {
    token: process.env.STATS_TOKEN ?? "",
  },
  agent: {
    // X (OAuth 1.0a user context) — write-only daily posting.
    x: {
      apiKey: process.env.X_API_KEY ?? "",
      apiSecret: process.env.X_API_SECRET ?? "",
      accessToken: process.env.X_ACCESS_TOKEN ?? "",
      accessSecret: process.env.X_ACCESS_SECRET ?? "",
    },
    // X posting mode: "auto" = post via API; "manual" = DM admins ready-to-paste
    // text (free, no API credits needed); "off" = skip X entirely.
    xMode: (process.env.AGENT_X_MODE as "auto" | "manual" | "off") || "auto",
    // Telegram channel/group the daily post is sent to (bot must be admin).
    channelId: process.env.AGENT_CHANNEL_ID ?? "",
    timezone: process.env.AGENT_TIMEZONE ?? "Europe/Istanbul",
    // While true, the agent only DMs admins a preview — it posts nowhere.
    dryRun: process.env.AGENT_DRY_RUN !== "false",
    // Anchor date for the "DAY N" counter in posts.
    startDate: process.env.AGENT_START_DATE ?? new Date().toISOString().slice(0, 10),
  },
  /** X Agent — human-in-the-loop content + discovery (no API posting). */
  xAgent: {
    enabled: process.env.XAGENT_ENABLED === "true",
    // Default: 6 sweeps concentrated in the active window (Europe/Istanbul),
    // not round-the-clock — Solana CT is alive ~12:00–24:00 local (EU afternoon
    // through US prime). Firing in dead hours (03:00–10:00) just buried the DMs.
    // Times: 12, 15, 17, 19, 21, 23 local. Each DM carries X + TG buttons —
    // admin posts X manually, taps "📤 Post to TG" to mirror to the TG group.
    sweepCron: process.env.XAGENT_SWEEP_CRON ?? "0 12,15,17,19,21,23 * * *",
  },
  /** X bridge — shared secret for the /xqueue endpoints the LOCAL Playwright
   *  worker polls. When the admin taps "🤖 Auto-post", the variant is queued
   *  here; the local worker pulls it and posts via a logged-in browser. Empty
   *  token = bridge disabled (no button, endpoints return 403). */
  xBridge: {
    token: process.env.X_BRIDGE_TOKEN ?? "",
  },
};

export const isVerifyEnabled = config.verify.siteOrigin.length > 0;
export const isXBridgeEnabled = config.xBridge.token.length > 0;
export const isContractLive = config.verify.contractAddress.length > 0;
export const isXConfigured =
  config.agent.x.apiKey.length > 0 &&
  config.agent.x.apiSecret.length > 0 &&
  config.agent.x.accessToken.length > 0 &&
  config.agent.x.accessSecret.length > 0;

export function isAdmin(userId: number | undefined): boolean {
  return userId !== undefined && config.adminIds.includes(userId);
}
