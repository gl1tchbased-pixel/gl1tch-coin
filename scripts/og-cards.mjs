// Share cards (Open Graph + X) with the v3 Glitchy mascot, one per key page, each with its own pose and message.
// Renders an HTML card at 2x in Chrome (brand fonts), downsizes it with ffmpeg (lanczos) and writes Next.js
// file-convention images: src/app/<route>/{opengraph,twitter}-image.jpg + .alt.txt.
//   node scripts/og-cards.mjs            all cards
//   node scripts/og-cards.mjs scan proof just these routes ("root" = the home page)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONTS = path.join(REPO, "src/app/fonts");
const POSES = path.join(REPO, "public/brand/glitchy-v3");

// route: folder under src/app ("" = root). pose: file in public/brand/glitchy-v3 without "glitchy-" and ".png".
const CARDS = [
  { id: "root", route: "", pose: "duo-hero", kicker: "Free token safety scanner", title: ["Scan any token", "before you buy."], sub: "Solana + 15 EVM chains. Plain-English rug-risk verdicts. Never asks for your keys." },
  { id: "scan", route: "scan", pose: "chrome-wave", kicker: "GL1TCH Scanner", title: ["Don't get", "rugged."], sub: "Paste any contract on Solana, Ethereum, Base, BNB and more. Every flag explained in plain language." },
  { id: "proof", route: "proof", pose: "shadow-hero", kicker: "Proof", title: ["Don't trust us.", "Verify us."], sub: "We run the rug scanner on our own token, live, flags included. Every claim links to an independent source." },
  { id: "radar", route: "radar", pose: "chrome-34", kicker: "Rug Radar", title: ["Fresh launches,", "ranked by risk."], sub: "Freshly promoted tokens swept and scored live. Every verdict sealed on Solana." },
  { id: "verify-scan", route: "verify-scan", pose: "shadow-34", kicker: "Verify a verdict", title: ["Sealed on Solana.", "Check it yourself."], sub: "The Merkle proof and the Solana seal are checked in your own browser. No trust in GL1TCH needed." },
  { id: "play", route: "play", pose: "chrome-laugh", tint: "green", kicker: "Rug or Not?", title: ["Spot the rug", "in 8 tokens."], sub: "A 2-minute game with the same flags the GL1TCH scanner reads. Share your rank." },
  { id: "learn", route: "learn", pose: "shadow-wave", tint: "green", kicker: "Learn", title: ["Rug pulls and", "honeypots, explained."], sub: "Free plain-English guides to checking any token before you buy." },
  { id: "token", route: "token", pose: "shadow-wink", kicker: "$GL1TCH", title: ["The honest", "investment case."], sub: "What the token is for, what's live and what's only planned. Every safety tool stays free." },
  { id: "deck", route: "deck", pose: "chrome-hero", kicker: "Grant deck", title: ["Free safety tooling", "for Solana."], sub: "Open source (MIT). Architecture, honest traction, itemized budget and token disclosure." },
  { id: "agents", route: "agents", pose: "chrome-wink", kicker: "Know Your Agent", title: ["Trust scores for", "on-chain AI agents."], sub: "Check an agent wallet's provenance and reputation before you let it near funds." },
  { id: "network", route: "network", pose: "shadow-laugh", tint: "green", kicker: "Signal Network", title: ["The live", "GL1TCH engine."], sub: "Tokens scanned, deployers mapped and rugs caught, updated live." },
  { id: "embed", route: "embed", pose: "chrome-hero", tint: "green", kicker: "Safety badge", title: ["Prove your token", "is clean."], sub: "A live 'Scanned by GL1TCH' badge for your site or README. Free, any chain." },
  { id: "security", route: "security", pose: "shadow-hero", tint: "green", kicker: "Security", title: ["Never a fund or", "approval signature."], sub: "Hardened CSP, rate limits, secret scanning and a public threat model." },
];

const fileUrl = (p) => pathToFileURL(p).href;

function html(card) {
  const duo = card.pose.startsWith("duo");
  const glow = card.tint === "green" ? "124, 255, 79, 0.20" : "122, 60, 255, 0.42";
  const urlPath = card.route ? `/${card.route}` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Tektur; src: url(${fileUrl(path.join(FONTS, "tektur-latin.woff2"))}); font-weight: 400 900; }
  @font-face { font-family: Geist; src: url(${fileUrl(path.join(FONTS, "geist-latin.woff2"))}); font-weight: 100 900; }
  @font-face { font-family: Martian; src: url(${fileUrl(path.join(FONTS, "martian-latin.woff2"))}); font-weight: 100 800; }
  html, body { margin: 0; }
  .c { position: relative; width: 1200px; height: 630px; overflow: hidden; font-family: Geist, sans-serif;
    background:
      radial-gradient(ellipse 560px 460px at ${duo ? "880px 360px" : "930px 330px"}, rgba(${glow}), rgba(0,0,0,0) 72%),
      radial-gradient(ellipse 480px 300px at 200px 120px, rgba(124, 255, 79, 0.06), rgba(0,0,0,0) 70%),
      linear-gradient(180deg, #0a0b10 0%, #07080b 100%); }
  .c::before { content: ""; position: absolute; inset: 0;
    background:
      repeating-linear-gradient(0deg, rgba(245,247,248,.025) 0 1px, transparent 1px 4px),
      linear-gradient(90deg, rgba(245,247,248,.035) 1px, transparent 1px) 0 0 / 60px 60px,
      linear-gradient(0deg, rgba(245,247,248,.035) 1px, transparent 1px) 0 0 / 60px 60px;
    -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.5) 50%, transparent 75%); }
  .m { position: absolute; filter: drop-shadow(0 30px 60px rgba(0,0,0,.55)); }
  .m.single { width: 760px; right: -150px; bottom: -150px; }
  .m.single.turned { width: 640px; right: -30px; bottom: -110px; } /* 3/4 poses face right: keep the face on the card */
  .m.duo { height: 470px; right: -40px; bottom: -90px; }
  .brand { position: absolute; left: 72px; top: 60px; display: flex; align-items: center; gap: 16px; }
  .word { font-family: Tektur; font-weight: 800; font-size: 30px; color: #F5F7F8; letter-spacing: .02em;
    text-shadow: -2px 0 0 rgba(122,60,255,.6), 2px 0 0 rgba(124,255,79,.4); }
  .kick { font-family: Martian; font-size: 15px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; color: #7CFF4F;
    padding: 7px 12px; border: 1px solid rgba(124,255,79,.32); border-radius: 999px; background: rgba(7,8,11,.5); }
  .t { position: absolute; left: 72px; top: 168px; width: 640px; }
  h1 { font-family: Tektur; font-weight: 800; font-size: 72px; line-height: 1; margin: 0; color: #F5F7F8; white-space: nowrap;
    text-shadow: -2px 0 0 rgba(122,60,255,.5), 2px 0 0 rgba(124,255,79,.3); }
  h1 span { display: block; }
  h1 span + span { color: #7CFF4F; text-shadow: none; }
  p { margin: 26px 0 0; font-size: 25px; line-height: 1.4; color: rgba(245,247,248,.74); max-width: 600px; }
  .url { position: absolute; left: 72px; bottom: 56px; font-family: Martian; font-size: 18px; letter-spacing: .04em; color: rgba(245,247,248,.8); }
  .url b { color: #7CFF4F; font-weight: 600; }
  </style></head><body><div class="c">
    <img class="m ${duo ? "duo" : "single"}${card.pose.endsWith("-34") ? " turned" : ""}" src="${fileUrl(path.join(POSES, `glitchy-${card.pose}.png`))}" alt="">
    <div class="brand"><div class="word">GL1TCH</div><div class="kick">${card.kicker}</div></div>
    <div class="t"><h1><span>${card.title[0]}</span><span>${card.title[1]}</span></h1><p>${card.sub}</p></div>
    <div class="url"><b>gl1tchbased</b>.xyz${urlPath}</div>
  </div><script>
    // Shrink the headline until both lines fit the text column (long titles stay on two lines).
    document.fonts.ready.then(() => {
      const h = document.querySelector("h1");
      let size = 72;
      while (h.scrollWidth > 640 && size > 40) h.style.fontSize = --size + "px";
      document.body.dataset.ready = "1";
    });
  </script></body></html>`;
}

const only = process.argv.slice(2);
const cards = only.length ? CARDS.filter((c) => only.includes(c.id)) : CARDS;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-cards-"));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
try {
  for (const card of cards) {
    const htmlPath = path.join(tmp, `${card.id}.html`);
    fs.writeFileSync(htmlPath, html(card));
    await page.goto(fileUrl(htmlPath));
    await page.waitForSelector("body[data-ready]");
    const shot = path.join(tmp, `${card.id}@2x.png`);
    await page.locator(".c").screenshot({ path: shot });
    const dir = path.join(REPO, "src/app", card.route);
    const jpg = path.join(dir, "opengraph-image.jpg");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", shot, "-vf", "scale=1200:630:flags=lanczos", "-q:v", "2", jpg]);
    fs.copyFileSync(jpg, path.join(dir, "twitter-image.jpg"));
    const alt = `GL1TCH ${card.kicker}: ${card.title.join(" ")}`;
    fs.writeFileSync(path.join(dir, "opengraph-image.alt.txt"), alt);
    fs.writeFileSync(path.join(dir, "twitter-image.alt.txt"), alt);
    console.log(`${card.id.padEnd(12)} ${path.relative(REPO, jpg)} (${Math.round(fs.statSync(jpg).size / 1024)} KB)`);
  }
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
