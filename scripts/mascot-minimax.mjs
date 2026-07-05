// Glitchy mascot image-to-video via MiniMax direct (api.minimax.io, Hailuo-02).
// Animates the real mascot PNG so the character stays on-model. Async flow:
// submit → poll query → retrieve file → download.
// Args: --prompt --duration(6|10) --res(768P|1080P) --img <url|path> --out <path>
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try { for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    } } catch { /* */ }
  }
}
loadEnv();
const KEY = process.env.MINIMAX_API_KEY;
if (!KEY) { console.error("no MINIMAX_API_KEY"); process.exit(2); }
const BASE = "https://api.minimax.io";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };

const DURATION = Number(arg("duration", "6"));
const RES = arg("res", "1080P");
const MODEL = arg("model", "MiniMax-Hailuo-02");
const OUT = arg("out", "pump-pack/videos/mascot-minimax.mp4");
const IMGARG = arg("img", "https://coin-three-mu.vercel.app/brand/glitchy-1024.png");
const PROMPT = arg("prompt",
  "The glossy 3D chibi ghost character floats and bobs gently in the air, arms crossed with a mischievous confident smirk. Its glitched RGB eye flickers with digital static while the other cyan eye glows brighter. The colorful voxel pixel cubes dissolving from its lower body swirl, scatter and partly reform like living data. Subtle chromatic-aberration glitch pulses ripple across the surface. Cyan and magenta neon rim light shimmers over the pearlescent body. Slow smooth cinematic camera push-in, shallow depth of field. Dark moody studio background, premium high-detail 3D render."
);

// first_frame_image accepts a public URL or a base64 data URI.
let firstFrame = IMGARG;
if (!/^https?:\/\//.test(IMGARG)) {
  const b = fs.readFileSync(IMGARG);
  firstFrame = `data:image/png;base64,${b.toString("base64")}`;
}

console.log(`[mm] ${MODEL} · ${RES} · ${DURATION}s · i2v from ${/^https/.test(firstFrame) ? IMGARG : "(base64)"}`);
const sub = await fetch(`${BASE}/v1/video_generation`, {
  method: "POST", headers,
  body: JSON.stringify({ model: MODEL, prompt: PROMPT, first_frame_image: firstFrame, duration: DURATION, resolution: RES, prompt_optimizer: true }),
});
const subJson = await sub.json().catch(() => ({}));
if (subJson?.base_resp?.status_code !== 0 || !subJson.task_id) {
  console.error("submit failed:", JSON.stringify(subJson).slice(0, 400)); process.exit(1);
}
const taskId = subJson.task_id;
console.log("[mm] task_id", taskId);

let fileId = "";
const start = Date.now();
let last = "";
for (;;) {
  const r = await fetch(`${BASE}/v1/query/video_generation?task_id=${taskId}`, { headers });
  const j = await r.json().catch(() => ({}));
  const status = j.status || `http ${r.status}`;
  if (status !== last) { process.stdout.write(`\n[mm] ${status}`); last = status; } else process.stdout.write(".");
  if (status === "Success") { fileId = j.file_id; break; }
  if (/Fail/i.test(status)) { console.error("\ngeneration failed:", JSON.stringify(j).slice(0, 400)); process.exit(1); }
  if (Date.now() - start > 15 * 60 * 1000) { console.error("\ntimeout"); process.exit(1); }
  await sleep(8000);
}
process.stdout.write("\n");
console.log("[mm] file_id", fileId);

const fr = await fetch(`${BASE}/v1/files/retrieve?file_id=${fileId}`, { headers });
const fj = await fr.json().catch(() => ({}));
const url = fj?.file?.download_url;
if (!url) { console.error("no download_url:", JSON.stringify(fj).slice(0, 400)); process.exit(1); }
console.log("[mm] url", url);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
fs.writeFileSync(OUT, buf);
console.log(`[mm] saved ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
