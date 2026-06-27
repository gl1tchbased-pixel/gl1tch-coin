#!/usr/bin/env node
/**
 * GL1TCH — fal.ai image-to-video generator.
 *
 * Uses the same FAL_KEY that powers scripts/make-video.mjs ($20 free trial).
 * Default model: fal-ai/kling-video/v2-master/image-to-video (premium Kling on fal).
 * Fallback:      fal-ai/kling-video/v1-6/standard/image-to-video (cheaper).
 *
 * Run:
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/fal-i2v.mjs
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/fal-i2v.mjs --model cheap
 *
 * Out: assets/generated/video/glitchy-fal-<timestamp>.mp4
 */

import fs from "node:fs";
import path from "node:path";

// ---- env loader ------------------------------------------------------------
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const KEY = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!KEY) { console.error("Missing FAL_KEY in .env.local"); process.exit(1); }

// ---- config ----------------------------------------------------------------
const IMAGE_PATH = "public/brand/glitchy-1024.png";
const OUT_DIR = "assets/generated/video";

const cheap = process.argv.includes("--model") && process.argv[process.argv.indexOf("--model") + 1] === "cheap";
const MODEL = cheap
  ? "fal-ai/kling-video/v1-6/standard/image-to-video"
  : "fal-ai/kling-video/v2-master/image-to-video";

const PROMPT = [
  "Glitchy the chibi ghost mascot floats gently upward with a soft bob motion.",
  "Holographic iridescent shimmer rolls across its glossy vinyl body.",
  "The right eye RGB chromatic aberration intensifies into a rapid glitch flicker for 1 second then snaps back to normal.",
  "Voxel pixels at the lower body cascade downward in slow motion like a digital waterfall.",
  "Soft cyan and magenta particles drift slowly around the character.",
  "The neon '1' on the forehead pulses with glowing energy.",
  "Camera slowly orbits 15 degrees around the mascot revealing 3D depth.",
  "Dramatic 3-point studio lighting (cyan key, magenta rim, violet fill).",
  "Jet-black void background with faint floating glitched pixel particles.",
  "Cinematic 24fps, ultra-premium product showcase, hyper-detailed.",
].join(" ");

const NEGATIVE = "text, watermark, logo, blurry, low quality, distorted face, deformed, ugly, extra limbs";

// ---- helpers ---------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fal(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Key ${KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 400)}`); }
  if (!res.ok) throw new Error(`fal.ai error (${res.status}): ${json?.detail || json?.error || text.slice(0, 400)}`);
  return json;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(IMAGE_PATH)) throw new Error(`Image not found: ${IMAGE_PATH}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const imgB64 = fs.readFileSync(IMAGE_PATH).toString("base64");
  const dataUri = `data:image/png;base64,${imgB64}`;
  console.log(`→ Model: ${MODEL}`);
  console.log(`→ Image: ${IMAGE_PATH} (${(imgB64.length / 1024 / 1024).toFixed(2)} MB)`);

  const body = {
    prompt: PROMPT,
    image_url: dataUri,
    duration: "5",
    aspect_ratio: "1:1",
    negative_prompt: NEGATIVE,
    cfg_scale: 0.5,
  };

  // submit to queue
  const submitUrl = `https://queue.fal.run/${MODEL}`;
  const submit = await fal("POST", submitUrl, body);
  const requestId = submit.request_id;
  const statusUrl = submit.status_url;
  const responseUrl = submit.response_url;
  if (!requestId) throw new Error(`No request_id: ${JSON.stringify(submit)}`);
  console.log(`✓ Submitted. request_id=${requestId}`);

  // poll
  const started = Date.now();
  let lastStatus = "";
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const s = await fal("GET", statusUrl);
    const status = s.status || "(unknown)";
    if (status !== lastStatus) {
      console.log(`  [${Math.round((Date.now() - started) / 1000)}s] status=${status}`);
      lastStatus = status;
    }
    if (status === "COMPLETED") {
      const result = await fal("GET", responseUrl);
      const url = result?.video?.url || result?.output?.video?.url;
      if (!url) throw new Error(`Done but no video URL: ${JSON.stringify(result)}`);
      console.log(`✓ Done. URL: ${url}`);
      const out = path.join(OUT_DIR, `glitchy-fal-${Date.now()}.mp4`);
      const buf = await fetch(url).then((r) => r.arrayBuffer());
      fs.writeFileSync(out, Buffer.from(buf));
      console.log(`✓ Saved: ${out} (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(`Task ${status}: ${JSON.stringify(s)}`);
    }
  }
  throw new Error("Timed out (10 min).");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
