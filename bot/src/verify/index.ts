import type { Bot } from "grammy";
import { Connection } from "@solana/web3.js";
import type { Server } from "node:http";
import { config, isContractLive } from "../config.js";
import { RANK_TIERS, type RankTier } from "../ranks.js";
import { VerifyStore } from "./store.js";
import { verifySignature } from "./signature.js";
import { readTokenBalance } from "./balance.js";
import { handleVerification } from "./flow.js";
import { createVerifyServer, parseVerifyBody } from "./server.js";
import { claimPendingX, ackX } from "../agent/x-agent/xqueue.js";
import { statsStore } from "../stats.js";

/** Shared store — the bot issues nonces here and the HTTP endpoint consumes them. */
export const store = new VerifyStore();

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

function rankName(id: RankTier["id"]): string {
  return RANK_TIERS.find((t) => t.id === id)?.rank ?? id;
}

/** Wire the verification HTTP server to a running bot. Returns the server (or null
 *  when disabled). The bot DMs the user their rank + single-use room invites. */
export function startVerification(bot: Bot): Server | null {
  if (!config.verify.siteOrigin) {
    console.log("[verify] SITE_ORIGIN unset — verification server disabled.");
    return null;
  }

  const connection = new Connection(config.verify.rpcUrl, "confirmed");

  const grantAccess = async (
    _tgUserId: number,
    tierIds: RankTier["id"][]
  ): Promise<string[]> => {
    const links: string[] = [];
    for (const id of tierIds) {
      const chatId = config.verify.gatedChats[id];
      if (!chatId) continue;
      try {
        const invite = await bot.api.createChatInviteLink(chatId, {
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 3600,
        });
        links.push(`<b>${rankName(id)}</b>: ${invite.invite_link}`);
      } catch (err) {
        console.warn(`[verify] could not create invite for ${id}/${chatId}:`, err);
      }
    }
    return links;
  };

  const handle = async (body: unknown) => {
    const parsed = parseVerifyBody(body);
    if (!parsed) return { status: 400, body: { ok: false, error: "bad_request" } };

    const result = await handleVerification(
      store,
      {
        verify: verifySignature,
        readBalance: (owner) =>
          readTokenBalance(connection, owner, config.verify.contractAddress),
        contractLive: isContractLive,
        grantAccess,
      },
      parsed
    );

    if (!result.ok) {
      const status = result.error === "internal" ? 500 : 400;
      return { status, body: { ok: false, error: result.error } };
    }

    // DM the user out-of-band so room links never live in the browser response.
    try {
      const lines = [
        `<b>RANK VERIFIED</b> — you are <b>${result.rank}</b>.`,
        result.preLaunch
          ? "\n<i>Token not live yet — ranks activate at launch. Re-verify after launch to claim higher tiers.</i>"
          : `\nBalance: <code>${result.balance.toLocaleString("en-US")}</code> $GL1TCH`,
      ];
      if (result.invites.length > 0) {
        lines.push("\nYour single-use room links (expire in 1h):");
        lines.push(result.invites.join("\n"));
      } else if (!result.preLaunch && result.tierId !== "observer") {
        lines.push("\n<i>Gated rooms are not configured yet — links will arrive once set up.</i>");
      }
      await bot.api.sendMessage(result.tgUserId, lines.join("\n"), HTML);
    } catch (err) {
      console.warn("[verify] could not DM user:", err);
    }

    return {
      status: 200,
      body: {
        ok: true,
        rank: result.rank,
        balance: result.balance,
        unlocks: result.unlocks,
        preLaunch: result.preLaunch,
        dmSent: true,
      },
    };
  };

  statsStore.load();
  const server = createVerifyServer({
    origin: config.verify.siteOrigin,
    handle,
    stats: {
      token: config.stats.token,
      get: () => statsStore.get(),
      bump: (flagged, n, flaggedN) => statsStore.bump(flagged, n, flaggedN),
    },
    ...(config.xBridge.token
      ? {
          xBridge: {
            token: config.xBridge.token,
            claim: () => claimPendingX(),
            ack: (body: unknown) => {
              const b = (body ?? {}) as Record<string, unknown>;
              if (typeof b.id !== "string") return false;
              const status = b.status === "done" ? "done" : "error";
              return ackX({
                id: b.id,
                status,
                postedUrl: typeof b.postedUrl === "string" ? b.postedUrl : null,
                error: typeof b.error === "string" ? b.error : null,
              });
            },
          },
        }
      : {}),
  });
  server.listen(config.verify.port, () => {
    console.log(`[verify] listening on :${config.verify.port} (origin ${config.verify.siteOrigin})`);
  });
  return server;
}
