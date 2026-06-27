// Post to X via browser-session cookies (bypasses the API credits wall).
// Cookies read from bot/.env: X_AUTH_TOKEN, X_CT0 (and optional X_GUEST_ID, X_TWID).
// Usage: TWEET_TEXT="..." node x-post.mjs   (or pass text as argv[2])
import { Scraper } from "agent-twitter-client";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const text = process.env.TWEET_TEXT || process.argv[2];
if (!text) { console.log("No text. Set TWEET_TEXT."); process.exit(1); }
if (!env.X_AUTH_TOKEN || !env.X_CT0) { console.log("Missing X_AUTH_TOKEN / X_CT0 in .env"); process.exit(1); }

const cookies = [
  `auth_token=${env.X_AUTH_TOKEN}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
  `ct0=${env.X_CT0}; Domain=.twitter.com; Path=/; Secure`,
  `auth_token=${env.X_AUTH_TOKEN}; Domain=.x.com; Path=/; Secure; HttpOnly`,
  `ct0=${env.X_CT0}; Domain=.x.com; Path=/; Secure`,
];
if (env.X_GUEST_ID) cookies.push(`guest_id=${env.X_GUEST_ID}; Domain=.twitter.com; Path=/`);
if (env.X_TWID) cookies.push(`twid=${env.X_TWID}; Domain=.twitter.com; Path=/`);

const scraper = new Scraper();
await scraper.setCookies(cookies);

const ok = await scraper.isLoggedIn();
console.log("Logged in via cookies:", ok);
if (!ok) { console.log("Cookie auth failed — auth_token/ct0 likely expired or wrong."); process.exit(1); }

console.log(`Posting (${text.length} chars)...`);
try {
  const res = await scraper.sendTweet(text);
  const json = await res.json();
  const id = json?.data?.create_tweet?.tweet_results?.result?.rest_id;
  if (id) {
    console.log("SUCCESS — tweet id:", id);
    console.log("URL: https://x.com/gl1tchbased/status/" + id);
  } else {
    console.log("Response had no tweet id:", JSON.stringify(json).slice(0, 800));
  }
} catch (e) {
  console.log("POST FAILED:", e.message);
}
