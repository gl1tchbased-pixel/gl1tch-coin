// LLM reply generation for the X helpful-reply engine — Cerebras (OpenAI-compatible, fast).
// Turns a stranger's token-safety question into a genuinely helpful, human, on-brand reply.
// Falls back to null on any error so x-reply can use a template instead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(DIR, "..", "..", "bot", ".env");

function key() {
  try {
    const env = fs.readFileSync(ENV, "utf8");
    return (env.match(/^\s*CEREBRAS_API_KEY\s*=(.*)$/m)?.[1] || "").trim();
  } catch { return process.env.CEREBRAS_API_KEY || ""; }
}

const MODELS = ["gpt-oss-120b", "zai-glm-4.7", "gemma-4-31b"];

const SYSTEM = `You are the voice of GL1TCH — a FREE, non-custodial, multi-chain crypto token SAFETY SCANNER (coin-three-mu.vercel.app/scan). It reads mint/freeze authority, LP lock, holder concentration, honeypot/sell traps, insider bundling, and a deployer's track record, and returns a plain-English risk verdict on any Solana/EVM token.

A crypto user just tweeted a QUESTION about whether a token is safe / a rug / a honeypot. Write ONE reply that genuinely HELPS them.

Hard rules:
- Sound like a helpful human on crypto Twitter, peer to peer. NOT a bot, NOT an ad, NOT hype.
- Actually address THEIR specific worry first, in one line. Then, naturally, mention they can check it free at coin-three-mu.vercel.app/scan.
- Max 270 characters. No hashtags. No emojis-spam (at most one). No "As an AI". No financial advice; you can add a short "dyor".
- Exactly one link: coin-three-mu.vercel.app/scan
- Do NOT shill the $GL1TCH token. Lead with being useful; the tool is the hook.
Return ONLY the reply text, nothing else.`;

/** Generate a contextual reply to `tweetText`. Returns a <=280 string, or null on failure. */
export async function generateReply(tweetText) {
  const k = key();
  if (!k) return null;
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + k },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Their tweet:\n"""${tweetText.slice(0, 600)}"""\n\nWrite the reply.` },
          ],
          max_completion_tokens: 160,
          temperature: 0.7,
        }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      let text = (j.choices?.[0]?.message?.content || "").trim();
      // strip wrapping quotes / any leading label the model might add
      text = text.replace(/^["'`]+|["'`]+$/g, "").replace(/^reply:\s*/i, "").trim();
      if (!text) continue;
      if (!/coin-three-mu\.vercel\.app\/scan/i.test(text)) text += `\n\ncoin-three-mu.vercel.app/scan`;
      if ([...text].length > 280) text = text.slice(0, 277) + "…";
      return text;
    } catch { /* try next model */ }
  }
  return null;
}
