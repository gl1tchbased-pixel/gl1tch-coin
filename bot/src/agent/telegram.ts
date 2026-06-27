import type { Api } from "grammy";
import { config } from "../config.js";

/** Post the daily update to the configured Telegram channel/group (bot must be admin). */
export async function postToChannel(api: Api, html: string): Promise<void> {
  if (!config.agent.channelId) throw new Error("AGENT_CHANNEL_ID not set.");
  await api.sendMessage(config.agent.channelId, html, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

/** Post a photo+caption to the configured Telegram channel/group (bot must be admin). */
export async function postPhotoToChannel(
  api: Api,
  photoUrl: string,
  htmlCaption: string,
): Promise<void> {
  if (!config.agent.channelId) throw new Error("AGENT_CHANNEL_ID not set.");
  await api.sendPhoto(config.agent.channelId, photoUrl, {
    caption: htmlCaption,
    parse_mode: "HTML",
  });
}
