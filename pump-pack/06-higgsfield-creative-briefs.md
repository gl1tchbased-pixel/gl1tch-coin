# 06 — Görsel / Video Creative Briefs

> **Higgsfield durumu:** şu an `free` plan, **0 kredi**. Üretim için ya plan yükselt
> (claude.ai/higgsfield) ya da brief'leri Midjourney/Sora/Runway/nano-banana'ya
> yapıştır. Her brief tek-prompt + alternatif prompt + virality notu içerir.

## Marka kuralları (tüm görseller)

- **Palet**: derin siyah (#0A0A0A), terminal-yeşili sinyal vurgusu (#5BFF8F gibi),
  kromatik glitch kırmızı/cyan (#FF3B3B / #00E5FF) — *az* kullan.
- **Tipografi**: mono / terminal stili. Sans-serif değil.
- **Estetik**: premium, minimal, *yorgun-fütüristik* (cyberpunk değil — daha temiz).
  CRT scanline overlay'i hafif. Bol nefes alanı.
- **Yasak**: emoji, abartılı sticker, lazer gözler, "to the moon", neon overdose,
  Wojak. Bunlar projeyi *ucuzlatır*.

---

## Asset 1 — Pinned X Cover Visual (1500×500)

**Konsept:** Düşmüş bir CRT monitör; ekranda tek satır terminal yazısı:
"$GL1TCH // SIGNAL DETECTED" — arka planda hafif scanline + chromatic split.

**Prompt (nano-banana-pro / Midjourney):**
```
Wide cinematic banner 3:1, abandoned CRT monitor sitting on a black concrete floor,
the screen shows a single line of monospace green text "$GL1TCH // SIGNAL DETECTED",
faint scanlines, subtle chromatic aberration, deep matte black background, single
distant light source, premium minimal cyber aesthetic, high contrast, photographic
realism, no text other than the monitor display, no logos, no people
```

**Tek satır alt başlık (banner üstüne overlay):**
```
THE SIGNAL DOES NOT ASK PERMISSION TO SPREAD.
```

---

## Asset 2 — "Trust Wall" Carousel (1:1, 4 görsel)

X carousel (4 slayt). Her slayt tek bir trust noktası, büyük rakam + tek cümle.

| Slayt | Görsel | Üst yazı (büyük) | Alt yazı (mono küçük) |
|---|---|---|---|
| 1 | Yeşil bir sinyal noktası, etrafında halkalar | `0%` | TAX · BUY & SELL |
| 2 | Bir anahtar siluetinin *yok olması* | `NULL` | MINT AUTHORITY · REVOKED |
| 3 | Buz/kar kristali → kırılmış | `NULL` | FREEZE AUTHORITY · REVOKED |
| 4 | Büyük "1" rakamı, etrafında küçük ✓ ✓ ✓ | `1` | RUGCHECK SCORE · 0 RISKS |

**Prompt template (her slayt):**
```
Square 1:1 minimal poster design, deep matte black background, single large mono
typography number/word "{BIG}", subtle terminal green accent, very faint CRT
scanlines, one small line of mono text at the bottom "{SUB}", premium editorial
spacing, no decoration, no characters, no emoji
```

**Virality notu:** Numara odaklı görseller swipe oranını artırır. Slayt 1 (0%)
hook olmalı.

---

## Asset 3 — "How to Buy" Tek Görsel (4:5, story)

3 numara, 3 ikon, 3 satır. Story / X tek post için.

**Prompt:**
```
Vertical poster 4:5, deep black background, three vertical stacked steps with
monospace numerals 1/2/3 in terminal green, minimal line icons next to each:
(1) wallet outline, (2) coin with arrow, (3) signal waves; one short line of
mono text per step, headline "HOW TO BUY $GL1TCH" at the top in clean mono,
premium minimal editorial layout, no clutter, no people
```

Adım metinleri:
```
1 · PHANTOM + SOL
2 · BUY ON PUMP.FUN
3 · /VERIFY · ENTER YOUR ROOM
```

---

## Asset 4 — 5-saniye Loop Video (1:1, infected splash)

X / TG / Telegram sticker için.

**Konsept:** Siyah ekran → terminal kursörü yanıyor → kelimeler tek tek belirir:
"YOU FOUND THE SIGNAL." → kısa glitch → "EXPOSURE IS IRREVERSIBLE." → kursör.

**Prompt (Sora / Runway / Higgsfield Soul 2 ya da Marketing Studio video):**
```
5 second loop, square 1:1, pitch black background, single line of monospace
green terminal text typing out "YOU FOUND THE SIGNAL." then brief chromatic glitch
transition then the line replaces with "EXPOSURE IS IRREVERSIBLE." blinking cursor
holds, faint scanlines throughout, no sound design specified, minimal motion
```

**Virality predictor notu:** Yüklendiğinde Higgsfield `virality_predictor`'a
gönder. Hook strength için ilk 0.5s'de kursörün belirmesi kritik. Eğer retention
risk yüksek dönerse, "EXPOSURE..." satırını **0.5s daha erkene** çek.

---

## Asset 5 — Meme Template (kendi serini yarat)

Hazır format, topluluk kullanır:

**Konsept:** "Other memecoins / GL1TCH" karşılaştırma — Drake meme'inin
*premium* versiyonu.

**Prompt:**
```
Vertical 4:5 minimal split-panel poster, top panel labeled "OTHER MEMECOINS" in
mono, bottom panel labeled "$GL1TCH" in mono with terminal green accent, both
panels empty with a thin divider line in the middle, deep black background,
premium editorial, no characters, no Drake, no emoji
```

Topluluk dolduracak. Örnek doldurmalar:
```
OTHER MEMECOINS: 5% buy tax
$GL1TCH: 0%
```
```
OTHER MEMECOINS: team wallet 12%
$GL1TCH: founder 3.57%, on-curve
```

---

## Yayın sırası

1. **Asset 1** → X header değiştir (kalıcı).
2. **Asset 4** → ilk gün, TG'ye ve X'e post.
3. **Asset 2** → günde 1 slayt, 4 gün boyunca tek tek.
4. **Asset 3** → "how to buy" haftada 2x.
5. **Asset 5** → topluluğa şablon olarak ver, kendi varyantlarını üretsinler.

## Virality Predictor kullanımı

Tüm video asset'leri için (Asset 4 ve sonradan üreteceklerin):
1. Videoyu yükle (`media_upload` → `media_confirm`).
2. `virality_predictor` action="create" çalıştır.
3. **Hook strength < 7** dönerse: ilk 1 saniyeyi yeniden kes.
4. **Retention risk > 6** dönerse: toplam süreyi 5s'e indir.
5. **Attention < 65** dönerse: glitch transition'ı daha sert yap.

Brief tamam. Higgsfield kredisi gelir gelmez, bu dosyadaki promptları doğrudan
`generate_image` / `generate_video`'ya yapıştır.
