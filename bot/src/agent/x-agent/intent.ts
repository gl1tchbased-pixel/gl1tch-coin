/** X / Twitter intent URL builders — used by the approval queue inline buttons.
 * Tapping these on mobile opens the official X composer with text pre-filled;
 * on desktop they open twitter.com/intent/tweet. Nothing is posted until the
 * user taps "Tweet" inside X. This is the only ethical, free, ban-proof path. */

const BASE = "https://twitter.com/intent";

/** Compose a brand new tweet. */
export function intentTweet(text: string): string {
  return `${BASE}/tweet?text=${encodeURIComponent(text)}`;
}

/** Compose a reply to a specific tweet. `tweetId` is the numeric id. */
export function intentReply(tweetId: string, text: string): string {
  return `${BASE}/tweet?in_reply_to=${encodeURIComponent(tweetId)}&text=${encodeURIComponent(text)}`;
}

/** Repost (RT) a tweet via the official confirmation flow. */
export function intentRetweet(tweetId: string): string {
  return `${BASE}/retweet?tweet_id=${encodeURIComponent(tweetId)}`;
}

/** Like a tweet via the official confirmation flow. */
export function intentLike(tweetId: string): string {
  return `${BASE}/like?tweet_id=${encodeURIComponent(tweetId)}`;
}

/** Best-effort: extract a tweet id from any common X / Nitter URL.
 *  Returns null if the URL isn't a tweet page. */
export function extractTweetId(url: string): string | null {
  // Examples:
  //   https://twitter.com/elonmusk/status/1234567890
  //   https://x.com/handle/status/1234567890
  //   https://nitter.net/handle/status/1234567890
  //   https://nitter.privacydev.net/handle/status/1234567890#m
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}
