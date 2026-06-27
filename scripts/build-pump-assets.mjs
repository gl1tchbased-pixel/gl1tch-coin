#!/usr/bin/env node
/**
 * Build pump-pack visual assets.
 * Pipeline: FLUX (Pollinations) generates a clean text-free background,
 * then sharp composites real typography via SVG overlay.
 *
 * Run: node scripts/build-pump-assets.mjs
 * Out: assets/generated/*.jpg
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = "assets/generated";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
const GREEN = "#5BFF8F";
const BLACK = "#0A0A0A";
const MUTED = "#7A8579";

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function flux(prompt, w, h, seed) {
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(prompt) +
    `?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
      if (!r.ok) {
        console.log("flux http", r.status, "try", i);
        await sleep(4000);
        continue;
      }
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      console.log("flux err", e.cause?.code || e.message, "try", i);
      await sleep(4000);
    }
  }
  throw new Error("flux failed");
}

/** Solid black plate (used when FLUX background would only add noise). */
function plate(w, h) {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 10, g: 10, b: 10 },
    },
  });
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function svg(w, h, body) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      .mono { font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace; }
      .head { font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace; font-weight: 700; }
    </style>
  </defs>
  ${body}
</svg>`);
}

function bigNumber({ w, h, label, sub, color = GREEN, sublabel = "" }) {
  // Centered hero numeral + small caption underneath.
  const headSize = Math.round(Math.min(w, h) * 0.42);
  const subSize = Math.round(Math.min(w, h) * 0.032);
  const eyebrowSize = Math.round(Math.min(w, h) * 0.022);
  return svg(
    w,
    h,
    `
    <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}"
          fill="none" stroke="#1a221c" stroke-width="2" rx="6"/>
    ${sublabel ? `<text x="${w / 2}" y="${h * 0.18}" text-anchor="middle"
                       class="mono" font-size="${eyebrowSize}" letter-spacing="6"
                       fill="${MUTED}">${sublabel}</text>` : ""}
    <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle"
          class="head" font-size="${headSize}" fill="${color}"
          letter-spacing="-4">${esc(label)}</text>
    <text x="${w / 2}" y="${h * 0.86}" text-anchor="middle"
          class="mono" font-size="${subSize}" letter-spacing="6"
          fill="${MUTED}">${esc(sub)}</text>
  `,
  );
}

function ticker(w, h) {
  // Always-on $GL1TCH ticker bottom-left mark
  const size = Math.round(Math.min(w, h) * 0.022);
  return `<text x="${w * 0.06}" y="${h * 0.95}"
                class="mono" font-size="${size}" fill="${MUTED}"
                letter-spacing="4">$GL1TCH · SOL</text>`;
}

async function asset01_banner() {
  console.log("01 banner ...");
  const w = 1500, h = 500;
  const bg = await flux(
    "Wide cinematic banner photograph, an abandoned bulky CRT television monitor sits on cracked dark concrete floor, ambient haze, single distant cool light source casting subtle reflection on the wet floor, deep matte black background, premium minimal cinema aesthetic, photorealistic, high contrast, no people, no logos, no text on screen",
    w, h, 11,
  );

  const overlay = svg(
    w,
    h,
    `
    <!-- screen glow rectangle approximated on left third -->
    <rect x="155" y="155" width="320" height="120" fill="${GREEN}" opacity="0.18" filter="url(#g)"/>
    <defs><filter id="g"><feGaussianBlur stdDeviation="30"/></filter></defs>
    <text x="195" y="220" class="mono" font-size="22" fill="${GREEN}" letter-spacing="2">$GL1TCH</text>
    <text x="195" y="248" class="mono" font-size="14" fill="${GREEN}" opacity="0.85" letter-spacing="3">SIGNAL DETECTED</text>
    <text x="195" y="266" class="mono" font-size="10" fill="${GREEN}" opacity="0.55" letter-spacing="4">// NODE 0001 ONLINE</text>

    <text x="${w - 60}" y="${h - 90}" text-anchor="end"
          class="head" font-size="34" fill="#e8efe9" letter-spacing="2">
      THE SIGNAL DOES NOT ASK
    </text>
    <text x="${w - 60}" y="${h - 56}" text-anchor="end"
          class="head" font-size="34" fill="#e8efe9" letter-spacing="2">
      PERMISSION TO SPREAD.
    </text>
    <text x="${w - 60}" y="${h - 28}" text-anchor="end"
          class="mono" font-size="13" fill="${MUTED}" letter-spacing="6">
      $GL1TCH · SOLANA · ZERO TAX · 1 UTILITY
    </text>
  `,
  );

  const bgFitted = await sharp(bg)
    .resize(w, h, { fit: "cover", position: "center" })
    .modulate({ brightness: 0.85, saturation: 0.55 })
    .linear(1.05, -10)
    .toBuffer();
  await sharp(bgFitted)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT_DIR, "01-x-banner.jpg"));
  console.log("01 ok");
}

async function plateAsset(name, bigSvg, w = 1024, h = 1024) {
  await plate(w, h)
    .composite([{ input: bigSvg, top: 0, left: 0 }])
    .jpeg({ quality: 94 })
    .toFile(path.join(OUT_DIR, name));
  console.log(name, "ok");
}

async function asset02_zerotax() {
  const w = 1024, h = 1024;
  const body = bigNumber({
    w, h,
    sublabel: "PROTOCOL · TOKEN-2022",
    label: "0%",
    sub: "TAX · BUY & SELL",
  });
  await plateAsset("02-zero-tax.jpg", body, w, h);
}

async function asset03_mint() {
  const w = 1024, h = 1024;
  const body = bigNumber({
    w, h,
    sublabel: "ON-CHAIN · IRREVERSIBLE",
    label: "NULL",
    sub: "MINT AUTHORITY · REVOKED",
  });
  await plateAsset("03-mint-null.jpg", body, w, h);
}

async function asset04_freeze() {
  const w = 1024, h = 1024;
  const body = bigNumber({
    w, h,
    sublabel: "ON-CHAIN · IRREVERSIBLE",
    label: "NULL",
    sub: "FREEZE AUTHORITY · REVOKED",
  });
  await plateAsset("04-freeze-null.jpg", body, w, h);
}

async function asset05_rugcheck() {
  const w = 1024, h = 1024;
  const inner = svg(w, h, `
    <rect x="${w*0.06}" y="${h*0.06}" width="${w*0.88}" height="${h*0.88}"
          fill="none" stroke="#1a221c" stroke-width="2" rx="6"/>
    <text x="${w/2}" y="${h*0.18}" text-anchor="middle"
          class="mono" font-size="22" letter-spacing="6" fill="${MUTED}">
      THIRD-PARTY AUDIT
    </text>
    <text x="${w/2}" y="${h*0.62}" text-anchor="middle"
          class="head" font-size="430" fill="${GREEN}" letter-spacing="-10">1</text>
    <text x="${w/2}" y="${h*0.78}" text-anchor="middle"
          class="mono" font-size="28" letter-spacing="6" fill="#cfd6cf">
      RUGCHECK · RISK SCORE
    </text>
    <g transform="translate(${w/2}, ${h*0.88})">
      <text x="-300" y="0" text-anchor="middle" class="mono" font-size="26" fill="${GREEN}" letter-spacing="2">[ 0 RISKS ]</text>
      <text x="0"    y="0" text-anchor="middle" class="mono" font-size="26" fill="${GREEN}" letter-spacing="2">[ MINT NULL ]</text>
      <text x="300"  y="0" text-anchor="middle" class="mono" font-size="26" fill="${GREEN}" letter-spacing="2">[ FREEZE NULL ]</text>
    </g>
  `);
  await plateAsset("05-rugcheck-1.jpg", inner, w, h);
}

async function asset06_howtobuy() {
  const w = 1024, h = 1280;
  const inner = svg(w, h, `
    <rect x="${w*0.06}" y="${h*0.06}" width="${w*0.88}" height="${h*0.88}"
          fill="none" stroke="#1a221c" stroke-width="2" rx="6"/>
    <text x="${w/2}" y="${h*0.13}" text-anchor="middle"
          class="mono" font-size="24" letter-spacing="6" fill="${MUTED}">
      60 SECONDS · ZERO FRICTION
    </text>
    <text x="${w/2}" y="${h*0.21}" text-anchor="middle"
          class="head" font-size="62" fill="#f0f5f1" letter-spacing="2">
      HOW TO BUY $GL1TCH
    </text>

    ${[
      ["1", "PHANTOM + SOL", "Fund wallet with ≥0.1 SOL"],
      ["2", "PUMP.FUN · BUY", "Paste CA · slippage 1-3%"],
      ["3", "/VERIFY · ENTER", "Sign free message · join tier"],
    ].map((row, i) => {
      const y = h * (0.36 + i * 0.18);
      return `
        <text x="${w*0.14}" y="${y}" class="head" font-size="130" fill="${GREEN}">${row[0]}</text>
        <text x="${w*0.30}" y="${y - 30}" class="head" font-size="40" fill="#f0f5f1" letter-spacing="2">${row[1]}</text>
        <text x="${w*0.30}" y="${y + 8}" class="mono" font-size="22" fill="${MUTED}" letter-spacing="1">${row[2]}</text>
        <line x1="${w*0.10}" y1="${y + 50}" x2="${w*0.90}" y2="${y + 50}"
              stroke="#1a221c" stroke-width="1"/>
      `;
    }).join("")}

    <text x="${w/2}" y="${h*0.95}" text-anchor="middle"
          class="mono" font-size="22" fill="${MUTED}" letter-spacing="4">
      coin-three-mu.vercel.app · t.me/gl1tch_infected
    </text>
  `);
  await plateAsset("06-how-to-buy.jpg", inner, w, h);
}

async function asset07_memetemplate() {
  const w = 1024, h = 1280;
  const inner = svg(w, h, `
    <rect x="${w*0.06}" y="${h*0.06}" width="${w*0.88}" height="${h*0.88}"
          fill="none" stroke="#1a221c" stroke-width="2" rx="6"/>
    <text x="${w*0.10}" y="${h*0.18}" class="mono" font-size="32" letter-spacing="6" fill="${MUTED}">
      OTHER MEMECOINS
    </text>
    <text x="${w*0.10}" y="${h*0.30}" class="head" font-size="48" fill="#f0f5f1">
      &lt; fill in the meme &gt;
    </text>

    <line x1="${w*0.10}" y1="${h*0.50}" x2="${w*0.90}" y2="${h*0.50}"
          stroke="#1a221c" stroke-width="1"/>

    <text x="${w*0.10}" y="${h*0.62}" class="mono" font-size="32" letter-spacing="6" fill="${GREEN}">
      $GL1TCH
    </text>
    <text x="${w*0.10}" y="${h*0.74}" class="head" font-size="48" fill="#f0f5f1">
      &lt; fill in the flex &gt;
    </text>
    <text x="${w/2}" y="${h*0.93}" text-anchor="middle"
          class="mono" font-size="20" fill="${MUTED}" letter-spacing="4">
      $GL1TCH · COMMUNITY TEMPLATE
    </text>
  `);
  await plateAsset("07-meme-template.jpg", inner, w, h);
}

async function asset08_emblem() {
  console.log("08 emblem ...");
  const w = 1024, h = 1024;
  const bg = await flux(
    "Abstract minimal background, deep matte black, very subtle dark noise texture, single faint cool light vignette in center, no text, no logo, no people, no objects, pure background plate, premium editorial",
    w, h, 77,
  );

  const R = 320;
  const cx = w / 2, cy = h / 2;
  // Arc path for circular text
  const arcId = "arc1";
  const overlay = svg(w, h, `
    <defs>
      <path id="${arcId}" d="M ${cx - R} ${cy} a ${R} ${R} 0 1 1 ${R * 2} 0" />
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GREEN}" stroke-width="2" stroke-dasharray="6 14" opacity="0.55"/>
    <circle cx="${cx}" cy="${cy}" r="${R - 18}" fill="none" stroke="${GREEN}" stroke-width="1" opacity="0.25"/>

    <!-- center sigil: signal waves -->
    <g transform="translate(${cx} ${cy})" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round">
      <circle r="6" fill="${GREEN}" stroke="none"/>
      <path d="M -50 0 a 50 50 0 0 1 100 0"/>
      <path d="M -100 0 a 100 100 0 0 1 200 0" opacity="0.7"/>
      <path d="M -150 0 a 150 150 0 0 1 300 0" opacity="0.45"/>
    </g>

    <!-- libvips SVG doesn't render textPath; place tagline as two straight lines instead -->
    <text x="${cx}" y="${cy - R - 30}" text-anchor="middle"
          class="head" font-size="30" letter-spacing="12" fill="${GREEN}">
      EXPOSURE IS IRREVERSIBLE
    </text>
    <text x="${cx}" y="${cy + R + 50}" text-anchor="middle"
          class="mono" font-size="22" letter-spacing="8" fill="${MUTED}">
      $GL1TCH · NODE 0001
    </text>
    <text x="${cx}" y="${cy + R + 80}" text-anchor="middle"
          class="mono" font-size="18" letter-spacing="6" fill="${MUTED}" opacity="0.7">
      THE SIGNAL DOES NOT ASK PERMISSION TO SPREAD
    </text>
  `);

  const bgFitted = await sharp(bg)
    .resize(w, h, { fit: "cover", position: "center" })
    .modulate({ brightness: 0.75, saturation: 0.3 })
    .toBuffer();
  await sharp(bgFitted)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 94 })
    .toFile(path.join(OUT_DIR, "08-cult-emblem.jpg"));
  console.log("08 ok");
}

const steps = [
  asset01_banner,
  asset02_zerotax,
  asset03_mint,
  asset04_freeze,
  asset05_rugcheck,
  asset06_howtobuy,
  asset07_memetemplate,
  asset08_emblem,
];

for (const s of steps) {
  try { await s(); } catch (e) { console.error(s.name, "FAILED:", e.message); }
}

console.log("\n--- DONE ---");
for (const f of fs.readdirSync(OUT_DIR).sort()) {
  const st = fs.statSync(path.join(OUT_DIR, f));
  console.log(f, (st.size / 1024).toFixed(0) + "KB");
}
