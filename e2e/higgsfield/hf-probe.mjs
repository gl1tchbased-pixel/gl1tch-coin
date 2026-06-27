// Step 2 — discovery. Visits candidate generation routes and dumps every
// interactive element (buttons, inputs, textareas, links, [role], aria-labels,
// data-* hooks) to out/hf-probe-<route>.json + a flat text summary. Claude reads
// these to write accurate selectors for hf-generate.mjs — the SPA can't be
// scripted blind.
//   HF_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/higgsfield/hf-probe.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launchHF, OUT_DIR } from './lib/launch.mjs';

const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/create', '/image', '/video', '/dashboard', '/generate'];

const { context, page } = await launchHF();

const EXTRACT = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const desc = (el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || undefined,
    role: el.getAttribute('role') || undefined,
    name: el.getAttribute('name') || undefined,
    placeholder: el.getAttribute('placeholder') || undefined,
    aria: el.getAttribute('aria-label') || undefined,
    text: (el.innerText || el.value || '').trim().slice(0, 60) || undefined,
    id: el.id || undefined,
    testid: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
    cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 80) : undefined,
    visible: vis(el),
  });
  const sel = 'button, a, textarea, input, select, [role="button"], [role="textbox"], [contenteditable="true"], [data-testid]';
  return [...document.querySelectorAll(sel)].map(desc).filter((d) => d.visible);
};

const safe = (r) => r.replace(/[^a-z0-9]/gi, '_') || 'root';

for (const route of ROUTES) {
  const url = route.startsWith('http') ? route : `https://higgsfield.ai${route}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500); // let the SPA hydrate
    const finalUrl = page.url();
    const els = await page.evaluate(EXTRACT);
    const out = { route, requestedUrl: url, finalUrl, count: els.length, elements: els };
    const base = path.join(OUT_DIR, `hf-probe-${safe(route)}`);
    fs.writeFileSync(`${base}.json`, JSON.stringify(out, null, 2));
    const lines = els.map((e) => {
      const parts = [e.tag, e.type, e.role && `role=${e.role}`, e.testid && `testid=${e.testid}`,
        e.placeholder && `ph="${e.placeholder}"`, e.aria && `aria="${e.aria}"`, e.text && `txt="${e.text}"`]
        .filter(Boolean).join(' | ');
      return `  ${parts}`;
    });
    fs.writeFileSync(`${base}.txt`, `${route} -> ${finalUrl}  (${els.length} els)\n${lines.join('\n')}\n`);
    console.log(`[probe] ${route} -> ${finalUrl}  (${els.length} interactive els) saved`);
  } catch (err) {
    console.warn(`[probe] ${route} FAILED: ${err.message?.split('\n')[0]}`);
  }
}

console.log(`\n[probe] Done. Reports in: ${OUT_DIR}`);
await context.close();
process.exit(0);
