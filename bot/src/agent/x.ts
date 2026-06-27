import { TwitterApi } from "twitter-api-v2";
import { config } from "../config.js";

/** Post a tweet to our own account via OAuth 1.0a user context. Returns the tweet id. */
export async function postTweet(text: string): Promise<string> {
  const client = new TwitterApi({
    appKey: config.agent.x.apiKey,
    appSecret: config.agent.x.apiSecret,
    accessToken: config.agent.x.accessToken,
    accessSecret: config.agent.x.accessSecret,
  });
  const res = await client.v2.tweet(text);
  return res.data.id;
}
