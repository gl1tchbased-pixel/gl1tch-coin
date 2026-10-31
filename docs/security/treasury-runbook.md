# Kasa güvenliği: el kitabı

GL1TCH'in parasının aktığı her yer, onu koruyan katman ve bir şey olursa yapılacaklar.

Hiçbir sistem kırılamaz değildir. Buradaki amaç, tek bir şey çalınınca kasanın gitmemesi ve olursa dakikalar içinde haberin olmasıdır.

## Para nereden nereye akıyor

| Akış | Nereye gidiyor | Çalınırsa kaybedilen |
|---|---|---|
| Safe Swap ücreti (%0.5, Jupiter %20'sini alır) | Jupiter referral kasası `DqKd8T…`, çekilince hesabın sahibine | Kasada biriken |
| x402 USDC ödemeleri | Solana: deployer `H5qb…`. Base: `0xbE1e…` | O cüzdandaki bakiye |
| Pump.fun creator ödülü | Deployer `H5qb…` | O cüzdandaki bakiye |
| Attester ücret parası | `BSq18…` (anahtarı GitHub'da) | 0.05 SOL civarı |

Kural: gelir, anahtarı internete bağlı bir sistemde duran cüzdana inmez. Gelir toplayan cüzdan imza atmaz. Jupiter'de çekim için sahibin imzası gerekmez, para her durumda sahibine gider.

## Kodda kurulu katmanlar

1. **İmza sayfası yok.** `/revenue/setup` ve kurulum API'leri silindi. Kurulum bir kerelikti ve bitti.
2. **Derleme kilidi.** `scripts/money-guard.mjs` her derlemeden önce çalışır. Kodda fon hareketi isteyen ya da attester dışında imza atan bir çağrı varsa derleme durur. Elle `vercel --prod` da bundan geçer.
3. **Sabit adresler.** Ödeme ve ücret adresleri `src/lib/official.ts` içinde. Vercel ayarı bir akışı kapatabilir, başka adrese çeviremez. Çevirmeye çalışırsa x402 kapanır (503).
4. **Ücretten önce zincir kontrolü.** Site, referral hesabının sahibini ve payını dakikada bir zincirden okur. Sahip sabitlenen cüzdan değilse, attester ise, kasa yoksa ya da okuyamazsa ücret almaz. Kullanıcının takası yine çalışır.
5. **Jupiter işlemi denetimi.** Cüzdana gitmeden önce işlem okunur: tek imzacı kullanıcı olmalı, bilinmeyen program olmamalı, üst seviyede onay, yetki devri veya token transferi olmamalı, tutardan fazla SOL çıkmamalı. Şüpheli işlem kullanıcıya gitmez.
6. **Doğru ücret yazısı.** "%0.5 ücret" yalnızca Jupiter ücreti gerçekten uyguladıysa yazılır.
7. **Para gözcüsü.** Telegram botu 5 dakikada bir kasa sahibini, payı, kasayı, deployer bakiyelerini, canlı ödeme adreslerini ve imza sayfalarını kontrol eder, sorun varsa sana özel mesaj atar. Vercel'den ayrı sunucuda çalışır, anahtarı yoktur.
8. **CI sıkılaştırma.** GitHub Actions adımları sabit sürüme kilitli, varsayılan yetki salt okuma.

## Senin yapman gerekenler

### 1. Kasa soğuk cüzdanda (31 Ekim 2026'da yapıldı)

Kasanın sahibi artık MetaMask cüzdanı: `AZSFHxHZaA2eqocJ1V9iwuRh6vW6Kt5ms12b6za6QrNb`. Daha önce sahibi, anahtarı GitHub'da duran `BSq18…` idi.

- Kurtarma kelimeleri yalnızca kağıtta durur. Fotoğraf çekme, buluta, nota, Telegram'a koyma. Kelimeler kaybolursa birikecek ücretler de kaybolur.
- Bu cüzdanı hiçbir siteye bağlama, airdrop imzalama. Çekim için `referral.jup.ag` sayfasını yalnızca bu adresle ve yer imine eklediğin bağlantıdan aç.
- `scripts/vault-transfer` bir kerelikti, artık çalışmaz: sahibin attester olmasını şart koşar.

### 2. x402 gelirini de soğuk cüzdana al

Devirden sonra Claude'a söyle: `PAY_TO_SOLANA` soğuk cüzdana çevrilir, Vercel'deki `X402_PAY_TO_SOLANA` da aynı adrese ayarlanır. İkisi aynı olmazsa x402 kapanır. Base için de ayrı bir soğuk adres açılabilir.

### 3. `main` dalını koru

Bugün `main` korumasız. Bilgisayarındaki veya GitHub'daki bir sızıntıyla `main`'e yazan biri, bot sunucusuna kod sokabilir ve attester anahtarını alabilir. Şunu kendin çalıştır (depo güvenlik ayarı olduğu için Claude yapmaz):

```
gh api -X PUT repos/gl1tchbased-pixel/gl1tch-coin/branches/main/protection --input docs/security/main-protection.json
```

Bundan sonra `main`'e doğrudan yazılamaz, her şey PR ve yeşil CI ile girer.

### 4. Hesaplarda donanım seviyesi 2FA

GitHub, Vercel, Oracle, Gmail ve alan adı hesabında SMS değil, uygulama veya güvenlik anahtarı kullan. Kasadan önce saldırılacak kapılar bunlar.

### 5. Bilgisayar

Phantom, tüm giriş yapılmış tarayıcı profilleri (`e2e/*/.profiles`) ve `.env` dosyaları aynı bilgisayarda. Kötü amaçlı bir yazılım bunların hepsini birden alır. Soğuk cüzdanın telefonda olmasının sebebi bu. Sıcak Phantom'da sadece günlük iş kadar para tut.

Kasada biriken değer 1.000 doları geçerse Ledger veya Squads çoklu imzaya geç.

## Bir şey olursa

**"Kasanın sahibi değişti" mesajı geldi ve sen yapmadın:**
1. Sitedeki ücret zaten kendiliğinden kapanır, kullanıcı etkilenmez. Yine de Vercel'de `JUP_REFERRAL_ACCOUNT=off` yap.
2. GitHub'da `ATTESTER_SECRET_KEY` sırrını sil, GitHub ve Vercel oturumlarını kapat, şifreleri değiştir.
3. Attester'daki SOL'u yeni bir cüzdana al ve Claude'a haber ver. Kasadaki para çekildiyse geri gelmez.

**"x402 başka adrese yönleniyor" ya da "imza isteyen sayfa canlıda" mesajı geldi:**
1. Vercel'de son sağlam dağıtıma dön (Deployments, Promote).
2. Vercel ve GitHub token'larını iptal et, oturumları kapat.
3. Claude'a haber ver.

**Deployer'dan token veya para çıktı, sen yapmadın:**
Kalan her şeyi hemen soğuk cüzdana taşı. Bu cüzdanı bir daha kullanma. O bilgisayarın ele geçirildiğini varsay, kurtarma kelimelerini yeni cihazda yeniden oluştur.

**Telegram'a hiç mesaj gelmiyor mu?** Bot ayaktaysa ilk çalışmada "Para gözcüsü açıldı" mesajı gelir. Gelmediyse bota `/start` yaz.

## Katmanların koruyamadığı

- Jupiter'in kendisi: kasa programı Jupiter'in güncelleyebildiği bir program, payı da Jupiter değiştirebilir. Bu yüzden biriken ücreti ara ara çek.
- Soğuk cüzdan kelimelerinin çalınması.
- Vercel hesabının ele geçirilmesi: saldırgan istediği kodu yayınlayabilir. Gözcü bunu görür ve haber verir ama engelleyemez.
- Kullanıcının kendi cüzdanında yanlış işlemi onaylaması.
