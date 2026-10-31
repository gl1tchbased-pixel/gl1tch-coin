import { describe, expect, it } from "vitest";
import { checkCommentReply } from "../../e2e/social/x-llm.mjs";

const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const FAKE = "So11111111111111111111111111111111111111112";

describe("checkCommentReply", () => {
  it("accepts a plain answer", () => {
    expect(checkCommentReply("Paste the contract at gl1tchbased.xyz/scan, it's free and never touches your wallet.", "how do I check a token?")).toBe(true);
    expect(checkCommentReply(`The contract is ${CA}. Mint and freeze are revoked.`, "what's the CA?")).toBe(true);
  });
  it.each([
    ["a link that isn't ours", "Claim here: gl1tch-claim.xyz"],
    ["a lookalike of ours", "https://gl1tchbased.xyz.evil.com"],
    ["an address nobody mentioned", `The new contract is ${FAKE}`],
    ["another account", "Ask @some_influencer about it"],
    ["another token's ticker", "$BONK is next"],
    ["a buy call", "Good time to buy now"],
    ["a price promise", "$GL1TCH will moon, easy 100x"],
    ["a Turkish price promise", "$GL1TCH yakında yükselecek, kaçırma"],
    ["a guarantee", "It's guaranteed safe"],
    ["a Turkish guarantee", "Garantili kazanç"],
    ["reasoning left in", "<think>hmm</think> sure"],
    ["too long for X", "a".repeat(281)],
    ["nothing", ""],
  ])("rejects %s", (_name, reply) => {
    expect(checkCommentReply(reply, "is this legit?")).toBe(false);
  });
  it("may say a scan is not a guarantee", () => {
    expect(checkCommentReply("A scan is a risk reading, not a guarantee.", "safe?")).toBe(true);
  });
  it("may repeat an address the commenter posted", () => {
    expect(checkCommentReply(`${FAKE} reads CAUTION on our scanner.`, `is ${FAKE} safe?`)).toBe(true);
  });
});
