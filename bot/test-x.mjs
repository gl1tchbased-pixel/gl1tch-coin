// Diagnostic: verify X API credentials + access tier. Read-only (no posting).
import { TwitterApi } from "twitter-api-v2";
import { readFileSync } from "node:fs";

// load bot/.env manually
const env = {};
for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const client = new TwitterApi({
  appKey: env.X_API_KEY,
  appSecret: env.X_API_SECRET,
  accessToken: env.X_ACCESS_TOKEN,
  accessSecret: env.X_ACCESS_SECRET,
});

console.log("=== AUTH CHECK: v2.me() ===");
try {
  const me = await client.v2.me({ "user.fields": ["public_metrics", "created_at", "username"] });
  console.log("OK — authenticated as @" + me.data.username);
  console.log("metrics:", JSON.stringify(me.data.public_metrics));
} catch (e) {
  console.log("v2.me FAILED:", e.code, "|", e.data ? JSON.stringify(e.data) : e.message);
  if (e.rateLimit) console.log("rateLimit:", JSON.stringify(e.rateLimit));
  if (e.headers) console.log("headers x-access-level:", e.headers["x-access-level"]);
}
