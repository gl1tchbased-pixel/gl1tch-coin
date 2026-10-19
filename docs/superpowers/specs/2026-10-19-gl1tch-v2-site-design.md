# GL1TCH v2: Site Yeniden Tasarım Spec'i

- **Tarih:** 19 Ekim 2026
- **Durum:** Kararlar verildi. Her fazın uygulanması ve yayını **kurucunun açık talimatını bekler**.
- **Görsel plan:** https://claude.ai/artifact/2y6nDC9rrQ69TpSrggZDaM
- **Çalışan prototip (kod referansı):** [assets/2026-10-19-gl1tch-v2-prototype.html](assets/2026-10-19-gl1tch-v2-prototype.html). İçinde 6 sahnenin, oyunun, rozetlerin, sesin ve dashboard grafiklerinin tamamı var. Repo içinde açılırsa `img/...` görselleri ve `./js/glitchy-engine.js` importu çözülmez. Kodu okumak ve taşımak için kullan, çalıştırmak için değil.
- **Yerini aldığı belge:** kökteki `claude_code_web_site_geli_tirme_raporu_oku`. Bu belge onun düzeltilmiş ve uygulanabilir halidir. O raporun DexScreener'lı "Görev 1" kodu ve cüzdan, OG ve `/scan` iddiaları geçersizdir; bkz. §11.

---

## 1. Amaç ve neden

gl1tchbased.xyz, $GL1TCH'in ürün yüzü: çok zincirli token tarayıcı, Rug Radar, Agent Trust, Quantum Core, Proof. Ürün güçlü, site ise üç şekilde zayıf kalıyor:

1. **Güveni zedeleyen yanlış durumlar var.** Bir güvenlik markası için en pahalı hata, yanlış bir "canlı" etiketi. Örnekler: lansman öncesi taslak gösteren `/dashboard`, 14 aylık bir CURBy turuna "Live" demek, "Team %5" ile "no team allocation" çelişkisi.
2. **Görsel olarak düz.** Her şey aynı düz yeşil, hiyerarşi yok, sistem fontu kullanılıyor, kartlar tek tip. Kurucu "daha canlı, ilgi çekici, premium" istiyor.
3. **Ürün geç başlıyor, eğlence yok.** Ana sayfa 16 bölüm (masaüstünde 15.134 px, mobilde 23.892 px). Tarama kutusu fold'da değil. Meme coin topluluğunun paylaşacağı bir an yok.

Başarı şöyle görünür: ziyaretçi ilk ekranda ürünü kullanır (token tarar ve tepki görür). Her rakam kaynağını ve tazeliğini söyler. Site Glitchy'nin 3D kalitesinde görünür. İnsanlar oyunu oynayıp skorunu paylaşır.

## 2. Hedefler, hedef olmayanlar, anti-hedefler

### Hedefler

- Faz 0'da tüm doğruluk hataları düzelir; sitede eski veya uydurma bir değer "canlı" görünmez.
- Neon görsel sistem: tam doygun marka renkleri, parlama, aurora, self-host fontlar, net buton ve kart hiyerarşisi.
- Glitchy motoru üzerinde 3D sahneler: hero (Signal Core + Glitchy), Risk Orb, rütbe paraları, Signal Graph 3D, entropi alanı, oyun sahnesi.
- Ana sayfa 8 bölüm. Tarama kutusu hero'da; hızlı karar satır içinde, tam rapor linkle.
- Herkese açık "Signal Network" paneli, gerçek veriyle.
- Eğlence: Rug or Not? (`/play`), rozetler, ses, gizli kod, imleç izi, skor paylaşım kartı.

### Hedef olmayanlar

- Yeni ürün özelliği: tarama mantığı, skor algoritması ve bot tarafı değişmez. Signal Graph 3D, botun mevcut ve herkese açık `/signal/serial` ve `/signal/deployer` uç noktalarını okur.
- Saklamalı (custody) özellik, ödül havuzu, token ekonomisi değişikliği.
- Yeni UI/3D kütüphanesi (R3F, Tailwind, chart kütüphanesi). Mevcut `three@0.170.0` ve `src/lib/glitchy/engine.js` yeterli.
- Site dili: İngilizce kalır.

### Anti-hedefler

Bunlardan biri olursa, teknik olarak çalışsa bile başarısızlık sayılır:

- Örnek veya mock bir değerin üretimde gerçek ya da canlı gibi görünmesi.
- Gerçek bir token veya cüzdan için "rug yaptı", "scammer" gibi suçlayıcı ifade. Bot zaten olasılıksal dil kullanıyor (`DeployerReputation.note`); site de öyle kalacak.
- Magenta, camgöbeği veya pembe. Bu, kurucunun önceki kararı ve hâlâ geçerli. Yeşil↔mor arasında yumuşak geçiş (lerp) aradaki tonu camgöbeğine çeker; bkz. §5.1.
- 3D'nin içeriği engellemesi: LCP'nin 3D'ye bağlı olması, okunması gereken metnin titremesi, mobilde takılma.
- "Kurucu %3,57 tutuyor" gibi eski ve yanlış bir iddianın tekrar görünmesi. Deployer'ın 20.08.2026'daki tam çıkışı açıklanmış durumda ve öyle kalır.

## 3. Kısıtlar

- **Next.js 16.** Bu sürüm eğitim verisinden farklı; kod yazmadan önce `node_modules/next/dist/docs/` içindeki ilgili rehberi oku (AGENTS.md). Font için: `01-app/01-getting-started/13-fonts.md` ve `03-api-reference/02-components/font.md`. `localFont`, `next/font/local`'dan gelir; `src`, çağrıldığı dosyaya göre çözülür.
- **Build sırasında ağ çağrısı yok.** `src/styles/tokens.css` bu kuralı koyuyor. Fontlar `next/font/google` ile değil, repoya konan woff2 dosyalarıyla ve `next/font/local` ile yüklenir.
- **Yayın.** Site yalnızca yerelden `npx vercel --prod --yes` ile yayınlanır; GitHub'a push yayın yapmaz. Her yayın kurucunun açık onayıyla.
- **Git.** Her faz kendi branch'inde (`feat/v2-faz-N`). Commit, PR ve merge kurucu istediğinde yapılır.
- **Marka.** Renkler `#7CFF4F` Signal, `#7A3CFF` Glitch, `#F5F7F8` Static. Glitchy için `public/brand/glitchy-*-t.png` (transparan) ve 3D motoru kullanılır, siyah zeminli PNG'ler UI'da kullanılmaz.
- **Erişilebilirlik.** Metin kontrastı ≥ 4.5:1. Görünür focus. `prefers-reduced-motion` açıksa 3D sabit kare, glitch ve sarsıntı kapalı. Ses varsayılan olarak kapalı. Oyun klavyeyle oynanabilir.
- **Performans bütçesi** (mobil, Faz 0'da ölçülen baz çizgiye göre):
  - LCP ≤ 2,5 sn ve her zaman metin; 3D sonradan yüklenir.
  - CLS ≤ 0,05.
  - Sahne başına ≤ ~25 KB gzip kod (three hariç).
  - Piksel oranı en fazla 1,6 (mobilde 1,35).
  - Ekran dışındaki sahne render etmez.
  - Bir sayfada aynı anda en fazla 3 WebGL bağlamı.

## 4. Kararlar

Kurucu bu kararları bana bıraktı (19.10.2026). Gerekçeler aşağıda.

| # | Konu | Karar | Neden |
|---|---|---|---|
| K1 | Palet | **Neon:** üç marka rengi, tam doygunluk, parlama ve aurora. Altın ürün arayüzüne girmez. Tüm "eğlence/ödül" renkleri tek bir `--fun` token'ından okunur ve şimdilik Signal'e eşittir. | Kurucu "daha canlı" istedi; marka kuralları ise yeni ton istemiyor. Altın ileride tek token değişikliğiyle eklenebilir. |
| K2 | Hero | **Signal Core ve Chrome Glitchy birlikte.** Tarama kutusu hero'da. | Ürünü (tarama) ve markayı (Glitchy) ilk ekranda birleştiriyor. v3 Glitchy, eski 2D maskottan farklı olarak premium. |
| K3 | Eğlence | **Hepsi:** oyun, rozetler, ses, gizli kod, imleç izi, skor kartı. Kısıtlar: ses varsayılan kapalı, imleç izi yalnızca masaüstünde, oyunda yalnızca kurgusal token'lar (§9.1). | Her parça bir şey öğretiyor ve paylaşılabilir. Kurgusal deste, gerçek token'lara yanlış hüküm verme riskini sıfırlar. |
| K4 | Sıra | **0 → 1 → 2 → 3 → 4 → 5.** Her faz ayrı talimatla başlar ve ayrı onayla yayınlanır. | Önce güven, sonra temel, sonra gösteriş. Her faz tek başına geri alınabilir. |
| K5 | Dashboard | **`/dashboard` → `/network`** (kalıcı, 308). Yeni "Signal Network" paneli `/network`'te yaşar. Eski kurucu içeriği (`src/content/dashboard.ts`) kaldırılır. | İki benzer sayfa yerine tek, herkese açık ve doğru bir sayfa. `/network` zaten footer'da ve canlı metrik çekiyor. |
| K6 | Tokenomics | **Kavramsal dağılım kaldırılır.** Yerine gerçek durum gelir: Pump.fun fair launch ve canlı holder dağılımı. | `tokenomics.ts` yorumu dağılımın kavramsal (Path B) olduğunu söylüyor. Lansman Path A ile yapıldı. "Team %5", whitepaper ve FAQ'daki "no team allocation" ile çelişiyor. |
| K7 | CURBy | **Etiket düzeltilir, politika korunur.** CURBy'nin kendi `/round/latest` uç noktası 19.10.2026'da hâlâ 22.08.2025 tarihli tur 28297'yi veriyor. Tur 24 saatten eskiyse "Last round · tarih · source paused" yazılır, yeşil nokta sönüktür. Ödüllü çekilişler sessizce drand'e geçmez; CURBy dönene kadar "paused" gösterilir. | Site "quantum yalnızca ödüllü çekilişleri sürer, drand onları asla düşürmez" diyor. Bu sözü sessizce bozmak, eski etiketten daha kötü olur. |
| K8 | Fontlar | **Tektur** (display), **Geist** (gövde), **Martian Mono** (veri). Hepsi OFL. Latin ve latin-ext alt kümeleri. | Her cihazda aynı ses. Tektur'un köşeli kesimi "glitch" karakterine uyuyor. |
| K9 | Header | `Products ▾` (Scanner, Rug Radar, Agent Trust, Quantum Core, Network), Proof, Live, Play, Whitepaper. Tek buton: "Join the Infected" (Telegram). Hero'daki ikinci "Join" kaldırılır. | 7 eşit link ve 2 buton yerine net bir hiyerarşi. |
| K10 | Hero taraması | Gönderince `/api/scan` çağrılır, karar satır içinde gösterilir ve 3D tepki verir. Altında "Full report →" `/scan/[token]`'a gider. | "Ürün fold'da" hedefini gerçekten karşılıyor. |

## 5. Görsel sistem (Faz 1)

### 5.1 Renk token'ları

Bunlar `src/styles/tokens.css`'e eklenir. Mevcut isimler (`--color-signal`, `--text-muted` vb.) CSS modüllerini kırmamak için **korunur** ve yeni değerlere eşlenir.

```css
/* yüzeyler (gece moru, hafif mor eğilim) */
--void:#07060D; --ob1:#0E0C18; --ob2:#151223; --ob3:#1D1930; --ob4:#272240;
--line:rgba(196,176,255,.10); --line2:rgba(196,176,255,.19);
/* signal */
--signal:#7CFF4F; --signal-ink:#B4FF96; --signal-mid:#4CAA2E; --signal-edge:#3A8A2A; --signal-deep:#13300D;
/* glitch */
--glitch:#7A3CFF; --glitch-hot:#9B66FF; --glitch-ink:#B99BFF; --glitch-mid:#9C74F2; --glitch-edge:#4A2C93; --glitch-deep:#1F1340;
/* metin */
--static:#F5F7F8; --ink2:#C3C1D3; --ink3:#9592AB; --ink4:#5F5B78; /* ink4 yalnızca süs, metin değil */
/* durum */
--warn:#E5B454; --bad:#F2555A;   /* CLEAN 80–100 · CAUTION 50–79 · HIGH RISK 0–49 */
/* eğlence/ödül (K1: şimdilik signal) */
--fun:var(--signal); --fun-ink:var(--signal-ink);
--glow:1;  /* parlama çarpanı; 0 = parlamasız */
```

Eşleme: `--color-void`→`--void`, `--color-surface`→`--ob1`, `--color-surface-elevated`→`--ob2`, `--color-graphite`→`--ob3`, `--text-secondary`→`--ink2`, `--text-muted`→`--ink3`, `--text-faint`→`--ink3`. `--text-faint` metin için kullanılıyor; `--ink4` olursa kontrast düşer, o yüzden `--ink3`'e eşlenir.

Kontrast (`#07060D` zeminde): static ≈18:1, ink2 ≈11,5:1, ink3 ≈6,8:1, glitch-ink ≈8,9:1, signal-ink ≈17:1. Saf `#7A3CFF` ≈3,8:1, yani yalnızca büyük yazı ve ikon.

### Kurallar

- **Işık önem demektir.** Ekran başına tek dolu ve parlayan yeşil buton. Eyebrow ve başlıklar yeşil değil.
- **Mor derinlik demektir.** Quantum, üst rütbeler, 3D arka ışık, aurora.
- **Degrade vurgu demektir.** Başlıkta en fazla bir-iki kelime. Paragraf metni her zaman düz renk.
- **Yeşil ile mor arasında doğrudan geçiş yapılmaz** (CSS gradient, shader `mix`, vertex color, grafik rampası). Biri karanlığa söner, öteki karanlıktan doğar. Prototipte entropi alanı ve plazma çekirdeği bu şekilde düzeltildi.
- Grafik kategorik paleti, renk körlüğü doğrulayıcısından geçti (koyu zemin #0B0B10): `#4CAA2E, #7A3CFF, #8E9B2A, #9C74F2, #3A8A2A`. İki komşu arasında tritan ΔE 6,1 (taban bandı), bu yüzden etiket ve dilim arası boşluk zorunlu.

### 5.2 Atmosfer

- **Aurora:** sabit (fixed) arka planda üç büyük radial-gradient blob (mor sağ üst, yeşil sol orta, mor sağ alt). `filter: blur(90px)`, 26–38 sn'lik yavaş drift. Reduced-motion açıksa durur. Örnek: prototipteki `.aurora`.
- **Kart katmanları:**
  - Varsayılan kart: `--ob1`, ince çizgi.
  - Öne çıkan kart: degrade kenarlık; yeşilden şeffafa, şeffaftan mora. Ortada ton karışımı yok.
  - Seçili/hover: `--glitch-edge` kenarlık ve mor gölge.
- **Butonlar:**
  - `primary`: yeşil degrade, 1px iç çizgi ve yeşil gölge; hover'da 1px yukarı.
  - `ghost`: şeffaf zemin; hover'da mor.
  - `danger` ve `safe`: yalnızca oyunda.

### 5.3 Tipografi

- Font dosyaları `src/app/fonts/` altına konur, lisans dosyaları yanına. `layout.tsx`'te `localFont` ile CSS değişkenleri tanımlanır: `--font-display`, `--font-body`, `--font-mono`. `display: 'swap'`; fallback metrikleri ayarlanır (CLS).
- Ölçek mevcut `--fs-*` ile aynı. Hero için `clamp(40px, 5.2vw, 70px)`, Tektur 800, satır yüksekliği .98.
- Mono etiketler: Martian Mono 10,5–12 px, harf aralığı .08–.14em, büyük harf.
- RGB kayması (glitch) yalnızca logo, hover, açılışta bir kez ve gizli kodda kullanılır.

### 5.4 Bileşen işleri (Faz 1)

- `Button` ve `Card` varyantları (§5.2), `Badge`'den durum çipleri (ok, warn, bad, vio, fun, neutral).
- `Header`: Products açılır menüsü. Masaüstünde hover/focus ile, mobilde mevcut overlay içinde akordeon. Her ürünün yanında küçük canlı veri: Scanner için tarama sayısı, Radar için son tarama zamanı; veri yoksa hiç gösterilmez.
- `LiveMarket`: `···` yerine iskelet; aynı boyutta kutular, nabız animasyonu yok, hafif shimmer. Reduced-motion açıksa düz.

## 6. 3D mimarisi

### 6.1 Ortak katman

- **Motor:** `src/lib/glitchy/engine.js` içindeki `GlitchyStage` her sahnenin renderer'ıdır. Bloom, stüdyo PMREM ortamı, vinyet, gren ve bokeh buradan gelir. Karakterli sahneler `stage.add('chrome' | 'shadow', …)` kullanır. Karaktersiz sahneler kendi objelerini `stage.scene`'e ekler ve `scene.environment = stage.env` yapar.
- **React sarmalayıcı:** `src/components/three/SceneStage.tsx` (yeni). `src/components/glitchy/GlitchyStage.tsx`'in kalıbını genelleştirir:
  - IntersectionObserver ile ekrana yaklaşınca dinamik import.
  - Yüklenene kadar PNG poster.
  - Ekran dışında ve arka plan sekmesinde render durur.
  - ResizeObserver.
  - Reduced-motion açıksa tek kare.
  - Sayfa genelinde imleç takibi: mevcut `screenAnchor` ve `track` mantığı paylaşılır.
- **Sahne modülleri:** `src/lib/scenes/<ad>.ts`. Her biri `mount(stage, host, opts) → { update(t, dt), dispose(), api }` döner. Prototipteki fonksiyonlar (`heroScene`, `riskOrb`, `rankCoins`, `signalGraph`, `entropy`, `gameScene`) neredeyse aynen taşınır. Ortak yardımcılar `src/lib/scenes/fx.ts` içinde: `Burst` (voksel patlaması), `Sparks`, glow/ring/star dokuları, simplex noise GLSL.
- **Renk okuma:** Sahneler renkleri sabit kodlamaz; `src/lib/scenes/palette.ts`'ten okur. Değerler §5.1 ile aynı, `--fun` dahil.
- **Bloom kuralı:** Parlaması istenen yüzey HDR renk alır (renk × 1,5–3). Bloom eşiği ~1,0. Gerisi düz kalır.

### 6.2 Sahneler

| Sahne | Yer | Davranış | Veri | Yedek |
|---|---|---|---|---|
| **Signal Core + Glitchy** | Ana sayfa hero | Cam küre içinde dönen plazma, krom jiroskop halkaları, radar plakası, tarama kanadı. Radar geçerken token "gem"leri parlıyor; kırmızılar işaretli kalıyor, şok halkası ve voksel kopuyor. Chrome Glitchy yanında; işaretlenen düğüme bakıyor, konuşma balonu, tıklanınca tepki. Hero taraması: CLEAN → konfeti ve `laugh`; CAUTION → `wink`; HIGH RISK → kırmızı plazma, sarsıntı ve `glitch`. | **Prototipteki sayaçlar ve adresler sahte; üretimde kullanılmaz.** Radar düğümleri son gerçek Rug Radar taramasının token'larıdır (`/api/radar`); renkleri skor bandına göre, kırmızı işaret yalnızca HIGH RISK için. HUD "Last Rug Radar sweep · N scanned · M flagged" der ve sweep zamanını gösterir; taramayı tekrarlıyormuş gibi artan sayaç yok. Toplam tarama sayısı `networkMetrics()`'ten. Hero taraması gerçek `/api/scan` sonucuyla tepki verir. Radar verisi gelmezse düğümler nötr ve etiketsiz döner. | Poster PNG. Reduced-motion açıksa sabit kare ve sarsıntı yok. |
| **Risk Orb** | `/scan/[token]` sonuç kartı başlığı | Skor yükseldikçe pürüzsüz cam ve yeşil kıvılcım; düştükçe diken, kırmızı, voksel kopması, kesik glitch. Normal, yer değiştirmenin sonlu farkıyla hesaplanır (prototipte var). | Mevcut tarama skoru. | Statik skor rozeti (bugünkü). |
| **Rütbe paraları** | `/ranks`, Why Hold (`/token`) | 5 malzeme: grafit, anodize yeşil, krom, iridesan mor, cam. Neon yazı emissive map'te. Hover'da öne gelir, tıklayınca çevrilir ve kıvılcım saçar. Cüzdan bağlıysa kullanıcının rütbesi öne çıkar ve ışığı artar. | Eşikler `src/lib/ranks.ts`'ten (test ile senkron). Kullanıcı rütbesi `RankChecker`'dan. | Bugünkü tablo. |
| **Signal Graph 3D** | `/network` | Mor düğümler deployer, küçükler token. Bir deployer'ın üstüne gelince onun alt grafiği parlar, diğerleri söner. Çok işaretli deployer nabız atar, sürükleyerek çevrilir. | Bot `/signal/serial?min=2`; detay için `/signal/deployer`. Tooltip'te kısaltılmış adres, `flaggedCount/tokensSeen` ve `note` (olasılıksal dil). | `SignalLeaderboard` (bugünkü liste). |
| **Entropi alanı** | `/quantum-core` hero | drand quicknet her 3 sn'de tur atar: alan çöker, ışık halkası yayılır, yeni turun hash'inden yeniden kurulur. | Canlı drand: `src/lib/quantum/drand.ts`. Tur ve kısaltılmış değer HUD'da. | Statik kare ve tur numarası. |
| **Rug or Not? sahnesi** | `/play` (Faz 4) ve ana sayfadaki davet kartı | Shadow Glitchy sunucu. Ortada token parası dönüyor; cevaptan sonra SAFE/RUG damgası, yeşil/kırmızı ışık, voksel. Doğru → `laugh`/`hop`, seri ≥ 3 → `spin`; yanlış → `glitch`. Konuşma balonları var. | Kurgusal deste (§9.1). | Kart arayüzü 3D'siz de tam çalışır. |

## 7. Ana sayfa ve rotalar (Faz 2)

**Yeni sıra** (`src/app/page.tsx`):

1. **Hero:** Signal Core + Glitchy, başlık "It Reads Every Rug.", tarama kutusu, üç örnek buton, kanıt satırı.
2. **Kanıt şeridi:** canlı fiyat, RugCheck skoru, mint/freeze revoked, 0% vergi. StatsCounter ve LiveMarket'in özeti; detay `/live`'da.
3. **Ürünler bento:** Scanner, Rug Radar, Agent Trust, Quantum Core (5 bileşen tek sabitten). Her kartta canlı mini veri. QuantumShowcase ve AgentBanner buraya katlanır.
4. **Rug Radar akışı:** son 6 tarama ve "Rug or Not?" davet kartı. Davet kartında 3D sahne yok, Shadow Glitchy posteri var; ana sayfanın WebGL sayısı böylece 3'te kalır (hero, paralar, Glitchy bölümü).
5. **Proof:** canlı öz-tarama, açık cüzdanlar, "neyi saklamıyoruz". SecurityScan ve TrustWall burada birleşir. Terminal satırları baştan görünür, tarama ışığı üzerlerinden geçer.
6. **Rütbeler:** 3D paralar ve gerçek arz özeti (K6).
7. **Glitchy ve topluluk:** mevcut MeetGlitchy ve Community.
8. **SSS ve son çağrı:** en çok sorulan 6 soru ve tek buton.

### Taşınanlar

- Roadmap → yeni `/roadmap` (içerik `src/content/roadmap.ts`; görsel zaman çizelgesi ve durum çipleri: shipped, live, planned).
- Manifesto → `/thesis` (zaten var; ana sayfadan çıkar).
- How to Buy → `/token`. Arz bölümü `/token` sayfasında `id="supply"` alır.
- `FOOTER_LINKS`'te `/#roadmap` → `/roadmap`, `/#tokenomics` → `/token#supply`.

**Hero taraması** (K10): Giriş adres veya isim olabilir. `/api/scan`'in mevcut sözleşmesini ve oran sınırını kontrol et. Sonuç gelene kadar "Scanning…" ve radar hızlanır. Hata durumunda sade bir mesaj gösterilir, Glitchy `wink` yapar. Sonuç satırı "CLEAN 90/100 · Full report →" şeklindedir.

**İmleç izi:** Yalnızca hero'da, `(hover: hover) and (pointer: fine)` ve reduced-motion kapalıyken. En fazla 140 piksel parçacığı; Canvas 2D, ayrı ve `pointer-events: none` katman.

## 8. Signal Network paneli (Faz 3, `/network`)

### 8.1 Yerleşim
Sıra prototipteki gibi (önce özet, sonra ayrıntı): KPI şeridi, fiyat grafiği ve öz-tarama, Rug Radar · Quantum beacon · arz, ağ metrikleri.

### 8.2 Veri eşlemesi

| Kart | Kaynak | Not |
|---|---|---|
| Price, 24h, Market cap, Volume, Liquidity | `fetchMarket` (`src/lib/market.ts`) | Likidite yoksa "Thin pool" ve warn çipi; "—" yok. |
| Holders, Trust score, kontroller | Öz-tarama (`src/lib/scan.ts`, `ProofScan`'in kullandığı yol) | Top holder havuzsa "pool" etiketi. |
| Fiyat grafiği | GeckoTerminal OHLCV, mevcut havuz için 15 dk mumlar | SVG ile çizilir (prototipteki `priceChart`): uç nokta vurgusu, crosshair ve tooltip. Kütüphane yok. Rate limit ve önbelleği builder belirler. |
| Rug Radar | `/api/radar` | Skor çubuğu ve durum çipi. |
| Quantum beacon | drand (`drand.ts`) ve CURBy `latestPulse` | K7 tazelik kuralı. |
| Arz | Fair launch açıklaması ve canlı holder dağılımı | K6. Kavramsal yüzdeler yok. |
| Ağ | `networkMetrics()` (`src/lib/network.ts`): `scans.total/flagged`, `signalGraph.deployers/serialDeployers`, `agents.registered` | Gerçek tarama hacmi buradan; prototipteki boş kart gerçek veriyle dolar. |
| Sosyal | — | Gerçek API yok, **kart hiç gösterilmez**. |

### 8.3 Tazelik kuralı (tüm kartlar)

- Her kart `updatedAt` taşır.
- Yaş, beklenen yenileme süresinin iki katını geçerse yeşil nokta söner ve "stale · ss:dd" yazar.
- Veri hiç gelmezse kart tasarlanmış bir boş duruma geçer: neyin, nereden geleceğini söyler, rakam uydurmaz.

### 8.4 Kart eğimi
KPI kartlarında imlece göre ±9–11° perspektif eğimi. Yalnızca hover destekleyen cihazlarda, reduced-motion kapalıyken.

## 9. Eğlence (Faz 4)

### 9.1 Rug or Not? (`/play`)

- **Deste:** 16–24 kurgusal token, haftada bir 8'lik deste dönüşümlü seçilir. Her kart: ticker, kısaltılmış adres, mint, freeze, LP kilitli %, top holder % (havuz bayrağıyla), vergi, deployer geçmişi, doğru cevap ve bir cümlelik ders. İçerik `src/content/play.ts`'te, test edilebilir saf veri olarak. Prototipteki 8 kart başlangıç noktası; bir kart bilinçli tuzak (havuz %97,8 → SAFE, Proof sayfasıyla aynı ders).
- **Gerçek token yok.** Ticker'lar kurgusal ve "kurgusal token" çipi taşır. Gerçek Radar verisiyle bir mod bu spec'in dışında; ileride ancak "doğru cevap = tarayıcının kararı" çerçevesiyle ve suçlayıcı dil kullanmadan düşünülebilir.
- **Akış:** tur/skor/seri başlığı, kart, SAFE/RUG (klavye: S, R, Enter), açıklama ve satır renklendirmesi, sonuç ekranı.
- **Rütbe unvanı:** 8 → "Ghost Node detective", 6–7 → Core Node, 4–5 → Signal Bearer, ≤3 → Observer.
- **Paylaşım:** `/play/r/[score]` (0–8, `generateStaticParams`) ve kendi `opengraph-image.tsx`'i (Glitchy PNG, skor, unvan). Sonuç ekranında "Share on X" butonu skor sayfası linkini taşır.

### 9.2 Rozetler
Beş rozet: First scan, Rug Hunter (oyunda 3 rug), Flawless (8/8), Collector (5 parayı çevir), Secret code.

- v1 tarayıcıda `localStorage`'da tutulur (try/catch; yoksa oturum boyu).
- Header'da küçük sayaç; kazanınca toast ve piksel rozet.
- Cüzdana bağlı rozet duvarı bu spec'in dışında.

### 9.3 Ses

- WebAudio ile kodla üretilir, dosya yok. Efektler: ping, rug, clean, warn, coin, right, wrong, ach, glitch, pop.
- Varsayılan kapalı. Header'da "Sound" açma/kapama; tercih `localStorage`'da.
- Radar pingleri en az 1,2 sn aralıkla.

### 9.4 Gizli kod

- Input dışında klavyeden `glitch` yazmak veya logoya 700 ms içinde 5 kez tıklamak tetikler.
- 1,5 sn sayfa glitch'i: RGB kayması, tarama çizgileri, küçük titreme. Bütün Glitchy'ler `spin`/`glitch` yapar, "Secret code" rozeti açılır.
- Reduced-motion açıksa yalnızca rozet ve toast.

## 10. Fazlar ve kabul kriterleri

> Her faz kurucunun talimatıyla başlar. Bitince kontroller çalışır, sonuç raporlanır ve yayın için ayrıca onay beklenir.

**Faz 0 · Doğruluk** (küçük)

- `/dashboard` → `/network` 308 yönlendirmesi (`next.config.ts` `redirects`; önce Next 16 dokümanına bak). `src/content/dashboard.ts` ve dashboard sayfası kaldırılır.
- CURBy tazelik etiketi (K7), "Live CURBy" gösteren her yerde: `grep -rn "CURBy" src`.
- "Four/Five components": tek sabit (5 bileşen), iki metin de oradan okur.
- Tokenomics (K6): `allocations` kaldırılır, gerçek fair launch metni ve canlı dağılım gelir. FAQ ve whitepaper ile çelişki kalmaz; `content.test.ts`'e bir tutarlılık testi eklenir.
- Kontrast: `--text-muted` → `rgba(245,247,248,.62)` (≈7,2:1), `--text-faint` → `rgba(245,247,248,.5)` (≈4,9:1).
- Baz çizgi: `/`, `/scan`, `/network` için mobil Lighthouse; sonuçlar bu dosyanın sonuna eklenir.
- **Kabul:** sitede tarihi geçmiş veya kavramsal bir değer "canlı" ya da gerçek gibi görünmüyor; testler yeşil.

**Faz 1 · Neon temel** (orta)

- §5'in tamamı: token'lar ve eşleme, aurora, fontlar, buton/kart/çip varyantları, Products menüsü, LiveMarket iskeleti.
- **Kabul:** 15 sayfa masaüstü ve mobilde görsel olarak bozulmuyor; metin kontrastı ≥ 4.5:1; font yüklemesi CLS üretmiyor; yeşil↔mor doğrudan geçiş yok.

**Faz 2 · Ana sayfa ve hero** (büyük)

- `SceneStage`, `fx.ts`, `palette.ts`, `signalCore` sahnesi, Glitchy hero, hero taraması (K10), imleç izi, 16 → 8 bölüm, `/roadmap`, footer linkleri.
- **Kabul:** LCP metin ve ≤ 2,5 sn (mobil); hero taraması gerçek sonuçla tepki veriyor; reduced-motion'da sabit; ana sayfa ≤ ~8.000 px (masaüstü).

**Faz 3 · Panel ve tarama** (büyük)

- `/network` Signal Network (§8), Risk Orb `/scan/[token]`'da.
- Risk Orb OG görseli: `next/og` WebGL çizemez. Bu yüzden 3 bant (clean, caution, high) için Risk Orb'un hareketsiz kareleri Playwright ile `public/brand/orb/*.png` olarak üretilir; `scripts/glitchy-render.mjs` yöntemiyle aynı. Mevcut tarama OG kartı bunları kullanır.
- **Kabul:** her kartın kaynağı ve tazeliği görünür; tazelik kuralı test edilir (saf fonksiyon + vitest); uydurma rakam yok.

**Faz 4 · Eğlence** (orta)

- §9'un tamamı: `/play`, deste içeriği ve testi, rozetler, ses, gizli kod, `/play/r/[score]` OG, ana sayfadaki davet kartı, header'da Play linki.
- **Kabul:** oyun klavyeyle oynanıyor; deste testi doğru cevapları kurallara göre doğruluyor; ses varsayılan kapalı; paylaşım kartı 9 skor için üretiliyor.

**Faz 5 · 3D genişleme** (orta)

- Rütbe paraları (`/ranks`, `/token`), Signal Graph 3D (`/network`, gerçek bot verisi), entropi alanı (`/quantum-core`, canlı drand), arz halkası (gerçek dağılım).
- **Kabul:** bir sayfada en fazla 3 WebGL bağlamı; ekran dışında render yok; Signal Graph tooltip'leri olasılıksal dilde.

### Her fazın sonunda

- `npm run build`, `npm test` (vitest), `npm run lint`.
- 15 sayfanın masaüstü (1440) ve mobil (390) ekran görüntüleri; bu planın denetimindeki Playwright yöntemi, `scripts/` altına kalıcı bir script olarak.
- Mobil Lighthouse ve baz çizgiyle karşılaştırma.
- Kurucuya kısa rapor: ne değişti, ölçümler, bilinen sorunlar. Yayın onayı istenir.

## 11. Eski raporun düzeltmeleri (kayıt)

| Eski rapor | Gerçek | Bu spec'te |
|---|---|---|
| Cüzdan bağlantısı yok | `ConnectWallet`, `Providers`, `/ranks`'te `RankChecker` var | Yok |
| `/scan` statik demo | Çok zincirli gerçek tarayıcı; `/scan/[token]`, `/scan/compare` var | Risk Orb (Faz 3) |
| OG kartı yok | Var; tarama ve çekiliş başına dinamik | Risk Orb kareleri ve oyun kartı |
| reduced-motion yetersiz | 22 kullanım var | Yeni 3D'de de zorunlu |
| Market `···` kalıyor | İlk veri gelene kadar | İskelet (Faz 1) |
| Görev 1 DexScreener kodu | Market katmanı zaten çok kaynaklı; DexScreener çifti listeden çıkardı | **Uygulanmaz** |
| Yeşil fazla, CTA zayıf | Doğru | §5, K9 |
| Mobil menü sıkışık | Menü çalışıyor; asıl sorun uzunluk | §7 |

## 12. Builder'a bırakılanlar

- Dosya ve bileşen isimleri (yukarıdakiler öneri), CSS modül yapısı, animasyon süreleri ve easing.
- Prototipten taşırken performans sadeleştirmeleri: parçacık sayıları, geometri detayı, mobil düşürmeleri. Görsel sonuç korunmalı.
- GeckoTerminal ve `/api/scan` için önbellek ve oran sınırı stratejisi.
- Metin ince ayarları; markanın dürüst, kuru ve hafif alaycı sesi korunur.
- Test kapsamı: en az tazelik kuralı, deste doğruluğu, tokenomics/FAQ tutarlılığı ve rütbe eşikleri (var olan test).

## 13. Bilinen riskler ve izlenecekler

- **CURBy duraklamış.** 19.10.2026'da `/api/curbyq/round/latest` hâlâ 22.08.2025 tarihli tur 28297'yi döndürüyor. Ödüllü çekilişler CURBy'ye bağlı olduğu için şu an tamamlanamaz. K7 bunu dürüstçe gösterir; kaynak dönerse etiket kendiliğinden "live" olur. Politika değişikliği (ör. drand'e geçiş) kurucu kararıdır, bu spec'te yok.
- **Font lisansları:** Tektur, Geist ve Martian Mono'nun OFL lisans dosyaları repoya eklenmeli; indirme sırasında sürüm ve lisans kontrol edilir.
- **WebGL bellek:** Ana sayfada hero, paralar ve Glitchy bölümü üç bağlam eder. Düşük donanımda sahneler poster'a düşmeli (`WebGLRenderer` hatası yakalanır).
- **Bot uç noktaları:** `/signal/serial` ve `/signal/deployer` herkese açık ve önbellekli. Yanıt şekli Faz 5 öncesi gerçek veriyle doğrulanır; yanıt boşsa Signal Graph yerine liste gösterilir.

## 14. Ölçümler

Baz çizgi: 19.10.2026, Faz 0 yayınından önceki canlı site. Lighthouse 12.2.1, mobil emülasyon, performans kategorisi, tek ölçüm.

| Sayfa | LCP (mobil) | CLS | TBT | FCP | Perf skoru |
|---|---|---|---|---|---|
| `/` | 1,8 sn | 0 | 1.950 ms | 1,7 sn | 66 |
| `/scan` | 3,8 sn | 0 | 840 ms | 1,5 sn | 62 |
| `/network` | 3,4 sn | 0 | 450 ms | 1,3 sn | 73 |

Notlar:

- `/scan` ve `/network`, §3'teki LCP ≤ 2,5 sn bütçesini bugün de aşıyor. Faz 2–3 bunları düşürmeli; en azından kötüleştirmemeli.
- Ana sayfanın TBT'si yüksek (1,95 sn). Muhtemel sebepler: ilk yüklemedeki JS (cüzdan adaptörleri, animasyonlar). Faz 2'de 3D eklenmeden önce, ana sayfa için yüklenen JS'in kaynağı ölçülmeli.

### 14.1 Faz 0–5 sonrası (canlı, 19.10.2026)

Aynı yöntem: Lighthouse 12.2.1, mobil emülasyon, performans, tek ölçüm, `gl1tchbased.xyz`.

| Sayfa | LCP (mobil) | CLS | TBT | FCP | Perf skoru |
|---|---|---|---|---|---|
| `/` | 2,3 sn | 0 | 460 ms | 1,7 sn | 82 |
| `/scan` | 4,2 sn | 0 | 590 ms | 1,4 sn | 68 |
| `/network` | 3,1 sn | 0 | 720 ms | 1,4 sn | 74 |

Notlar:

- İlk v2 yayınında ana sayfa 46 puana düştü (TBT 9,6 sn): her 3D motor açılışı yükleme penceresinde tek bir çok saniyelik ana iş parçacığı görevi oluyordu. Çözüm `src/lib/three-gate.ts`: sahneler `load` olayından sonra (en geç 5 sn), birer birer, boşta açılır; telefonlarda ve düşük güçlü cihazlarda ziyaretçinin ilk dokunuşuna, kaydırmasına ya da tuşuna kadar poster gösterilir.
- `/network`'te drand turunun BLS doğrulaması ~1,4 sn (yavaşlatılmış CPU) sürüyordu. Doğrulama artık Web Worker'da (`drand-verify.worker.ts`); worker yoksa boşta çalışır. "BLS-verified" etiketi yine yalnızca gerçek kontrolden sonra görünür.
- Hero posteri artık önceden yüklenmiyor (LCP öğesi başlık metni); Martian Mono da önceden yüklenmiyor.
- `/scan` LCP'si baz çizginin 0,4 sn üstünde (yeni yazı tipleri). `/network`'ün TBT'si 270 ms yüksek. İkisi de skoru düşürmüyor; sonraki iyileştirme adayları.
- WebGL: hiçbir sayfada 2'den fazla bağlam yok (`scripts/site-shots.mjs` raporu).
