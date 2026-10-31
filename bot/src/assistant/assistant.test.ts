import { describe, it, expect } from "vitest";
import { OFFICIAL } from "../content.js";
import { looksLikeScam } from "../middleware.js";
import { Budget, CHAT_GAP_MS, QUESTION_GAP_MS, USER_PER_DAY } from "./budget.js";
import { numbersAreFromFacts } from "./digest.js";
import { stripReasoning } from "./llm.js";
import { allowedAddresses, isSkip, sanitizeReply } from "./sanitize.js";
import { classify, looksLikeQuestion, type MessageFacts } from "./trigger.js";

const base: MessageFacts = {
  text: "Bu token güvenli mi?",
  chatType: "supergroup",
  officialGroup: true,
  fromAdmin: false,
  fromBot: false,
  mentionsBot: false,
  repliesToBot: false,
  repliesToOther: false,
  hasAddress: false,
};

describe("looksLikeQuestion", () => {
  it.each(["Bu token güvenli mi", "nasıl tarama yapılır", "how do I scan a token", "what is an LP lock", "kaç kişi kullanıyor", "LP kilitli mi?"])("%s", (t) => {
    expect(looksLikeQuestion(t)).toBe(true);
  });
  it.each(["gm", "hello everyone", "selam millet", "harika proje", "ok"])("not: %s", (t) => {
    expect(looksLikeQuestion(t)).toBe(false);
  });
});

describe("classify", () => {
  it("answers questions in our own groups", () => expect(classify(base)).toBe("ambient"));
  it("marks the admin's questions", () => expect(classify({ ...base, fromAdmin: true })).toBe("admin"));
  it("may join in on anything else in our own groups", () => expect(classify({ ...base, text: "Yo" })).toBe("chat"));
  it("stays out of people talking to each other", () => expect(classify({ ...base, repliesToOther: true })).toBeNull());
  it("is a guest in other groups: silent unless addressed", () => {
    expect(classify({ ...base, officialGroup: false })).toBeNull();
    expect(classify({ ...base, officialGroup: false, text: "Yo" })).toBeNull();
    expect(classify({ ...base, officialGroup: false, mentionsBot: true })).toBe("mention");
    expect(classify({ ...base, officialGroup: false, repliesToBot: true })).toBe("reply");
  });
  it("answers a mention even when it isn't phrased as a question", () => {
    expect(classify({ ...base, text: "@bot anlat bakalım", mentionsBot: true })).toBe("mention");
  });
  it("never answers commands or other bots", () => {
    expect(classify({ ...base, text: "/scan bonk", mentionsBot: true })).toBeNull();
    expect(classify({ ...base, fromBot: true })).toBeNull();
  });
  it("leaves pasted contracts to the auto-scanner", () => {
    expect(classify({ ...base, hasAddress: true })).toBeNull();
    expect(classify({ ...base, chatType: "private", text: OFFICIAL.CONTRACT, hasAddress: true })).toBeNull();
  });
  it("answers anything in DMs", () => expect(classify({ ...base, chatType: "private", text: "selam" })).toBe("private"));
  it("ignores channels", () => expect(classify({ ...base, chatType: "channel" })).toBeNull());
});

describe("looksLikeScam", () => {
  it("flags a pitch", () => expect(looksLikeScam("Airdrop live, claim now and enter your seed phrase")).toBe(true));
  it("doesn't flag someone asking about one", () => expect(looksLikeScam("Birisi seed phrase istedi, bu dolandırıcılık mı?")).toBe(false));
});

describe("Budget", () => {
  const o = { chatId: 1, userId: 2, exempt: false, gapMs: 0 };
  it("spaces out unprompted replies per chat, counted from when the bot last spoke", () => {
    const b = new Budget();
    expect(b.take({ ...o, gapMs: CHAT_GAP_MS, now: 1000 })).toBe(true);
    expect(b.take({ ...o, gapMs: CHAT_GAP_MS, now: 1001 })).toBe(true); // it passed on the first, so nothing to wait for
    b.spoke(1, 1001);
    expect(b.take({ ...o, gapMs: CHAT_GAP_MS, now: 1002 })).toBe(false);
    expect(b.take({ ...o, gapMs: QUESTION_GAP_MS, now: 1002 })).toBe(false);
    expect(b.take({ ...o, gapMs: QUESTION_GAP_MS, now: 1001 + QUESTION_GAP_MS })).toBe(true);
    expect(b.take({ ...o, gapMs: CHAT_GAP_MS, now: 1001 + CHAT_GAP_MS })).toBe(true);
    expect(b.take({ ...o, gapMs: CHAT_GAP_MS, chatId: 9, now: 1002 })).toBe(true);
    expect(b.take({ ...o, now: 1002 })).toBe(true); // asked directly: no gap
  });
  it("caps a user per day, exempts the admin, and resets tomorrow", () => {
    const b = new Budget();
    for (let i = 0; i < USER_PER_DAY; i++) expect(b.take({ ...o, now: 5 })).toBe(true);
    expect(b.take({ ...o, now: 5 })).toBe(false);
    expect(b.take({ ...o, exempt: true, now: 5 })).toBe(true);
    expect(b.take({ ...o, now: 86_400_000 + 5 })).toBe(true);
  });
});

describe("sanitizeReply", () => {
  const none = allowedAddresses();
  it("removes links that aren't ours", () => {
    const out = sanitizeReply("Claim at https://gl1tch-airdrop.xyz/claim or drainer.io now", none);
    expect(out).not.toMatch(/airdrop|drainer/);
    expect(out).toContain("[link removed]");
  });
  it.each([
    "https://gl1tchbased.xyz.evil.com/scan",
    "https://evilgl1tchbased.xyz",
    "https://gl1tchbased.xyz@evil.com",
    "https://evil.com/x.gl1tchbased.xyz/",
    "https://t.me/gl1tch_infected_support",
    "https://x.com/gl1tchbased_real",
    "https://github.com/gl1tchbased-pixel-fake/repo",
    "https://pump.fun/coin/FakeMint",
  ])("is not fooled by %s", (u) => {
    expect(sanitizeReply(u, none)).toBe("[link removed]");
  });
  it("treats the word Pump.fun as a name, but still checks its links", () => {
    expect(sanitizeReply("the Pump.fun bonding curve", none)).toBe("the Pump.fun bonding curve");
    expect(sanitizeReply("https://pump.fun/coin/FakeMint", none)).toBe("[link removed]");
  });
  it("unmasks markdown links before checking them", () => {
    expect(sanitizeReply("[official site](https://evil.com)", none)).toBe("official site [link removed]");
  });
  it.each([
    "https://gl1tchbased.xyz/scan",
    "gl1tchbased.xyz/proof",
    "https://www.gl1tchbased.xyz",
    "https://t.me/gl1tch_infected",
    "https://github.com/gl1tchbased-pixel/gl1tch-coin",
    `https://rugcheck.xyz/tokens/${OFFICIAL.CONTRACT}`,
    `https://pump.fun/coin/${OFFICIAL.CONTRACT}`,
  ])("keeps %s", (u) => {
    expect(sanitizeReply(u, none)).toBe(u);
  });
  it("keeps sentence punctuation after a good link", () => {
    expect(sanitizeReply("See gl1tchbased.xyz/proof.", none)).toBe("See gl1tchbased.xyz/proof.");
  });
  it("removes an address nobody put on the table", () => {
    const fake = "So11111111111111111111111111111111111111112";
    expect(sanitizeReply(`New contract: ${fake}`, none)).toBe("New contract: [address removed]");
    expect(sanitizeReply(`Contract: ${OFFICIAL.CONTRACT}`, none)).toContain(OFFICIAL.CONTRACT);
    expect(sanitizeReply(`You asked about ${fake}`, allowedAddresses(`is ${fake} safe?`))).toContain(fake);
  });
  it("removes handles that aren't ours", () => {
    expect(sanitizeReply("Contact @gl1tch_support_team for help", none)).toBe("Contact [handle removed] for help");
    expect(sanitizeReply("Follow @gl1tchbased", none)).toBe("Follow @gl1tchbased");
  });
  it("strips markdown and caps length", () => {
    expect(sanitizeReply("**bold** `code`", none)).toBe("bold code");
    expect(sanitizeReply("a".repeat(3000), none).length).toBeLessThanOrEqual(1500);
  });
  it("recognises SKIP", () => {
    expect(isSkip("SKIP")).toBe(true);
    expect(isSkip(" skip. ")).toBe(true);
    expect(isSkip("skip the bridge and use Jupiter")).toBe(false);
  });
});

describe("numbersAreFromFacts", () => {
  const facts = "Scans run by people: 12\nFlagged: 1,204";
  it("accepts numbers from the facts", () => expect(numbersAreFromFacts("12 scans and 1204 flagged", facts)).toBe(true));
  it("rejects invented numbers", () => expect(numbersAreFromFacts("12 scans, 5000 flagged", facts)).toBe(false));
});

describe("stripReasoning", () => {
  it("removes reasoning, closed or cut off", () => {
    expect(stripReasoning("<think>plan</think> Answer")).toBe("Answer");
    expect(stripReasoning("<think>never finished")).toBe("");
    expect(stripReasoning("Answer")).toBe("Answer");
  });
});
