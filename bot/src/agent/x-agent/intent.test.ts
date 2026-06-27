import { describe, it, expect } from "vitest";
import { extractTweetId, intentReply, intentRetweet, intentTweet } from "./intent.js";

describe("intent URLs", () => {
  it("encodes tweet text", () => {
    const u = intentTweet("hello $GL1TCH & friends");
    expect(u).toContain("twitter.com/intent/tweet");
    expect(u).toContain("hello%20%24GL1TCH%20%26%20friends");
  });

  it("builds reply intent with tweet id + text", () => {
    const u = intentReply("12345", "thanks");
    expect(u).toContain("in_reply_to=12345");
    expect(u).toContain("text=thanks");
  });

  it("builds retweet intent", () => {
    expect(intentRetweet("999")).toContain("retweet?tweet_id=999");
  });

  it("extracts tweet id from common URL shapes", () => {
    expect(extractTweetId("https://twitter.com/alice/status/1700000000000000000")).toBe(
      "1700000000000000000",
    );
    expect(extractTweetId("https://x.com/bob/status/42?lang=en")).toBe("42");
    expect(extractTweetId("https://nitter.net/dev/status/77#m")).toBe("77");
    expect(extractTweetId("https://x.com/profile")).toBeNull();
  });
});
