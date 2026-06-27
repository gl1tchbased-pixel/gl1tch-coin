// Stage 2 — Analyze your own posts + reach (basic).
// Uses the saved logged-in session to read your recent posts and their metrics
// (replies / reposts / likes / bookmarks / views) straight from the DOM, then
// writes a JSON dump + a human-readable markdown report with growth advice.
//
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='test'; npm run x:analyze
//
// Gentle by design: own profile only, <=15 posts, randomized human-paced scroll.
import fs from 'node:fs';
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { S, parseMetricsAria } from './lib/selectors.mjs';
import { jitter } from './lib/prompt.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { OUT_DIR, PUMP_PACK_DIR, DATA_DIR, X_HANDLE, dateStamp } from './lib/paths.mjs';

const MAX_POSTS = 15;
const MAX_SCROLLS = 25;

function loadTargets() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'targets.json'), 'utf8'));
  } catch {
    return { tier1: [], tier2: [], tier3: [] };
  }
}

function engagementScore(p) {
  // Weighted engagement; views excluded from the numerator (used as denominator).
  return p.replies * 3 + p.reposts * 4 + p.likes * 1 + p.bookmarks * 2;
}

function hourOf(iso) {
  if (!iso) return null;
  // Display in Istanbul time to match the posting window in the plan.
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

const { context, page } = await launchX();
const stamp = dateStamp();

try {
  // Guard: make sure we're actually logged in.
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    console.error('✗ Oturum yok. Önce: npm run x:login');
    process.exitCode = 1;
  } else {
    console.log(`[analyze] @${X_HANDLE} profili okunuyor...`);
    await page.goto(`https://x.com/${X_HANDLE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(jitter());

    // Follower count snapshot.
    let followers = null;
    try {
      const followText = await page.locator(S.followLink).first().innerText({ timeout: 5000 });
      const m = followText.match(/([\d,.]+)\s*([KM]?)/i);
      if (m) {
        let n = Number(m[1].replace(/[,.]/g, ''));
        if (/k/i.test(m[2])) n *= 1000;
        if (/m/i.test(m[2])) n *= 1_000_000;
        followers = n;
      }
    } catch { /* header layout varies; skip if not found */ }

    const results = [];
    const seen = new Set();
    let scrolls = 0;
    let stalls = 0;

    while (results.length < MAX_POSTS && scrolls < MAX_SCROLLS && stalls < 3) {
      const before = results.length;
      const articles = await page.locator(S.tweet).all();

      for (const art of articles) {
        if (results.length >= MAX_POSTS) break;

        const permalink = await art.locator(S.statusLink).first().getAttribute('href').catch(() => null);
        const id = permalink?.match(/\/status\/(\d+)/)?.[1];
        if (!id || seen.has(id)) continue;
        // Only the account's own posts (not reposts/replies surfaced in timeline).
        if (permalink && !permalink.toLowerCase().includes(`/${X_HANDLE.toLowerCase()}/`)) continue;
        seen.add(id);

        const text = (await art.locator(S.tweetText).first().innerText().catch(() => '')).trim();
        const ts = await art.locator(S.time).first().getAttribute('datetime').catch(() => null);
        const pinned = await art.locator(S.socialContext).first().innerText().catch(() => '');
        const isPinned = /pinned/i.test(pinned || '');

        // Aggregated metric aria-label (full counts).
        let aria = '';
        const group = art.locator('div[role="group"]').last();
        aria = (await group.getAttribute('aria-label').catch(() => '')) || '';
        const metrics = parseMetricsAria(aria);

        results.push({
          id,
          url: permalink ? `https://x.com${permalink}` : null,
          text,
          postedAt: ts,
          hourIstanbul: hourOf(ts),
          pinned: isPinned,
          ...metrics,
        });
      }

      if (results.length === before) stalls += 1; else stalls = 0;
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(jitter());
      scrolls += 1;
    }

    console.log(`[analyze] ${results.length} post toplandı.`);

    // ---- Write raw JSON ----
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const jsonPath = path.join(OUT_DIR, `x-scrape-${X_HANDLE}-${stamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ handle: X_HANDLE, stamp, followers, posts: results }, null, 2));

    // ---- Follower trend vs previous run ----
    const trendPath = path.join(OUT_DIR, `follower-trend-${X_HANDLE}.json`);
    let trend = [];
    try { trend = JSON.parse(fs.readFileSync(trendPath, 'utf8')); } catch { trend = []; }
    const prev = trend.length ? trend[trend.length - 1] : null;
    if (followers != null) {
      trend.push({ stamp, followers });
      fs.writeFileSync(trendPath, JSON.stringify(trend, null, 2));
    }
    const followerDelta = (followers != null && prev) ? followers - prev.followers : null;

    // ---- Rankings ----
    const ranked = [...results]
      .filter((p) => !p.pinned)
      .sort((a, b) => engagementScore(b) - engagementScore(a));

    const byHour = {};
    for (const p of results) {
      if (!p.hourIstanbul) continue;
      (byHour[p.hourIstanbul] ??= { posts: 0, eng: 0, views: 0 });
      byHour[p.hourIstanbul].posts += 1;
      byHour[p.hourIstanbul].eng += engagementScore(p);
      byHour[p.hourIstanbul].views += p.views;
    }

    // ---- Markdown report ----
    const targets = loadTargets();
    const md = buildReport({ handle: X_HANDLE, stamp, followers, followerDelta, results, ranked, byHour, targets });
    const mdPath = path.join(PUMP_PACK_DIR, `x-analysis-${stamp}.md`);
    fs.writeFileSync(mdPath, md);

    console.log(`\n✓ JSON:   ${jsonPath}`);
    console.log(`✓ Rapor:  ${mdPath}`);
    if (followers != null) console.log(`✓ Takipçi: ${followers}${followerDelta != null ? ` (Δ ${followerDelta >= 0 ? '+' : ''}${followerDelta})` : ''}`);
  }
} catch (err) {
  console.error('✗ Analyze hatası:', err.message?.split('\n')[0]);
  process.exitCode = 1;
} finally {
  await context.close();
}

function buildReport({ handle, stamp, followers, followerDelta, results, ranked, byHour, targets }) {
  const fmt = (n) => n.toLocaleString('en-US');
  const top = ranked.slice(0, 5);
  const hours = Object.entries(byHour).sort((a, b) => b[1].eng - a[1].eng);
  const allTargets = [...(targets.tier1 || []), ...(targets.tier2 || []), ...(targets.tier3 || [])];

  const lines = [];
  lines.push(`# X Analiz — @${handle} (${stamp})`);
  lines.push('');
  lines.push(`> Otomatik üretildi (Stage 2, temel). Kaynak: giriş yapmış oturumdan DOM scrape, ${results.length} post.`);
  lines.push('');
  lines.push('## Özet');
  lines.push(`- **Takipçi:** ${followers != null ? fmt(followers) : 'okunamadı'}${followerDelta != null ? ` (önceki çalıştırmaya göre **${followerDelta >= 0 ? '+' : ''}${followerDelta}**)` : ''}`);
  lines.push(`- **Toplanan post:** ${results.length}`);
  const totalViews = results.reduce((s, p) => s + p.views, 0);
  const totalEng = results.reduce((s, p) => s + engagementScore(p), 0);
  lines.push(`- **Toplam görüntülenme:** ${fmt(totalViews)} · **toplam ağırlıklı etkileşim:** ${fmt(totalEng)}`);
  lines.push(`- **Ort. etkileşim/görüntülenme:** ${totalViews ? (totalEng / totalViews * 100).toFixed(2) : '0'}%`);
  lines.push('');

  lines.push('## En iyi 5 post (ağırlıklı etkileşime göre)');
  lines.push('');
  lines.push('| # | Etkileşim | 👁 Görüntülenme | 💬 | 🔁 | ❤️ | 🔖 | Saat (IST) | Metin |');
  lines.push('|---|-----------|----------------|----|----|----|----|-----------|-------|');
  top.forEach((p, i) => {
    const snip = (p.text || '').replace(/\n+/g, ' ').slice(0, 60).replace(/\|/g, '\\|');
    lines.push(`| ${i + 1} | ${engagementScore(p)} | ${fmt(p.views)} | ${p.replies} | ${p.reposts} | ${p.likes} | ${p.bookmarks} | ${p.hourIstanbul || '—'} | ${snip}… |`);
  });
  lines.push('');

  lines.push('## Saat × etkileşim (hangi saatte atılan post tuttu)');
  lines.push('');
  if (hours.length) {
    lines.push('| Saat (IST) | Post | Toplam etkileşim | Toplam görüntülenme |');
    lines.push('|------------|------|------------------|---------------------|');
    for (const [h, v] of hours) {
      lines.push(`| ${h}:00 | ${v.posts} | ${v.eng} | ${fmt(v.views)} |`);
    }
  } else {
    lines.push('_Zaman verisi okunamadı._');
  }
  lines.push('');

  lines.push('## Kitle-genişletme önerileri');
  lines.push('');
  lines.push('Mevcut darboğaz **erişim** (görüntülenme düşükse organik menzil yok demektir). Reach\'i büyütmenin tek ücretsiz yolu reply dağıtımı — kendi feed\'in değil, hedef hesapların kalabalığı.');
  lines.push('');
  lines.push('**Bu hafta reply hedef listesi** (`e2e/x/data/targets.json`):');
  lines.push('');
  if (allTargets.length) {
    lines.push(allTargets.map((h) => `\`@${h}\``).join(' · '));
  } else {
    lines.push('_targets.json boş — doldur._');
  }
  lines.push('');
  lines.push('**Aksiyon:**');
  lines.push('1. En iyi 5 postun ortak yönünü çoğalt (tür/saat) — yukarıdaki tabloya bak.');
  lines.push('2. En iyi saat dilimine orijinal post yığ; düşük saatleri bırak.');
  lines.push('3. `npm run x:campaign` ile hedef hesaplara reply sprint yap (asıl reach kaldıracı).');
  lines.push('4. Görüntülenme yüksek ama etkileşim düşük postlarda CTA zayıf — kanca/soru ekle.');
  lines.push('');
  return lines.join('\n');
}
