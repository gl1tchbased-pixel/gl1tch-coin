#!/usr/bin/env node
/**
 * GL1TCH video generator — text-to-video, multi-provider.
 *
 * Providers:
 *   fal      fal.ai queue API. Hosts the SAME MiniMax Hailuo models + many others.
 *            $20 free credits on signup -> use this for free generation.
 *            Key: https://fal.ai/dashboard/keys  (env FAL_KEY)
 *   minimax  MiniMax / Hailuo direct API (api.minimax.io).
 *            Key: https://platform.minimax.io/user-center/basic-information/interface-key
 *            (env MINIMAX_API_KEY)  — needs a funded balance.
 *
 * Default provider: fal if FAL_KEY is set, else minimax.
 *
 * Presets live below and are provider-agnostic (prompt + model + duration + resolution).
 *
 * Run (this machine needs system CA — see AGENTS.md / memory). PowerShell:
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/make-video.mjs splash
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/make-video.mjs --prompt "..." --duration 10
 *   node scripts/make-video.mjs --list                 # show presets
 *   node scripts/make-video.mjs splash --provider fal  # force a provider
 *
 * Out: assets/generated/video/*.mp4
 */

import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "assets/generated/video";

// ---- env -------------------------------------------------------------------
// Minimal .env.local loader (KEY=value lines) so we don't pull in a dep.
function loadEnv() {
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
}
loadEnv();

const POLL_KEY = process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_TOKEN;
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY;
const MINIMAX_KEY = process.env.MINIMAX_API_KEY || process.env.MINIMAX_KEY;

// ---- presets (from pump-pack/06-higgsfield-creative-briefs.md) -------------
const PRESETS = {
  splash: {
    desc: "Asset 4 — 5s terminal loop: YOU FOUND THE SIGNAL / EXPOSURE IS IRREVERSIBLE",
    model: "MiniMax-Hailuo-2.3",
    duration: 6,
    resolution: "1080P",
    prompt:
      "Pitch black background, a single line of monospace terminal-green text types " +
      "out letter by letter: \"YOU FOUND THE SIGNAL.\" [Static shot], then a brief " +
      "sharp chromatic-aberration glitch transition, then the line is replaced by " +
      "\"EXPOSURE IS IRREVERSIBLE.\" with a blinking cursor that holds. Faint CRT " +
      "scanlines throughout, deep matte black, minimal motion, premium and clean, " +
      "no sound, no people, no logos.",
  },
  signal: {
    desc: "Cinematic intro — fallen CRT monitor reveals $GL1TCH // SIGNAL DETECTED",
    model: "MiniMax-Hailuo-2.3",
    duration: 6,
    resolution: "1080P",
    prompt:
      "Slow cinematic camera move across a black concrete floor toward an abandoned " +
      "CRT monitor [Push in]; the screen flickers to life showing a single line of " +
      "monospace green text \"$GL1TCH // SIGNAL DETECTED\", faint scanlines, subtle " +
      "chromatic aberration, deep matte black room, one distant cold light source, " +
      "premium minimal cyber aesthetic, photographic realism, no other text, no people.",
  },
  spread: {
    desc: "Abstract signal-spreading motif (tired-futuristic, not cyberpunk)",
    model: "MiniMax-Hailuo-2.3",
    duration: 6,
    resolution: "1080P",
    prompt:
      "A single terminal-green signal dot on a deep matte black field begins to " +
      "pulse and propagate outward in faint concentric rings [Zoom out], thin glitch " +
      "lines ripple across the frame, very restrained motion, faint CRT scanlines, " +
      "premium minimal editorial aesthetic, high contrast, no text, no characters.",
  },
};

// ---- args ------------------------------------------------------------------
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) a[key] = true;
      else {
        a[key] = next;
        i++;
      }
    } else a._.push(t);
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, outPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download http ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

// ===========================================================================
// Provider: Pollinations (free key, gen.pollinations.ai) — returns mp4 directly
// ===========================================================================
const pollinations = {
  key: () => POLL_KEY,
  // Pollinations video model ids (our presets use a MiniMax id -> fall back to wan).
  models: new Set([
    "veo", "seedance-pro", "seedance-2.0", "wan", "wan-fast", "wan-pro",
    "grok-video-pro", "ltx-2", "p-video", "nova-reel",
  ]),
  async run(job, log) {
    // wan-fast = the free 5s video model; presets carry a MiniMax id -> fall back to it.
    const model = this.models.has(job.model) ? job.model : "wan-fast";
    const aspect = job.aspect || "9:16";
    const params = new URLSearchParams({
      model,
      duration: String(job.duration),
      aspectRatio: aspect,
      audio: "false",
      enhance: "true",
    });
    const url = `https://gen.pollinations.ai/video/${encodeURIComponent(job.prompt)}?${params}`;
    log(`[1/1] ${model} (${aspect}, ${job.duration}s) — single request, holds open until rendered (can take minutes)…`);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${POLL_KEY}` } });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.startsWith("video")) {
      const t = await r.text().catch(() => "");
      throw new Error(`pollinations ${r.status} ${ct}: ${t.slice(0, 300)}`);
    }
    return { buffer: Buffer.from(await r.arrayBuffer()) };
  },
};

// ===========================================================================
// Provider: fal.ai (queue API)
// ===========================================================================
const fal = {
  key: () => FAL_KEY,
  headers() {
    return { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };
  },
  // Map our generic model + resolution to a fal model id.
  // standard variant = 768p, pro variant = 1080p.
  modelId(job) {
    const base = /02/.test(job.model) ? "fal-ai/minimax/hailuo-02" : "fal-ai/minimax/hailuo-2.3";
    const tier = job.resolution === "1080P" ? "pro" : "standard";
    return `${base}/${tier}/text-to-video`;
  },
  async run(job, log) {
    const id = this.modelId(job);
    log(`[1/3] submitting to ${id} …`);
    const sub = await fetch(`https://queue.fal.run/${id}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        prompt: job.prompt,
        prompt_optimizer: true,
        duration: String(job.duration),
      }),
    });
    const subJson = await sub.json().catch(() => ({}));
    if (!sub.ok) {
      const detail = subJson.detail ? JSON.stringify(subJson.detail) : sub.statusText;
      throw new Error(`fal submit ${sub.status}: ${detail}${sub.status === 401 ? " (check FAL_KEY)" : ""}`);
    }
    const { request_id, status_url, response_url } = subJson;
    if (!status_url || !response_url) throw new Error(`fal submit: missing urls (${JSON.stringify(subJson)})`);
    log(`      request_id ${request_id}`);

    log("[2/3] polling (a few minutes)…");
    const start = Date.now();
    let last = "";
    for (;;) {
      const r = await fetch(status_url, { headers: this.headers() });
      const j = await r.json().catch(() => ({}));
      const status = j.status || (r.ok ? "?" : `http ${r.status}`);
      if (status !== last) {
        process.stdout.write(`\n      status: ${status}`);
        last = status;
      } else process.stdout.write(".");
      if (status === "COMPLETED") {
        process.stdout.write("\n");
        break;
      }
      if (/FAIL|ERROR/i.test(status)) throw new Error(`\nfal generation failed: ${JSON.stringify(j)}`);
      if (Date.now() - start > 15 * 60 * 1000) throw new Error("\nfal polling timed out");
      await sleep(8000);
    }

    log("[3/3] fetching result…");
    const res = await fetch(response_url, { headers: this.headers() });
    const out = await res.json().catch(() => ({}));
    const url = out?.video?.url;
    if (!url) throw new Error(`fal result: no video.url (${JSON.stringify(out)})`);
    return url;
  },
};

// ===========================================================================
// Provider: MiniMax direct (api.minimax.io)
// ===========================================================================
const minimax = {
  key: () => MINIMAX_KEY,
  base: "https://api.minimax.io",
  headers() {
    return { Authorization: `Bearer ${MINIMAX_KEY}`, "Content-Type": "application/json" };
  },
  ok(b) {
    return b && b.status_code === 0;
  },
  err(b) {
    const map = {
      1002: "rate limit — retry later",
      1004: "auth failed — check MINIMAX_API_KEY",
      1008: "insufficient balance",
      1026: "prompt flagged as sensitive content",
      2013: "invalid parameters",
      2049: "invalid API key",
    };
    return `${b?.status_code} ${b?.status_msg || ""}${map[b?.status_code] ? ` (${map[b?.status_code]})` : ""}`.trim();
  },
  async run(job, log) {
    log("[1/3] creating task…");
    const c = await fetch(`${this.base}/v1/video_generation`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: job.model,
        prompt: job.prompt,
        duration: job.duration,
        resolution: job.resolution,
        prompt_optimizer: true,
      }),
    });
    const cj = await c.json();
    if (!this.ok(cj.base_resp)) throw new Error(`create failed: ${this.err(cj.base_resp)}`);
    if (!cj.task_id) throw new Error(`create failed: no task_id (${JSON.stringify(cj)})`);
    log(`      task_id ${cj.task_id}`);

    log("[2/3] polling (a few minutes)…");
    const start = Date.now();
    let last = "";
    let fileId;
    for (;;) {
      const r = await fetch(
        `${this.base}/v1/query/video_generation?task_id=${encodeURIComponent(cj.task_id)}`,
        { headers: this.headers() }
      );
      const j = await r.json();
      if (!this.ok(j.base_resp)) throw new Error(`query failed: ${this.err(j.base_resp)}`);
      if (j.status !== last) {
        process.stdout.write(`\n      status: ${j.status}`);
        last = j.status;
      } else process.stdout.write(".");
      if (j.status === "Success") {
        process.stdout.write("\n");
        fileId = j.file_id;
        break;
      }
      if (j.status === "Fail") throw new Error("\ngeneration failed (status=Fail)");
      if (Date.now() - start > 15 * 60 * 1000) throw new Error("\npolling timed out");
      await sleep(10000);
    }

    log("[3/3] retrieving file…");
    const fr = await fetch(`${this.base}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`, {
      headers: this.headers(),
    });
    const fj = await fr.json();
    if (!this.ok(fj.base_resp)) throw new Error(`retrieve failed: ${this.err(fj.base_resp)}`);
    const url = fj.file?.download_url;
    if (!url) throw new Error("retrieve: no download_url");
    return url;
  },
};

// ===========================================================================
// Provider: comfy — LOCAL ComfyUI on this machine (D:\AIVideoStudio), $0, no key.
// Requires ComfyUI running: D:\AIVideoStudio\scripts\start_lowvram.bat
// Engine: DreamShaper 8 (SD1.5) + AnimateDiff v3 -> VHS h264-mp4.
// ===========================================================================
const comfy = {
  key: () => true, // local, no API key
  server: () => process.env.COMFY_URL || "127.0.0.1:8188",
  size(job) {
    // GTX 1060 6GB: keep video at SD1.5-friendly sizes.
    if (job.aspect === "9:16") return { w: 384, h: 640 };
    if (job.aspect === "16:9") return { w: 640, h: 384 };
    return { w: 512, h: 512 };
  },
  graph(job) {
    const { w, h } = this.size(job);
    const frames = job.frames || 16;
    const neg = "blurry, low quality, watermark, text, letters, deformed, ugly, oversaturated";
    const seed = Math.floor(Math.random() * 2 ** 31);
    return {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "DreamShaper_8_pruned.safetensors" } },
      "2": { class_type: "ADE_AnimateDiffLoaderGen1", inputs: { model: ["1", 0], model_name: "v3_sd15_mm.ckpt", beta_schedule: "autoselect" } },
      "3": { class_type: "CLIPTextEncode", inputs: { text: job.prompt, clip: ["1", 1] } },
      "4": { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["1", 1] } },
      "5": { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: frames } },
      "6": { class_type: "KSampler", inputs: { seed, steps: 22, cfg: 7, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1.0, model: ["2", 0], positive: ["3", 0], negative: ["4", 0], latent_image: ["5", 0] } },
      "7": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["1", 2] } },
      "8": { class_type: "VHS_VideoCombine", inputs: { images: ["7", 0], frame_rate: job.fps || 8, loop_count: 0, filename_prefix: "gl1tch", format: "video/h264-mp4", pingpong: false, save_output: true } },
    };
  },
  async run(job, log) {
    const server = this.server();
    log(`[1/2] submitting to local ComfyUI (${server}) — DreamShaper+AnimateDiff v3…`);
    let sub;
    try {
      sub = await fetch(`http://${server}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: this.graph(job) }),
      });
    } catch {
      throw new Error(`cannot reach ComfyUI at ${server}. Start it: D:\\AIVideoStudio\\scripts\\start_lowvram.bat`);
    }
    if (!sub.ok) throw new Error(`comfy /prompt ${sub.status}: ${(await sub.text()).slice(0, 300)}`);
    const pid = (await sub.json()).prompt_id;
    log(`      prompt_id ${pid}`);

    log("[2/2] polling (GPU is rendering, a few minutes)…");
    const start = Date.now();
    let outputs;
    for (;;) {
      const h = await fetch(`http://${server}/history/${pid}`);
      const j = await h.json();
      if (j[pid]) { outputs = j[pid].outputs; break; }
      process.stdout.write(".");
      if (Date.now() - start > 15 * 60 * 1000) throw new Error("\ncomfy polling timed out");
      await sleep(2500);
    }
    process.stdout.write("\n");
    for (const node of Object.values(outputs)) {
      for (const key of ["gifs", "videos", "images"]) {
        for (const item of node[key] || []) {
          const q = new URLSearchParams({ filename: item.filename, subfolder: item.subfolder || "", type: item.type || "output" });
          const r = await fetch(`http://${server}/view?${q}`);
          if (r.ok && (r.headers.get("content-type") || "").includes("video")) return { buffer: Buffer.from(await r.arrayBuffer()) };
        }
      }
    }
    throw new Error("comfy finished but no video output found");
  },
};

const PROVIDERS = { pollinations, fal, minimax, comfy };

// ---- main ------------------------------------------------------------------
function usage() {
  console.log(`GL1TCH video generator (fal.ai / MiniMax-Hailuo)

  node scripts/make-video.mjs <preset> [--provider P] [--model M] [--duration N] [--resolution R] [--out NAME]
  node scripts/make-video.mjs --prompt "your prompt" [...same options]
  node scripts/make-video.mjs --list

Presets:`);
  for (const [k, p] of Object.entries(PRESETS)) console.log(`  ${k.padEnd(8)} ${p.desc}`);
  console.log(`
Options:
  --provider    comfy (LOCAL, free, GTX1060) | pollinations | fal | minimax
                comfy needs ComfyUI running: D:\\AIVideoStudio\\scripts\\start_lowvram.bat
  --model       pollinations: wan-fast (free, default) | ltx-2 | wan | veo(paid) | …
  --duration    6 (default) | 10
  --resolution  1080P (default) | 768P     (fal: 1080P=pro, 768P=standard)
  --aspect      pollinations only: 9:16 (default) | 16:9
  --out         output filename (without extension)

Keys (.env.local):  POLLINATIONS_KEY=… and/or FAL_KEY=… and/or MINIMAX_API_KEY=…
  pollinations: https://enter.pollinations.ai   (free, no card)
  fal:          https://fal.ai/dashboard/keys
  minimax:      https://platform.minimax.io/user-center/basic-information/interface-key
Out: ${OUT_DIR}/*.mp4
PowerShell: $env:NODE_OPTIONS="--use-system-ca"; node scripts/make-video.mjs splash`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list || (args._.length === 0 && !args.prompt)) {
    usage();
    return;
  }

  // Resolve job from preset or --prompt.
  let job, name;
  const presetName = args._[0];
  if (presetName && PRESETS[presetName]) {
    job = { ...PRESETS[presetName] };
    name = presetName;
  } else if (presetName && !args.prompt) {
    console.error(`Unknown preset "${presetName}". Use --list to see presets.`);
    process.exit(1);
  } else {
    job = { model: "MiniMax-Hailuo-2.3", duration: 6, resolution: "1080P", prompt: args.prompt };
    name = "custom";
  }
  if (args.model) job.model = args.model;
  if (args.duration) job.duration = Number(args.duration);
  if (args.resolution) job.resolution = args.resolution;
  if (args.aspect) job.aspect = args.aspect;
  if (args.prompt && presetName && PRESETS[presetName]) job.prompt = args.prompt;

  // Pick provider: explicit flag, else first keyed of pollinations > fal > minimax.
  const providerName =
    args.provider || (POLL_KEY ? "pollinations" : FAL_KEY ? "fal" : "minimax");
  const provider = PROVIDERS[providerName];
  if (!provider) {
    console.error(`Unknown provider "${providerName}". Use fal or minimax.`);
    process.exit(1);
  }
  if (!provider.key()) {
    const meta = {
      pollinations: ["POLLINATIONS_KEY", "Get one (free, no card): https://enter.pollinations.ai"],
      fal: ["FAL_KEY", "Get one (free credits): https://fal.ai/dashboard/keys"],
      minimax: ["MINIMAX_API_KEY", "Get one: https://platform.minimax.io/user-center/basic-information/interface-key"],
    }[providerName];
    console.error(`ERROR: ${meta[0]} not set for provider "${providerName}". Add it to .env.local.`);
    console.error(meta[1]);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = (args.out || `gl1tch-${name}`).replace(/[^\w.-]/g, "_");
  const outPath = path.join(OUT_DIR, `${base}-${stamp}.mp4`);

  console.log(`\n  provider   ${providerName}`);
  console.log(`  model      ${job.model}`);
  console.log(`  duration   ${job.duration}s   resolution ${job.resolution}`);
  console.log(`  prompt     ${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? "…" : ""}\n`);

  const log = (m) => console.log(m);
  const res = await provider.run(job, log);
  const out = typeof res === "string" ? { url: res } : res;

  let bytes;
  if (out.buffer) {
    fs.writeFileSync(outPath, out.buffer);
    bytes = out.buffer.length;
  } else {
    console.log("      downloading…");
    bytes = await download(out.url, outPath);
  }
  console.log(`\n✓ saved ${outPath}  (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log("  next: upload to Higgsfield media_upload → virality_predictor (see brief 06).");
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
