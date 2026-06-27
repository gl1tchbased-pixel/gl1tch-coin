# GL1TCH — Launch Day Guide (Founder Runbook)

Bu rehber, kod tamamen hazırken **senin** yapman gereken gerçek-dünya adımlarını sırayla anlatır.
Zamanlama göreli yazıldı (T-0 = launch anı). Kendi takvimine göre tarihleri sabitle.

> Altın kural: Her şeyi önce **devnet**'te prova et. Mainnet geri alınamaz.
> Gizli anahtarları ASLA commit etme, DM'le paylaşma, ekran görüntüsü alma.

---

## FAZ 0 — Hazırlık (T-7 gün ve öncesi)

### 0.1 Hesaplar & altyapı
- [ ] **X (Twitter)** hesabı aç → `@gl1tch` (veya müsait varyant).
- [ ] **Telegram**: bir grup + duyuru kanalı aç.
- [ ] **Telegram bot**: [@BotFather](https://t.me/BotFather) → `/newbot` → **BOT_TOKEN**'ı al.
- [ ] **Domain**: `gl1tch.io` (veya müsait olan) satın al.
- [ ] **Vercel** hesabı + (önerilir) **GitHub** hesabı/repo.
- [ ] Handle'lar kesinleşince `src/lib/official.ts` içindeki `OFFICIAL` linklerini gerçek adreslerle güncelle.

### 0.2 Cüzdanlar
- [ ] **Launch/dev cüzdanı** (Phantom): içine launch dev-buy + işlem ücreti için **SOL** koy.
- [ ] **Give-back cüzdanı**: tamamen YENİ, ayrı bir cüzdan (kişiselini kullanma). Adresini not et.
- [ ] **Treasury multisig** (Squads, 2/3): imzacıları belirle, `onchain/SECURITY.md`'deki tabloyu doldur.
- [ ] İmzacılar **donanım cüzdanı** kullansın. Seed phrase düz metin hiçbir yerde durmasın.

### 0.3 Token görselleri & metadata
- [ ] Logo / token görseli (kare, yüksek çözünürlük, marka renkleri).
- [ ] OG görseli `public/og.png` (1200×630) ekle.
- [ ] (Path B / kendi mint için) metadata JSON + görseli Arweave/IPFS'e yükle → `onchain/src/token/metadata.md`.
      Pump.fun (Path A) için metadata, oluşturma ekranında doldurulur — ayrı dosya gerekmez.

### 0.4 İçerik hazırlığı
- [ ] Launch-günü post dizisini hazırla (Founder OS 5.9 + bu rehber Faz 4).
- [ ] "How to buy" görseli/threadi, scam uyarısı postu hazır olsun.

---

## FAZ 1 — Yapılandırma (T-3 gün)

### 1.1 Website env (`.env.local`)
`.env.example`'ı kopyala:
```
NEXT_PUBLIC_SITE_URL=https://gl1tch.io
NEXT_PUBLIC_SOLANA_RPC=<özel bir RPC önerilir (Helius/QuickNode) — public RPC launch günü yetersiz kalabilir>
NEXT_PUBLIC_CONTRACT_ADDRESS=        # launch anına kadar BOŞ
NEXT_PUBLIC_GIVEBACK_WALLET=<give-back cüzdan adresi>
NEXT_PUBLIC_BOT_VERIFY_URL=<botun HTTPS doğrulama endpoint'i, ör. https://bot.gl1tch.io/verify>
```
> `official.ts` şu an `CONTRACT_ADDRESS=""` ve `CURRENT_LAUNCH_STATUS=PRE_LAUNCH`. Launch'ta değişecek.

### 1.2 Bot env (`bot/.env`)
```
BOT_TOKEN=<BotFather token>
ADMIN_IDS=<senin Telegram user ID'lerin, virgülle>
GROUP_ID=<grup ID, negatif sayı>

# Holder-gated rank doğrulama (imza tabanlı)
SITE_ORIGIN=https://gl1tch.io          # website origin (CORS); boşsa doğrulama kapalı
VERIFY_PORT=8787                       # doğrulama HTTP endpoint portu
SOLANA_RPC=<özel RPC önerilir>
CONTRACT_ADDRESS=                      # launch'a kadar BOŞ (herkes Observer)
GATED_CHATS=infected:-100...,core:-100...   # tier→özel chat, opsiyonel
```
Bot içeriğindeki linkleri (`bot/src/content.ts`) website ile aynı tut.

> **Holder-gating akışı:** Kullanıcı Telegram'da `/verify` → bot tek kullanımlık
> nonce + `gl1tch.io/verify?n=...` linki verir → kullanıcı cüzdanı bağlar ve ücretsiz
> bir mesaj imzalar → website imzayı botun HTTP endpoint'ine POST eder → bot ed25519
> imzayı doğrular, bakiyeyi okur, tier'ı belirler ve tek kullanımlık oda davetlerini
> DM'ler. Hiçbir zaman özel anahtar/harcama yetkisi istenmez (read-only).
> Botu HTTPS arkasına koy (reverse proxy) ve `NEXT_PUBLIC_BOT_VERIFY_URL`'i bu adrese ayarla.

### 1.3 On-chain env (`onchain/.env`)
```
SOLANA_CLUSTER=devnet
RPC_URL=https://api.devnet.solana.com
FEE_PAYER_KEYPAIR_PATH=./keys/fee-payer.json
TOKEN_NAME=GL1TCH
TOKEN_SYMBOL=GL1TCH
TOKEN_DECIMALS=6
TOKEN_TOTAL_SUPPLY=1000000000
CONFIRM_MAINNET=false
```

---

## FAZ 2 — Devnet Provası (T-2 gün) — ZORUNLU

```bash
cd onchain
npm install
mkdir -p keys
solana-keygen new -o keys/fee-payer.json     # provada kullanılacak cüzdan
npm run devnet-dry-run
```
- [ ] Çıktıdaki **TRUST REPORT = PASS ✓** olmalı (mint revoked, freeze revoked, supply doğru).
- [ ] Hata olursa launch'a GEÇME — kök nedeni çöz.

Botu da prova et:
```bash
cd ../bot && npm install && npm run dev
```
Telegram'da `/start /rank /links /lore /faq /rules` komutlarını dene.

---

## FAZ 3 — Pre-Launch Deploy (T-1 gün)

- [ ] `onchain/PRE_LAUNCH_CHECKLIST.md` %100 işaretli.
- [ ] Website'i Vercel'e deploy et (env değişkenleriyle). Site PRE_LAUNCH modunda yayında.
- [ ] `/links` ve footer'da uyarı görünüyor: **"Henüz kontrat yok — satan dolandırıcıdır."**
- [ ] Botu kalıcı çalıştır (VPS/host) ve gruba **admin** yetkisi ver (pin/mute/ban için).
- [ ] Tüm resmi linkleri X profili + TG açıklamasına ekle.

---

## FAZ 4 — Launch Günü (T-0)

> Sıra önemli. CA'yı **aynı anda** her yerde açıklamak sniping'i azaltır.

1. **T-60 dk** — "SIGNAL IMMINENT" teaser (X+TG). Hatırlatma: henüz kontrat yok.
2. **T-0** — **Pump.fun**'da coin oluştur:
   - Ad: `GL1TCH`, sembol: `GL1TCH`, görsel + açıklama.
   - `onchain/src/pumpfun/launchNotes.md` adımlarını izle.
3. **Dev buy (≤%3)** — açık curve'den, herkesle aynı fiyattan. Gizli cüzdan YOK.
4. **CA'yı (contract address) al.**
5. **`src/lib/official.ts`** güncelle:
   - `CONTRACT_ADDRESS = "<CA>"`
   - `CURRENT_LAUNCH_STATUS = LAUNCH_STATUS.LIVE`
   - `GIVEBACK_WALLET = "<adres>"` (henüz yapmadıysan)
6. **Redeploy** (Vercel). Artık `/links` ve Trust Wall CA + explorer linklerini gösterir.
7. **Aynı anda yayınla**: X postu + TG pin + site `/links` — hepsinde aynı CA.

---

## FAZ 5 — Launch Sonrası İlk Saat

1. **Doğrula:**
   ```bash
   cd onchain
   SOLANA_CLUSTER=mainnet-beta RPC_URL=<mainnet rpc> npm run post-launch-verify -- <CA>
   ```
   - [ ] TRUST REPORT = PASS (mint/freeze revoked, supply doğru).
2. [ ] **RugCheck** ve **SolSniffer** linklerini topluluğa paylaş (otomatik skor).
3. [ ] **Trust Wall** (site) gerçek durumu göstersin — gerekiyorsa `TRUST_REPORT` değerlerini `verify.ts` çıktısına göre güncelle/redeploy.
4. [ ] TG'de CA + "How to buy" + "sadece resmi link" postunu pinle.
5. [ ] Botta `/announce` ile launch duyurusu.
6. [ ] Give-back cüzdanını `/links` Trust Wall'da göster.

---

## FAZ 6 — İlk 24 Saat → İlk Hafta

- [ ] Holder sayısı + top-holder konsantrasyonunu izle (whale uyarısı).
- [ ] **Ranks utility**: `/ranks` gerçek bakiye okuyor; Telegram'da `/verify` → cüzdan
      imzala → bot tier rolünü/oda davetini DM'liyor mu, uçtan uca test et. `GATED_CHATS`'i
      gerçek özel chat ID'leriyle doldur ve botu o chatlere admin yap (davet linki için).
- [ ] Dashboard otomatik canlıya geçer (CONTRACT_ADDRESS set olunca, DEXScreener anahtarsız
      market cap/likidite/hacim verir). Holder sayısı için opsiyonel `BIRDEYE_API_KEY` ekle.
      Mock'a zorlamak için `ANALYTICS_LIVE=false`.
- [ ] Günlük içerik + raid takvimi (Founder OS 6.3 Faz 4).
- [ ] Scam/impersonator avı: adminler asla DM atmaz mesajını tekrarla.

---

## Güvenlik — ASLA yapma
- ❌ Gizli anahtar / seed phrase'i commit etme, DM'le, ekran görüntüsüne alma.
- ❌ `NEXT_PUBLIC_` env'e özel anahtar koyma.
- ❌ Launch öncesi CA paylaşma (yok zaten — paylaşan dolandırıcı).
- ❌ Vergi ekleme, gizli team allocation, vesting — konumlandırmamıza aykırı.
- ❌ Devnet provası yapmadan mainnet'e geçme.

## Acil Durum (key compromise)
`onchain/SECURITY.md` → incident planı. Token zaten renounced olduğu için arz/holder bakiyeleri etkilenemez; operasyonel cüzdanları rotate et, `/links`'i güncelle, duyur.

---

## Hızlı Komut Referansı
```bash
# Devnet provası
cd onchain && npm run devnet-dry-run
# Path B (kendi mint + Raydium CPMM pool): devnet'te token provası, mainnet'te pool
cd onchain && npm run path-b-launch
# Canlı doğrulama
cd onchain && npm run post-launch-verify -- <CA>
# Website lokal
npm run dev           # (gerekiyorsa NODE_OPTIONS=--use-system-ca)
# Bot
cd bot && npm run dev
```

## Launch'ta Düzenlenecek Tek Dosya
`src/lib/official.ts` → `CONTRACT_ADDRESS`, `CURRENT_LAUNCH_STATUS`, `GIVEBACK_WALLET`.
Web sitesi, bot ve Trust Wall hepsi buradan beslenir.
