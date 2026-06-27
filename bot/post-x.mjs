// Post a single tweet via OAuth 1.0a user context. Text passed as argv[2] or env TWEET_TEXT.
import { TwitterApi } from "twitter-api-v2";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const text = process.env.TWEET_TEXT || process.argv[2];
if (!text) { console.log("No text provided."); process.exit(1); }

const client = new TwitterApi({
  appKey: env.X_API_KEY,
  appSecret: env.X_API_SECRET,
  accessToken: env.X_ACCESS_TOKEN,
  accessSecret: env.X_ACCESS_SECRET,
});

console.log("Posting (" + text.length + " chars)...");
try {
  const res = await client.v2.tweet(text);
  console.log("SUCCESS — tweet id:", res.data.id);
  console.log("URL: https://x.com/gl1tchbased/status/" + res.data.id);
} catch (e) {
  console.log("POST FAILED");
  console.log("code:", e.code);
  console.log("data:", e.data ? JSON.stringify(e.data) : e.message);
  if (e.headers) console.log("x-access-level:", e.headers["x-access-level"]);
}
