#!/usr/bin/env node
/**
 * GL1TCH — Kling AI image-to-video generator.
 *
 * Endpoint:  https://api-singapore.klingai.com/v1/videos/image2video
 * Auth:      JWT HS256 in `Authorization: Bearer <token>`
 *            payload: { iss: AK, exp: now+1800, nbf: now-5 }
 * Image:     base64 (no data: prefix) OR https URL. <=10MB.
 *
 * Run (PowerShell on this machine):
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/kling-i2v.mjs
 *
 * Out: assets/generated/video/glitchy-<timestamp>.mp4
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ---- env loader (same pattern as make-video.mjs) ---------------------------
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

const AK = process.env.KLING_ACCESS_KEY;
const SK = process.env.KLING_SECRET_KEY;
if (!AK || !SK) {
  console.error("Missing KLING_ACCESS_KEY / KLING_SECRET_KEY in .env.local");
  process.exit(1);
}

// ---- config ----------------------------------------------------------------
const BASE = "https://api-singapore.klingai.com";
const IMAGE_PATH = "public/brand/glitchy-1024.png";
const OUT_DIR = "assets/generated/video";

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

const BODY = {
  model_name: "kling-v1-6", // cheapest tier with image input
  image: null, // set below
  prompt: PROMPT,
  negative_prompt: NEGATIVE,
  cfg_scale: 0.5,
  mode: "std",
  duration: "5",
  aspect_ratio: "1:1",
};

// ---- JWT (HS256, no deps) --------------------------------------------------
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function jwt() {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iss: AK, exp: now + 1800, nbf: now - 5 }));
  const data = `${header}.${payload}`;
  const sig = b64url(crypto.createHmac("sha256", SK).update(data).digest());
  return `${data}.${sig}`;
}

// ---- helpers ---------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      "Authorization": `Bearer ${jwt()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 400)}`); }
  if (!res.ok || (json.code !== undefined && json.code !== 0)) {
    throw new Error(`Kling API error (${res.status}, code=${json.code}): ${json.message || text}`);
  }
  return json;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(IMAGE_PATH)) throw new Error(`Image not found: ${IMAGE_PATH}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const imgB64 = fs.readFileSync(IMAGE_PATH).toString("base64");
  console.log(`→ Image: ${IMAGE_PATH} (${(imgB64.length / 1024 / 1024).toFixed(2)} MB base64)`);
  console.log(`→ Model: ${BODY.model_name} | mode: ${BODY.mode} | ${BODY.duration}s | ${BODY.aspect_ratio}`);

  // submit
  const submitBody = { ...BODY, image: imgB64 };
  const submit = await api("POST", "/v1/videos/image2video", submitBody);
  const taskId = submit?.data?.task_id;
  if (!taskId) throw new Error(`No task_id in submit response: ${JSON.stringify(submit)}`);
  console.log(`✓ Submitted. task_id=${taskId}`);

  // poll
  const started = Date.now();
  let lastStatus = "";
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const q = await api("GET", `/v1/videos/image2video/${taskId}`);
    const t = q?.data;
    const status = t?.task_status || "(unknown)";
    if (status !== lastStatus) {
      console.log(`  [${Math.round((Date.now() - started) / 1000)}s] status=${status}`);
      lastStatus = status;
    }
    if (status === "succeed") {
      const url = t?.task_result?.videos?.[0]?.url;
      if (!url) throw new Error(`Succeeded but no video URL: ${JSON.stringify(t)}`);
      console.log(`✓ Done. URL: ${url}`);
      const out = path.join(OUT_DIR, `glitchy-${Date.now()}.mp4`);
      const buf = await fetch(url).then((r) => r.arrayBuffer());
      fs.writeFileSync(out, Buffer.from(buf));
      console.log(`✓ Saved: ${out} (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }
    if (status === "failed") {
      throw new Error(`Task failed: ${t?.task_status_msg || JSON.stringify(t)}`);
    }
  }
  throw new Error("Timed out waiting for task (10 min).");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
