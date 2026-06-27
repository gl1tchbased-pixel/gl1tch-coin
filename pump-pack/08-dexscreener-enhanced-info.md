# 08 — DexScreener Enhanced Token Info (Submit Pack)

DexScreener'da token sayfana **logo + header + açıklama + sosyal linkler** ekler;
harici listelere (CoinGecko vb.) bağlı kalmadan anında görünür. Verified/Enhanced
info, Trending algoritmasında da boost alır.

> **Bunu ben senin adına gönderemem** — form + ödeme cüzdanınla/kartınla yapılır.
> Aşağıdaki her alanı **kopyala-yapıştır** hazır verdim. Sen sadece girip ödersin.

## Süreç (DexScreener resmi)

1. **Form** → https://marketplace.dexscreener.com/product/token-info
   (token sayfanda da: sağ üst → "Edit token info" / "Get verified")
2. **Öde** → kripto veya kredi/banka kartı. Ücret: **~$299 (promo) / $499 normal**.
3. **Bekle** → çoğu sipariş birkaç dakikada, en geç 12 saatte işlenir.

> Doğrulama: DexScreener tipik olarak token sayfasında "edit" akışını başlatan
> cüzdanın update authority / deployer ile eşleşmesini ister; Pump.fun mint'lerinde
> ödeme + sipariş yeterli oluyor. Sorun çıkarsa support@dexscreener.com.

---

## Forma girilecek alanlar (kopyala-yapıştır)

**Chain:** Solana
**Token address (CA):**
```
3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump
```

**Logo (256×256+ kare PNG):**
`assets/brand/gl1tch-avatar-1.png` (1024×1024 — DS otomatik küçültür)

**Header / banner (3:1):**
`assets/brand/gl1tch-banner.png` (1500×500 — tam spec)

**Website:**
```
https://coin-three-mu.vercel.app
```

**Description (≤ ~300 karakter):**
```
GL1TCH is Solana's rogue-AI cult coin. Zero tax. Mint + freeze authorities revoked. RugCheck risk 1/Low. One flagship utility: hold to climb tiered ranks and unlock gated rooms via a read-only Telegram verify bot — no seed, no approvals, no custody. The signal does not ask permission to spread.
```

**Social links:**
| Tip | URL |
|---|---|
| Twitter / X | `https://x.com/gl1tchbased` |
| Telegram | `https://t.me/gl1tch_infected` |
| Website | `https://coin-three-mu.vercel.app` |

**Locked / excluded supply wallets:**
Yok — declare edilecek kilitli supply yok. Founder bag (%3.57) public ve dolaşımda,
takım allocation / vesting / presale yok. Bu yüzden **Market Cap = FDV** kalır (doğru).

---

## Self-report circulating supply (opsiyonel ama önerilir)

Form sorarsa: **1,000,000,000** (toplam = dolaşımda; kilit yok). Market cap'i FDV
ile aynı tutar — token'ın "what you see is what exists" anlatısını DS verisinde de
tutarlı kılar.

## Gönderim sonrası kontrol

```powershell
# Profil işlendi mi? (icon/header/description dolu mu)
Invoke-RestMethod "https://api.dexscreener.com/latest/dex/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump" |
  Select-Object -ExpandProperty pairs | Select-Object info
```

## Maliyet vs. fayda notu

- Enhanced Info **görünürlüğü** artırır (logo + clean profil = tıklama/güven), ama
  hacmi tek başına yaratmaz. Önce `02`/`03` X içeriği + TG `04` yayınla; trafik
  varken Enhanced Info dönüşümü yükseltir.
- Bütçe sıralaması (`00-README` ile tutarlı): X/TG içerik (ücretsiz) → Enhanced Info
  ($299) → Boost ($50-300/gün). Boost'u Enhanced Info canlıyken aç ki gelen
  trafik clean profil görsün.
