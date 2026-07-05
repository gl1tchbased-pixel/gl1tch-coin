// Glitchy mascot image-to-video via fal.ai (MiniMax Hailuo-02). Keeps the character
// on-model by animating the real mascot PNG. Env/args: PROMPT, DURATION (6|10),
// TIER (pro=1080p | standard=768p), IMG (url), OUT (path).
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch { /* no file */ }
  }
}
loadEnv();
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!FAL_KEY) { console.error("no FAL_KEY"); process.exit(2); }

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : (process.env[k.toUpperCase()] || d); };
const DURATION = arg("duration", "6");
const TIER = arg("tier", "pro");        // pro=1080p, standard=768p
const RES = TIER === "pro" ? "1080P" : "768P";
const IMG = arg("img", "https://coin-three-mu.vercel.app/brand/glitchy-1024.png");
const OUT = arg("out", `pump-pack/videos/mascot-i2v-${Date.now ? "clip" : "clip"}.mp4`);
const PROMPT = arg("prompt",
  "The 3D chibi ghost character floats and bobs gently in the air, arms crossed with a mischievous confident smirk. Its glitched RGB eye flickers with digital static while the other cyan eye glows. The colorful pixel voxel cubes dissolving from its lower body swirl and drift like scattering data, some reforming. Subtle chromatic-aberration glitch pulses ripple across the character. Cyan and magenta neon rim light shimmers over the glossy surface. Slow smooth cinematic camera push-in. Dark moody background, premium high-detail 3D render, cohesive brand colors, no text changes."
);

const headers = { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const modelId = `fal-ai/minimax/hailuo-02/${TIER}/image-to-video`;
console.log(`[i2v] ${modelId} · ${RES} · ${DURATION}s\n[i2v] image: ${IMG}`);

const sub = await fetch(`https://queue.fal.run/${modelId}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ prompt: PROMPT, image_url: IMG, duration: String(DURATION), resolution: RES, prompt_optimizer: true }),
});
const subJson = await sub.json().catch(() => ({}));
if (!sub.ok) { console.error(`submit ${sub.status}:`, JSON.stringify(subJson).slice(0, 400)); process.exit(1); }
const { request_id, status_url, response_url } = subJson;
console.log("[i2v] request_id", request_id);

const start = Date.now();
let last = "";
for (;;) {
  const r = await fetch(status_url, { headers });
  const j = await r.json().catch(() => ({}));
  const status = j.status || `http ${r.status}`;
  if (status !== last) { process.stdout.write(`\n[i2v] ${status}`); last = status; } else process.stdout.write(".");
  if (status === "COMPLETED") break;
  if (/FAIL|ERROR/i.test(status)) { console.error("\nfailed:", JSON.stringify(j).slice(0, 400)); process.exit(1); }
  if (Date.now() - start > 15 * 60 * 1000) { console.error("\ntimeout"); process.exit(1); }
  await sleep(8000);
}
process.stdout.write("\n");
const res = await fetch(response_url, { headers });
const out = await res.json().catch(() => ({}));
const url = out?.video?.url;
if (!url) { console.error("no video.url:", JSON.stringify(out).slice(0, 400)); process.exit(1); }
console.log("[i2v] video:", url);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
fs.writeFileSync(OUT, buf);
console.log(`[i2v] saved ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
