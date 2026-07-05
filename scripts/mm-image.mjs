// MiniMax image_generation (image-01) — generate mascot base candidates.
import fs from "node:fs";
import path from "node:path";
for (const f of [".env.local", ".env"]) { try { for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {} }
const KEY = process.env.MINIMAX_API_KEY;
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg("n", "3"));
const OUTDIR = arg("outdir", "pump-pack/videos/mascot-bases");
const ASPECT = arg("aspect", "1:1");
const PROMPT = arg("prompt", "");
if (!KEY || !PROMPT) { console.error("need MINIMAX_API_KEY + --prompt"); process.exit(2); }

const r = await fetch("https://api.minimax.io/v1/image_generation", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "image-01", prompt: PROMPT, aspect_ratio: ASPECT, n: N, prompt_optimizer: true }),
});
const j = await r.json().catch(() => ({}));
if (j?.base_resp?.status_code !== 0) { console.error("failed:", JSON.stringify(j).slice(0, 300)); process.exit(1); }
const urls = j.data?.image_urls || j.data || [];
fs.mkdirSync(OUTDIR, { recursive: true });
let i = 0;
for (const u of urls) {
  const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
  const p = path.join(OUTDIR, `base-${i}.jpg`);
  fs.writeFileSync(p, buf);
  console.log("saved", p, `(${(buf.length / 1e3).toFixed(0)} KB)`);
  i++;
}
console.log("done", i, "images");
