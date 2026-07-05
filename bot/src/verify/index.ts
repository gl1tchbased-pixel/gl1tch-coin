import type { Bot } from "grammy";
import { Connection } from "@solana/web3.js";
import type { Server } from "node:http";
import { config, isContractLive } from "../config.js";
import { RANK_TIERS, type RankTier } from "../ranks.js";
import { VerifyStore } from "./store.js";
import { verifySignature } from "./signature.js";
import { readTokenBalance } from "./balance.js";
import { handleVerification } from "./flow.js";
import { balanceHistory } from "./history-store.js";
import { createVerifyServer, parseVerifyBody } from "./server.js";
import { signalGraph } from "../signal-graph/store.js";
import { isRecordable, type Observation } from "../signal-graph/graph.js";
import { proofOfSignal } from "../proof-of-signal/store.js";
import { referralStore } from "../referrals.js";
import { agentTrustStore } from "../agent-trust/store.js";
import { agentTrust } from "../agent-trust/trust.js";
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
        recordHistory: (wallet, balance) => balanceHistory.record(wallet, balance),
      },
      parsed
    );

    if (!result.ok) {
      const status = result.error === "internal" ? 500 : 400;
      return { status, body: { ok: false, error: result.error } };
    }

    // Proof-of-Signal: record the verified sustained-holding tier (confirmed once the 7-day
    // window is full) so the Signal Reputation leaderboard reflects real, anti-gamed holding.
    if (!result.preLaunch) {
      const tierRank = RANK_TIERS.find((t) => t.id === result.tierId)?.tier ?? 0;
      proofOfSignal.syncHolder(String(result.tgUserId), "", tierRank, !result.provisional);
    }

    // DM the user out-of-band so room links never live in the browser response.
    try {
      const lines = [
        `<b>RANK VERIFIED</b> — you are <b>${result.rank}</b>.`,
        result.preLaunch
          ? "\n<i>Token not live yet — ranks activate at launch. Re-verify after launch to claim higher tiers.</i>"
          : `\nBalance: <code>${result.balance.toLocaleString("en-US")}</code> $GL1TCH`,
      ];
      if (!result.preLaunch && result.provisional && result.tierId !== "observer") {
        lines.push(
          `\n<i>Provisional — tiers confirm after 7 days of sustained holding (anti-gaming). ${Math.floor(result.coverageDays)}/7 days tracked so far.</i>`
        );
      }
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
  balanceHistory.load();
  signalGraph.load();
  proofOfSignal.load();
  agentTrustStore.load();

  // Signal Graph: normalise a posted observation, coercing/validating before recording.
  const recordObservation = (raw: unknown): void => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const obs: Partial<Observation> = {
      deployer: typeof b.deployer === "string" ? b.deployer : undefined,
      chain: typeof b.chain === "string" ? b.chain : undefined,
      mint: typeof b.mint === "string" ? b.mint : undefined,
      verdict: typeof b.verdict === "string" ? b.verdict : undefined,
      score: typeof b.score === "number" ? b.score : null,
      name: typeof b.name === "string" ? b.name : null,
      symbol: typeof b.symbol === "string" ? b.symbol : null,
      ts: typeof b.ts === "number" ? b.ts : Date.now(),
    };
    if (isRecordable(obs)) signalGraph.observe(obs);
  };

  const server = createVerifyServer({
    origin: config.verify.siteOrigin,
    handle,
    stats: {
      token: config.stats.token,
      get: () => statsStore.get(),
      bump: (flagged, n, flaggedN) => statsStore.bump(flagged, n, flaggedN),
    },
    signal: {
      token: config.stats.token,
      observe: recordObservation,
      deployer: (address, chain, excludeMint) => signalGraph.reputationFor(address, chain, excludeMint),
      leaderboard: (n) => proofOfSignal.leaderboard((id) => referralStore.count(id), n),
      serial: (min) => signalGraph.serialList(min),
      // Agent Trust Layer: combine the agent registry (identity/attestations) with the
      // Signal Graph deploy track record into a single trust assessment.
      agent: (address, chain) => {
        const rec = agentTrustStore.get(address, chain);
        const rep = signalGraph.reputationFor(address, chain);
        const trust = agentTrust({
          verified: rec?.verified ?? false,
          flaggedDeploys: rep.flaggedCount,
          totalDeploys: rep.tokensSeen,
          ageDays: null,
          attestations: rec?.attestations ?? 0,
          disputes: rec?.disputes ?? 0,
        });
        return { address, chain, ...trust, registered: !!rec, verified: rec?.verified ?? false };
      },
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
