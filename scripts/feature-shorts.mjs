// Feature shorts: 22 s vertical videos for X, Instagram Reels and YouTube Shorts, each showing one GL1TCH feature.
// Built from remotion/features with live data from the site and the bot, the v3 mascot (3D stills + action clips)
// and a procedural soundtrack (scripts/glitchy-sound.mjs).
//   node scripts/feature-shorts.mjs render <feature> [variant] [out.mp4]   one video (default pump-pack/videos/features/)
//   node scripts/feature-shorts.mjs samples                                one video per feature, variant 0
//   node scripts/feature-shorts.mjs plan [YYYY-MM-DD] [days]               e2e/social/campaign-features.json: every 5 h, X + IG + YT
//   node scripts/feature-shorts.mjs list                                   features and their hooks
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { soundtrack } from "./glitchy-sound.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "pump-pack", "videos", "features");
const PUBLIC = path.join(OUT_DIR, "_public");
const SITE = "https://gl1tchbased.xyz";
const BOT = "https://bot.gl1tchbased.xyz";
const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const FPS = 30, FRAMES = 660;

// ---------- live data (every fetch has a fallback, and a fallback is never labelled live) ----------
const getJson = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
};
const stamp = () => new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
const STATUS = { pass: "ok", warn: "warn", fail: "bad" };

async function radarRows() {
  try {
    const j = await getJson(`${SITE}/api/radar`);
    const rows = (j.caught || []).map((c) => ({ name: c.name, symbol: c.symbol, verdict: c.verdict, score: c.score, reason: c.reason, mint: c.mint, chain: c.chain }));
    if (rows.length) return { rows, live: `live · ${stamp()}` };
  } catch { /* fallback below */ }
  return { rows: [{ name: "Example", symbol: "EXAMPLE", verdict: "CAUTION", score: 58, reason: "Top holder: 41%", mint: CA, chain: "solana" }], live: undefined };
}

async function scanDemo(mint, chain = "solana", pick = 6) {
  try {
    const s = await getJson(`${SITE}/api/scan?mint=${mint}&chain=${chain}`);
    const checks = (s.checks || [])
      .filter((c) => c.label)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, pick)
      .map((c) => ({ label: c.label, status: STATUS[c.status] || "unknown", note: String(c.value ?? "").slice(0, 16) }));
    return { kind: "scan", token: { name: s.name || "Token", symbol: s.symbol || "", chain: s.chain || chain, address: s.mint || mint }, verdict: s.verdict, score: s.score, checks, live: `live scan · ${stamp()}` };
  } catch {
    return { kind: "scan", token: { name: "GL1TCH", symbol: "GL1TCH", chain: "solana", address: CA }, verdict: "LOW RISK", score: 88, checks: [{ label: "Mint authority", status: "ok", note: "REVOKED" }, { label: "Freeze authority", status: "ok", note: "REVOKED" }, { label: "Transfer tax", status: "ok", note: "0.00%" }], live: undefined };
  }
}

/** Live scan of a radar token: rank 0 = riskiest, 1 = the next one (so two videos don't show the same token). */
async function riskiestRadarScan(rank = 0) {
  const { rows } = await radarRows();
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  const t = sorted[Math.min(rank, sorted.length - 1)];
  return scanDemo(t.mint, t.chain || "solana");
}

const RPC = "https://api.mainnet-beta.solana.com";
const rpc = async (method, params) => {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(30_000) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
};

/** The newest seal, read from the attester's own history on Solana. Fallback: a seal verified on 25 Oct 2026. */
async function sealDemo() {
  try {
    const { attester } = await getJson(`${BOT}/attest/info`);
    const sigs = await rpc("getSignaturesForAddress", [attester, { limit: 10, commitment: "finalized" }]);
    for (const s of sigs.filter((x) => !x.err)) {
      const tx = await rpc("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "finalized" }]);
      const memo = tx?.transaction?.message?.instructions?.find((i) => i.program === "spl-memo")?.parsed;
      const m = typeof memo === "string" && memo.match(/^gl1tch:radar:v1:([0-9a-f]{64}):(\d+):\d+$/);
      if (m) return { kind: "seal", root: m[1], count: Number(m[2]), sig: s.signature, slot: s.slot, attester, live: `live · ${stamp()}` };
    }
  } catch { /* fallback below */ }
  return { kind: "seal", root: "505ec699f6df9acd9837a32d0c4d6636aa29cc14035050353f75a4c51d9cdd77", count: 40, sig: "5LtLf3f5XBF7rxVYzNd9Sv5NnRfMqiY4WKwNTd3YR67uWDgYqJtkU8ysBnuhJhgU41NwaJB41FDvbWaVSG2mHNJK", slot: 461226967, attester: "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o", live: undefined };
}

async function graphDemo() {
  try {
    const m = await getJson(`${BOT}/signal/metrics`);
    return { kind: "graph", deployers: m.signalGraph.deployers, flagged: m.signalGraph.flaggedActors, live: `live · ${stamp()}` };
  } catch {
    return { kind: "graph", deployers: 1400, flagged: 12, live: undefined };
  }
}

// ---------- the features ----------
// Copy rules: what the product does today, no price talk, no promises; illustrative UI says "your token".
const BOTLINK = "t.me/gl1tch_infected_bot";
const FEATURES = {
  scanner: {
    kicker: "Token scanner",
    hooks: [["Paste any token.", "Get the truth."], ["Before you ape,", "scan it."], ["Is it a rug?", "Know in seconds."]],
    pain: "A clean chart can hide an active mint, a frozen sell or one wallet holding half the supply.",
    benefits: ["Plain-English verdict", "Solana + 15 EVM chains", "Never asks for keys"],
    cta: "gl1tchbased.xyz/scan",
    demo: () => riskiestRadarScan(0),
    x: (h) => `${h[0]} ${h[1]}\n\nMint & freeze authority, liquidity, LP lock, holders, insiders, deployer history. One plain-English verdict, free.\n\ngl1tchbased.xyz/scan`,
  },
  radar: {
    kicker: "Rug Radar",
    hooks: [["It hunts rugs", "while you sleep."], ["Fresh launches,", "ranked by risk."]],
    pain: "Hundreds of tokens launch every day. Most never get checked before people buy.",
    benefits: ["Fresh launches scored", "Riskiest first", "Verdicts sealed on Solana"],
    cta: "gl1tchbased.xyz/radar",
    demo: async () => ({ kind: "radar", ...(await radarRows()) }),
    x: (h) => `${h[0]} ${h[1]}\n\nRug Radar sweeps freshly promoted tokens around the clock and ranks them by risk. Every verdict is sealed on Solana.\n\ngl1tchbased.xyz/radar`,
  },
  watchtower: {
    kicker: "Watchtower",
    hooks: [["Get pinged", "before the rug."], ["Watch a token.", "Sleep better."]],
    pain: "A token can be fine today and dangerous tomorrow: liquidity pulled, insiders loading up.",
    benefits: ["/watch any token", "Alerts in Telegram", "Free for everyone"],
    cta: BOTLINK,
    demo: async () => ({ kind: "alert", app: "watchtower", title: "⚠ $YOURTOKEN got riskier", lines: ["LOW RISK → HIGH RISK", "Liquidity dropped sharply", "Tap for the full scan"] }),
    x: (h) => `${h[0]} ${h[1]}\n\n/watch any token in the GL1TCH Telegram bot and get a ping the moment its safety verdict drops. Free.\n\nt.me/gl1tch_infected_bot`,
  },
  wallet: {
    kicker: "Wallet Watch",
    hooks: [["Know when", "the dev sells."], ["Follow the whale.", "Not the hype."]],
    pain: "Most dumps start with one wallet. By the time the chart shows it, it is too late.",
    benefits: ["Track any wallet", "Whale + dev alerts", "Free in Telegram"],
    cta: BOTLINK,
    demo: async () => ({ kind: "alert", app: "wallet", title: "🐋 Dev wallet moved", lines: ["Sold a big part of $YOURTOKEN", "Just now", "Tap to see the wallet"] }),
    x: (h) => `${h[0]} ${h[1]}\n\nWallet Watch in the GL1TCH Telegram bot pings you when a whale or dev wallet you follow sells or moves out. Free.\n\nt.me/gl1tch_infected_bot`,
  },
  sealed: {
    kicker: "Sealed on Solana",
    hooks: [["Our verdicts", "can't be edited."], ["Don't trust us.", "Verify on-chain."]],
    pain: "Anyone can claim they called a rug. Every GL1TCH Rug Radar verdict is sealed on Solana.",
    benefits: ["A Merkle proof per verdict", "Checked in your browser", "No trust in GL1TCH needed"],
    cta: "gl1tchbased.xyz/verify-scan",
    demo: sealDemo,
    x: (h) => `${h[0]} ${h[1]}\n\nEvery Rug Radar verdict goes into a Merkle tree whose root is sealed on Solana. Check any verdict in your own browser.\n\ngl1tchbased.xyz/verify-scan`,
  },
  graph: {
    kicker: "Signal Graph",
    hooks: [["Serial ruggers", "can't hide."], ["Same dev.", "New token. Flagged."]],
    pain: "Scammers launch from the same wallets again and again. Most scanners forget them after one token.",
    benefits: ["Remembers every deployer", "Flags repeat ruggers", "Grows with every scan"],
    cta: "gl1tchbased.xyz/network",
    demo: graphDemo,
    x: (h) => `${h[0]} ${h[1]}\n\nThe Signal Graph remembers every deployer GL1TCH has scanned, so a wallet with a rug history is flagged on its next launch.\n\ngl1tchbased.xyz/network`,
  },
  proof: {
    kicker: "Proof",
    hooks: [["We scan", "our own token."], ["Don't trust us.", "Verify us."]],
    pain: "Most projects ask for trust. We run our own scanner on $GL1TCH, live, flags included.",
    benefits: ["Live self-scan", "Receipts on Solscan", "Flags shown, not hidden"],
    cta: "gl1tchbased.xyz/proof",
    demo: () => scanDemo(CA, "solana", 6),
    x: (h) => `${h[0]} ${h[1]}\n\nWe run the GL1TCH scanner on $GL1TCH itself, live, flags included, and link every claim to an independent source.\n\ngl1tchbased.xyz/proof`,
  },
  badge: {
    kicker: "Safety badge",
    hooks: [["Show buyers", "you're clean."], ["Your token.", "Our verdict. Live."]],
    pain: "Buyers check before they buy. Put the answer on your own site, and keep it honest.",
    benefits: ["Updates itself", "One line of HTML", "Free, any chain"],
    cta: "gl1tchbased.xyz/embed",
    demo: async () => ({ kind: "badge", token: "$YOURTOKEN", verdict: "LOW RISK", score: 86 }),
    x: (h) => `${h[0]} ${h[1]}\n\nAdd a live "Scanned by GL1TCH" badge to your site or README. It updates with your token's verdict and links to the full scan.\n\ngl1tchbased.xyz/embed`,
  },
  play: {
    kicker: "Rug or Not?",
    hooks: [["Can you", "spot the rug?"], ["8 tokens.", "Find the rugs."]],
    pain: "Eight made-up tokens. The same red flags our scanner reads. Two minutes.",
    benefits: ["Learn the red flags", "A 2-minute game", "Share your rank"],
    cta: "gl1tchbased.xyz/play",
    demo: async () => ({ kind: "game", cards: [
      { name: "MOONCAT", flags: ["Mint authority: active", "Top holder: 62%", "LP: unlocked"], answer: "RUG" },
      { name: "STEADY", flags: ["Mint authority: revoked", "LP: burned", "Holders: spread out"], answer: "SAFE" },
      { name: "TURBO9", flags: ["Freeze authority: active", "Transfer tax: 25%", "Deployer: 3 past rugs"], answer: "RUG" },
    ] }),
    x: (h) => `${h[0]} ${h[1]}\n\nRug or Not?: eight made-up tokens, the same red flags the GL1TCH scanner reads. Call SAFE or RUG, learn why, share your rank.\n\ngl1tchbased.xyz/play`,
  },
  android: {
    kicker: "Android prototype",
    hooks: [["Share a link.", "Get a verdict."], ["Found it in a chat?", "Scan it first."]],
    pain: "Spotted a token in a group chat? Share the link to GL1TCH and see the risk before you open a wallet.",
    benefits: ["Works from any app", "Read-only wallet scan", "No transaction to sign"],
    cta: "gl1tchbased.xyz",
    demo: async () => {
      const { rows } = await radarRows();
      const t = rows[Math.floor(rows.length / 2)] || rows[0];
      return { kind: "phone", token: (t.symbol || t.name || "TOKEN").slice(0, 10), verdict: t.verdict, score: t.score };
    },
    x: (h) => `${h[0]} ${h[1]}\n\nOur Android prototype: share a pump.fun link from any app and GL1TCH scans it on arrival. Read-only, no transaction to sign.\n\ngl1tchbased.xyz`,
  },
  honeypot: {
    kicker: "Trap check",
    hooks: [["Can you", "actually sell?"], ["Buy-only tokens", "are real."]],
    pain: "Some tokens let you buy and never sell. The trap is in the contract, not the chart.",
    benefits: ["Freeze authority checked", "Hidden transfer tax found", "Plain-English why"],
    cta: "gl1tchbased.xyz/scan",
    demo: () => riskiestRadarScan(1),
    x: (h) => `${h[0]} ${h[1]}\n\nGL1TCH checks freeze authority, hidden transfer taxes and honeypot signals before you buy, and tells you why in plain English.\n\ngl1tchbased.xyz/scan`,
  },
  multichain: {
    kicker: "Any chain",
    hooks: [["Solana.", "And 15 EVM chains."], ["One scanner.", "Every chain you trade."]],
    pain: "Ethereum, Base, BNB Chain, Arbitrum, Polygon and more. One plain-English verdict for each.",
    benefits: ["Solana deep scan", "15 EVM chains via GoPlus", "Same verdict format"],
    cta: "gl1tchbased.xyz/scan",
    demo: () => scanDemo("0x6982508145454Ce325dDbE47a25d4ec3d2311933", "ethereum", 6),
    x: (h) => `${h[0]} ${h[1]}\n\nSolana natively, plus 15 EVM chains: Ethereum, Base, BNB Chain, Arbitrum, Polygon and more. One plain-English verdict each.\n\ngl1tchbased.xyz/scan`,
  },
};

const POSES = {
  chrome: ["glitchy-chrome-34.png", "glitchy-chrome-hero.png", "glitchy-chrome-laugh.png", "glitchy-chrome-wave.png", "glitchy-chrome-wink.png"],
  shadow: ["glitchy-shadow-34.png", "glitchy-shadow-hero.png", "glitchy-shadow-laugh.png", "glitchy-shadow-wave.png", "glitchy-shadow-wink.png"],
};
const ACTIONS = ["wave", "laugh", "hop", "spin", "wink", "lookaround"];
const STYLES = ["pop", "type", "glitch"];
const HASHTAGS = "#solana #crypto #memecoin #rugpull #cryptosafety #web3 #defi #GL1TCH";

function seeded(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Every visual choice for one video, from (feature, variant). */
function look(feature, variant) {
  const r = seeded(`${feature}-${variant}`);
  const fam = (variant + Math.floor(r() * 2)) % 2 ? "shadow" : "chrome";
  const action = ACTIONS[Math.floor(r() * ACTIONS.length)];
  return {
    hook: FEATURES[feature].hooks[variant % FEATURES[feature].hooks.length],
    pose: POSES[fam][Math.floor(r() * POSES[fam].length)],
    clip: `${fam}-${action}.mp4`,
    action,
    fam,
    layout: r() < 0.5 ? "left" : "right",
    tint: r() < 0.6 ? "purple" : "green",
    hookStyle: STYLES[(variant + Math.floor(r() * 3)) % 3],
  };
}

export function captions(feature, variant) {
  const F = FEATURES[feature], h = look(feature, variant).hook;
  const title = `${h[0]} ${h[1]} | GL1TCH #Shorts`.slice(0, 100);
  return {
    x: F.x(h),
    ig: `${h[0]} ${h[1]}\n\n${F.pain}\n\n✅ ${F.benefits.join("\n✅ ")}\n\n🔗 ${F.cta} (link in bio)\nNot financial advice. Always DYOR.\n\n${HASHTAGS}`,
    ytTitle: title,
    ytDesc: `${F.pain}\n\n${F.benefits.map((b) => `• ${b}`).join("\n")}\n\nTry it free: https://${F.cta}\n\nGL1TCH is a free, open-source token safety scanner. Not financial advice. Always DYOR.\n\n${HASHTAGS} #Shorts`,
  };
}

// ---------- rendering ----------
function ensurePublic() {
  for (const d of ["fonts", "mascot", "clips"]) fs.mkdirSync(path.join(PUBLIC, d), { recursive: true });
  const copy = (src, dst) => { if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst); };
  for (const f of ["tektur-latin.woff2", "geist-latin.woff2", "martian-latin.woff2"]) copy(path.join(ROOT, "src/app/fonts", f), path.join(PUBLIC, "fonts", f));
  for (const f of [...POSES.chrome, ...POSES.shadow]) copy(path.join(ROOT, "public/brand/glitchy-v3", f), path.join(PUBLIC, "mascot", f));
  for (const fam of ["chrome", "shadow"]) for (const a of ACTIONS) copy(path.join(ROOT, "pump-pack/videos/glitchy-v3", `${fam}-${a}.mp4`), path.join(PUBLIC, "clips", `${fam}-${a}.mp4`));
}

let bundled = null;
async function serveUrl() {
  if (!bundled) {
    ensurePublic();
    bundled = await bundle({ entryPoint: path.join(ROOT, "remotion/features/index.tsx"), publicDir: PUBLIC });
  }
  return bundled;
}

function cues(props, L) {
  const t = (fr) => fr / FPS;
  const c = [{ type: "reveal", t: 0 }, { type: "title", t: t(10) }, { type: "title", t: t(26) }];
  for (const cut of [100, 200, 480, 565]) c.push({ type: "glitch", t: t(cut - 2) });
  if (props.demo.kind === "scan") {
    const per = (280 - 110) / Math.max(props.demo.checks.length, 1);
    props.demo.checks.forEach((_, i) => c.push({ type: "tag", t: t(250 + i * per) }));
    c.push({ type: "bar", t: t(400) });
  } else if (props.demo.kind === "radar") for (let i = 0; i < 5; i++) c.push({ type: "tag", t: t(230 + i * 22) });
  else if (props.demo.kind === "seal") c.push({ type: "flash", t: t(360) });
  else c.push({ type: "tag", t: t(240) }, { type: "tag", t: t(300) });
  for (let i = 0; i < 3; i++) c.push({ type: "tag", t: t(484 + i * 8) });
  const who = L.fam === "chrome" ? "ch" : "sh";
  if (["laugh", "wave", "hop", "spin", "wink"].includes(L.action)) c.push({ type: L.action, t: t(572), who });
  c.push({ type: "end", t: t(600) });
  return c;
}

async function propsFor(feature, variant) {
  if (!FEATURES[feature]) throw new Error(`unknown feature "${feature}" (${Object.keys(FEATURES).join(", ")})`);
  const F = FEATURES[feature], L = look(feature, variant);
  return { L, props: {
    id: `${feature}-${variant}`,
    kicker: F.kicker,
    hook: L.hook,
    pain: F.pain,
    demo: await F.demo(),
    benefits: F.benefits,
    cta: F.cta,
    pose: L.pose,
    clip: L.clip,
    layout: L.layout,
    tint: L.tint,
    hookStyle: L.hookStyle,
  } };
}

/** Six stills of one video side by side (hook · pain · demo ×2 · benefits · CTA), for review without a full render. */
async function preview(feature, variant = 0) {
  const { props } = await propsFor(feature, variant);
  const url = await serveUrl();
  const comp = await selectComposition({ serveUrl: url, id: "feature-short", inputProps: props });
  const dir = path.join(OUT_DIR, "_preview");
  fs.mkdirSync(dir, { recursive: true });
  const frames = [60, 160, 300, 440, 540, 630];
  const files = [];
  for (const fr of frames) {
    const file = path.join(dir, `${feature}-${variant}-${fr}.png`);
    await renderStill({ composition: comp, serveUrl: url, output: file, frame: fr, inputProps: props, scale: 1 / 3 });
    files.push(file);
  }
  const sheet = path.join(dir, `${feature}-${variant}.png`);
  spawnSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `hstack=${files.length}`, sheet]);
  for (const f of files) fs.rmSync(f, { force: true });
  console.log(`preview ${path.relative(ROOT, sheet)}`);
}

export async function render(feature, variant = 0, out = path.join(OUT_DIR, `${feature}-${variant}.mp4`)) {
  const { props, L } = await propsFor(feature, variant);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const url = await serveUrl();
  const comp = await selectComposition({ serveUrl: url, id: "feature-short", inputProps: props });
  const silent = out.replace(/\.mp4$/, ".silent.mp4"), wav = out.replace(/\.mp4$/, ".wav");
  await renderMedia({ composition: comp, serveUrl: url, codec: "h264", crf: 18, outputLocation: silent, inputProps: props, concurrency: 4 });
  soundtrack(cues(props, L), FRAMES / FPS, wav, props.id);
  const mux = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
  if (mux.status !== 0) throw new Error(`ffmpeg mux failed: ${mux.stderr}`);
  fs.rmSync(silent, { force: true });
  fs.rmSync(wav, { force: true });
  console.log(`✓ ${path.relative(ROOT, out)}  (${props.hookStyle}, ${L.pose}, ${L.clip}, ${props.demo.live ? "live data" : "static data"})`);
  return out;
}

// ---------- campaign plan: a post every 5 h (Istanbul 09:30 · 14:30 · 19:30 · 00:30, quiet 02–09) ----------
const TIMES = ["09:30", "14:30", "19:30", "00:30"];
const ORDER = ["scanner", "radar", "proof", "watchtower", "sealed", "play", "graph", "honeypot", "badge", "wallet", "multichain", "android"];
function plan(startDay, days) {
  const slots = [];
  let n = 0;
  const seen = {};
  for (let d = 0; d < days; d++) {
    const day = new Date(`${startDay}T00:00:00+03:00`);
    day.setUTCDate(day.getUTCDate() + d);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(day);
    for (const hm of TIMES) {
      // 00:30 belongs to the next calendar day
      let date = ymd;
      if (hm === "00:30") { const nx = new Date(`${ymd}T12:00:00+03:00`); nx.setUTCDate(nx.getUTCDate() + 1); date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(nx); }
      const feature = ORDER[n % ORDER.length];
      const variant = (seen[feature] = (seen[feature] ?? -1) + 1);
      const key = `${date.replaceAll("-", "")}-${hm.replace(":", "")}`;
      const video = `pump-pack/videos/features/${key}-${feature}.mp4`;
      const cap = captions(feature, variant);
      const render = { feature, variant };
      const at = (min) => { const t = new Date(`${date}T${hm}:00+03:00`); t.setUTCMinutes(t.getUTCMinutes() + min); return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(t).replace(" ", "T"); };
      slots.push({ id: `fx-${key}`, platform: "x", at: at(0), media: [video], tweets: [cap.x], render });
      slots.push({ id: `fi-${key}`, platform: "instagram", at: at(5), video, caption: cap.ig, render });
      slots.push({ id: `fy-${key}`, platform: "youtube", at: at(10), video, title: cap.ytTitle, desc: cap.ytDesc, render });
      n++;
    }
  }
  const file = path.join(ROOT, "e2e/social/campaign-features.json");
  fs.writeFileSync(file, JSON.stringify({ name: "GL1TCH feature shorts", timezone: "Europe/Istanbul", strategy: "One feature video every 5 h (09:30, 14:30, 19:30, 00:30 Istanbul) on X, Instagram Reels and YouTube Shorts; rendered with live data just before it posts.", slots }, null, 1));
  console.log(`plan: ${slots.length / 3} videos, ${slots.length} posts → ${path.relative(ROOT, file)}`);
}

// ---------- cli ----------
const [cmd = "list", a, b, c] = process.argv.slice(2);
if (cmd === "render") await render(a, Number(b || 0), c ? path.resolve(c) : undefined);
else if (cmd === "samples") for (const f of Object.keys(FEATURES)) await render(f, 0);
else if (cmd === "preview") for (const f of a === "all" || !a ? Object.keys(FEATURES) : a.split(",")) await preview(f, Number(b || 0));
else if (cmd === "plan") plan(a || new Date(Date.now() + 864e5).toISOString().slice(0, 10), Number(b || 14));
else if (cmd === "list") for (const [k, F] of Object.entries(FEATURES)) console.log(k.padEnd(11), F.hooks.map((h) => h.join(" ")).join(" | "));
else throw new Error(`unknown command ${cmd}`);
