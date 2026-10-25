import { describe, expect, it } from "vitest";
import { replyText } from "./replies.js";
import { buildReplyFor } from "./content.js";

const MINT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

describe("replyText", () => {
  it("answers the topic of the post", () => {
    expect(replyText("claim your airdrop, connect wallet now", 0)).toMatch(/drainer|never needs your wallet/i);
    expect(replyText("bought it and now I can't sell", 0)).toMatch(/honeypot|can't sell/i);
    expect(replyText("dev rugged us again", 1)).toMatch(/rug|pull/i);
  });

  it("links the scan of the token when the post names one", () => {
    expect(replyText(`thoughts on ${MINT}?`, 0)).toContain(`gl1tchbased.xyz/scan/solana-${MINT}`);
    expect(replyText("", 0)).toContain("gl1tchbased.xyz/scan");
  });

  it("never pitches our token", () => {
    for (let seed = 0; seed < 6; seed++) {
      for (const ctx of ["", "rug", "airdrop claim", "honeypot", "LP locked?", "new launch on pump.fun"]) {
        const t = replyText(ctx, seed);
        expect(t).not.toMatch(/\$GL1TCH/);
        expect(t.length).toBeLessThanOrEqual(280);
      }
    }
  });

  it("reads the token address from a DexScreener opportunity id", () => {
    const r = buildReplyFor(
      { id: `dex-profile-${MINT}`, source: "dexscreener", url: "https://dexscreener.com/solana/x", author: "", title: "New Solana token profile", excerpt: "", score: 50, metrics: {} },
      0,
    );
    expect(r.text).toContain(`/scan/solana-${MINT}`);
  });
});
