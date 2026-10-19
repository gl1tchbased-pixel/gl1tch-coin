// Renders the Risk Orb (src/lib/scenes/riskOrb.js on the Glitchy engine) as stills for the scan
// share card: assets/orb/orb-{ok,warn,bad}.png. next/og can't draw WebGL, so the card composes
// these. Background matches the card (#050505) so the orb sits in it seamlessly.
//   node scripts/orb-stills.mjs
import { chromium } from "playwright";
import http from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const out = path.join(root, "assets", "orb");
mkdirSync(out, { recursive: true });

const SHOTS = [
  { kind: "ok", score: 92 },
  { kind: "warn", score: 64 },
  { kind: "bad", score: 16 },
];

// the edge fade is baked in so the square never shows against the card
const page = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#050505}#w{position:relative;width:600px;height:600px}canvas{display:block;width:600px;height:600px}#w::after{content:"";position:absolute;inset:0;background:radial-gradient(circle closest-side,transparent 72%,#050505 100%)}</style>
<div id="w"><canvas id="c" width="600" height="600"></canvas></div>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import { GlitchyStage } from "/src/lib/glitchy/engine.js";
import { mount } from "/src/lib/scenes/riskOrb.js";
window.render = async (score) => {
  const canvas = document.getElementById("c");
  const stage = new GlitchyStage(canvas, { background: "#050505", grain: 0, bokeh: false, floor: false, bloom: [0.75, 0.5, 1.0], pixelRatio: 2 });
  stage.backdrop?.scale.setScalar(2);
  stage.scene.environment = stage.env;
  const s = mount({ stage, host: canvas, reduced: false, mobile: false, pointer: { x: 0, y: 0, active: false }, ui: {}, options: { score } });
  stage.setSize(600, 600); s.resize(600, 600); s.api.setScore(score);
  for (let i = 0; i < 150; i++) { s.update(i / 30, 1 / 30); stage.step(1 / 30); }
  stage.render();
  return true;
};
window.ready = true;
</script>`;

const types = { ".js": "text/javascript", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (url === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(page); }
  // bare relative imports inside scene files ("./fx") resolve to extension-less paths
  let file = url.startsWith("/three/") ? path.join(root, "node_modules", url) : path.join(root, url);
  if (!existsSync(file) && existsSync(file + ".js")) file += ".js";
  if (!existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(5179, r));

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const s of SHOTS) {
  const p = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  await p.goto("http://localhost:5179/");
  await p.waitForFunction(() => window.ready === true);
  await p.evaluate((score) => window.render(score), s.score);
  await p.waitForTimeout(300);
  await p.locator("#w").screenshot({ path: path.join(out, `orb-${s.kind}.png`) });
  console.log("wrote", `assets/orb/orb-${s.kind}.png`);
  await p.close();
}
await browser.close();
server.close();
