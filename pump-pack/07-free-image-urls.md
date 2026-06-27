# 07 — Free Image Generation URLs (Pollinations.ai / FLUX)

Higgsfield krediler dolana kadar bu URL'leri kullan. **Tamamen ücretsiz**,
API key istemez, watermark yok. Servis: Pollinations.ai (arkasında FLUX modeli).

## Nasıl kullanılır

1. Aşağıdaki linklerden birini **tarayıcıda** aç (Chrome/Firefox).
2. ~10-30 saniye bekle, görsel render olur.
3. Sağ tık → "Resmi farklı kaydet" → `assets/generated/` klasörüne koy.
4. Beğenmediysen URL sonundaki `seed=...`'ı sil ya da rastgele bir sayı yaz, yeniden çalıştır.

> Bu makinede Node fetch / curl → image.pollinations.ai'da TLS-proxy bağlantıyı
> kesiyor. Tarayıcıdan çalışıyor. Bu yüzden URL listesi olarak veriyorum.

---

## Asset 1 — X Banner (1500×500)

```
https://image.pollinations.ai/prompt/Wide%20cinematic%20banner%203%3A1%2C%20abandoned%20CRT%20monitor%20on%20black%20concrete%20floor%2C%20screen%20shows%20single%20line%20monospace%20green%20text%20%24GL1TCH%20SIGNAL%20DETECTED%2C%20faint%20scanlines%2C%20subtle%20chromatic%20aberration%2C%20deep%20matte%20black%20background%2C%20single%20distant%20light%20source%2C%20premium%20minimal%20cyber%20aesthetic%2C%20high%20contrast%2C%20photographic%20realism%2C%20no%20people%2C%20no%20logos?width=1500&height=500&nologo=true&model=flux&seed=42
```

## Asset 2 — "0%" Tax Card (1024×1024)

```
https://image.pollinations.ai/prompt/Square%201%3A1%20minimal%20poster%2C%20deep%20matte%20black%20background%2C%20single%20enormous%20monospace%20typography%20number%200%25%20centered%20in%20terminal%20green%2C%20one%20small%20line%20of%20mono%20text%20at%20bottom%20TAX%20BUY%20AND%20SELL%2C%20faint%20CRT%20scanlines%2C%20premium%20editorial%20spacing%2C%20no%20decoration%2C%20no%20people%2C%20no%20emoji?width=1024&height=1024&nologo=true&model=flux&seed=101
```

## Asset 3 — "NULL" Mint Card (1024×1024)

```
https://image.pollinations.ai/prompt/Square%201%3A1%20minimal%20poster%2C%20deep%20matte%20black%20background%2C%20enormous%20monospace%20word%20NULL%20centered%20in%20terminal%20green%2C%20small%20monospace%20text%20at%20bottom%20MINT%20AUTHORITY%20REVOKED%2C%20faint%20CRT%20scanlines%2C%20premium%20editorial%2C%20no%20decoration%2C%20no%20emoji?width=1024&height=1024&nologo=true&model=flux&seed=202
```

## Asset 4 — "NULL" Freeze Card (1024×1024)

```
https://image.pollinations.ai/prompt/Square%201%3A1%20minimal%20poster%2C%20deep%20matte%20black%20background%2C%20enormous%20monospace%20word%20NULL%20centered%20in%20terminal%20green%2C%20small%20monospace%20text%20at%20bottom%20FREEZE%20AUTHORITY%20REVOKED%2C%20a%20cracked%20ice%20crystal%20silhouette%20faintly%20behind%20the%20text%2C%20faint%20CRT%20scanlines%2C%20premium%20editorial?width=1024&height=1024&nologo=true&model=flux&seed=303
```

## Asset 5 — RugCheck "1" Card (1024×1024)

```
https://image.pollinations.ai/prompt/Square%201%3A1%20minimal%20poster%2C%20deep%20matte%20black%20background%2C%20enormous%20monospace%20numeral%201%20centered%20in%20terminal%20green%2C%20three%20small%20green%20checkmarks%20arranged%20beneath%2C%20small%20monospace%20text%20at%20bottom%20RUGCHECK%20SCORE%200%20RISKS%2C%20faint%20CRT%20scanlines%2C%20premium%20editorial%20layout?width=1024&height=1024&nologo=true&model=flux&seed=404
```

## Asset 6 — "How to Buy" Story Poster (1024×1280, 4:5)

```
https://image.pollinations.ai/prompt/Vertical%20poster%204%3A5%2C%20deep%20black%20background%2C%20three%20vertical%20stacked%20rows%20each%20with%20a%20large%20monospace%20green%20numeral%201%20then%202%20then%203%2C%20minimal%20line%20icons%20a%20wallet%20outline%20a%20coin%20with%20arrow%20a%20signal%20wave%2C%20one%20short%20line%20of%20monospace%20text%20per%20row%2C%20headline%20HOW%20TO%20BUY%20%24GL1TCH%20at%20the%20top%20in%20clean%20monospace%2C%20premium%20minimal%20editorial%20layout%2C%20no%20clutter?width=1024&height=1280&nologo=true&model=flux&seed=505
```

## Asset 7 — Drake-style meme template (1024×1280, 4:5)

```
https://image.pollinations.ai/prompt/Vertical%204%3A5%20minimal%20split%20panel%20poster%2C%20top%20panel%20labeled%20OTHER%20MEMECOINS%20in%20monospace%2C%20bottom%20panel%20labeled%20%24GL1TCH%20in%20monospace%20with%20terminal%20green%20accent%2C%20both%20panels%20mostly%20empty%20with%20a%20thin%20horizontal%20divider%20line%20in%20the%20middle%2C%20deep%20black%20background%2C%20premium%20editorial%2C%20no%20people%2C%20no%20emoji?width=1024&height=1280&nologo=true&model=flux&seed=606
```

## Asset 8 — Cult emblem / sticker (1024×1024)

```
https://image.pollinations.ai/prompt/Minimal%20circular%20cult%20emblem%2C%20deep%20matte%20black%20background%2C%20a%20single%20terminal%20green%20signal%20wave%20glyph%20inside%20a%20broken%20circle%2C%20text%20around%20the%20circle%20reading%20EXPOSURE%20IS%20IRREVERSIBLE%20in%20monospace%2C%20faint%20CRT%20scanlines%2C%20premium%20editorial%2C%20vector%20like%20clean%20lines%2C%20no%20people?width=1024&height=1024&nologo=true&model=flux&seed=707
```

---

## Seed değişimi ile varyant üret

FLUX deterministic — aynı seed = aynı görsel. Beğenmediğin için varyant istersen
URL'in sonundaki `&seed=42` kısmını sil ya da farklı sayı yap: `&seed=999`,
`&seed=1234`, vs.

## Toplu indirme (alternatif — eğer makinende çalışırsa)

Yukarıdaki URL'leri `urls.txt` dosyasına satır satır yapıştır, sonra:
```powershell
# PowerShell
$i=1; gc urls.txt | % { iwr $_ -OutFile "assets/generated/asset-$i.jpg"; $i++ }
```

Bende çalışmıyor (TLS-intercept) ama sende çalışabilir.

## Sonraki adım

Beğendiğin asset'i seç → site/`assets/brand/` veya `public/`'a koy → X profil
header'ı + ilk raid postuna ekle.
