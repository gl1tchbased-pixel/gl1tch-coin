# GL1TCH Quantum Core — Birleşik Teknik Yapım Planı (v8, Dört Sütun)

> Claude Code'a doğrudan verilmek üzere hazırlanmıştır. Dört gerçek,
> bugün çalışan kuantum bileşeni: Vault (hazırlık skoru), Draw (CURBy
> gerçek kuantum rastgelelik), Seal (post-kuantum şifreleme), Forge
> (kuantum-esinli optimizasyon). Tümü GL1TCH-holder-only. Ödül
> mekanizması GL1TCH rezervine dokunmadan kendi kendini finanse eder.
> Güvenlik: commit-reveal, replay koruması, IDOR önlemi, pulse doğrulama,
> havuz zehirleme önlemi, tek-yetki-noktası olmaması.
> Not: Bu bir tasarım planıdır; canlıya çıkmadan önce bağımsız güvenlik
> denetimi (audit), özellikle akıllı kontrat için ayrı bir audit şarttır.

---

## İçindekiler

1. Genel Bakış
2. Dürüstlük Çerçevesi
3. Mimari
4. Birleşik Erişim Matrisi
5. Gate Mekanizması — Sürdürülebilir Bakiye Doğrulama
6. Sütun A — Quantum Vault
7. Sütun B — Quantum Draw (CURBy Entegrasyonu)
8. Sütun C — Quantum Seal
8B. Sütun D — Quantum Forge (Kuantum-Esinli Optimizasyon)
9. **Ödül Mekanizması — Kesinleşmiş Tasarım**
10. **Quantum Sertifika NFT**
11. Quantum Beacon
12. Birleşik API Tasarımı
13. Veri Modeli
14. Güvenlik Gereksinimleri
15. Test ve Kalite Kriterleri
16. UI/UX Standartları
17. Faz Planı
18. Claude Code Talimat Bloğu
19. Terimler Sözlüğü

---

## 1. Genel Bakış

| Sütun | Ne Yapar | Dayandığı Gerçek Teknoloji |
|---|---|---|
| **A. Quantum Vault** | Kuantum-hazırlık skoru | Kriptografi hijyeni analizi |
| **B. Quantum Draw** | Çekiliş/whitelist/eşitlik-bozma kararları | **NIST CURBy** — Bell testi tabanlı, sertifikalanmış kuantum rastgelelik beacon'ı |
| **C. Quantum Seal** | Kullanıcıya özel veri şifreleme | NIST Kyber (ML-KEM), `liboqs` |
| **D. Quantum Forge** | Kombinatoryal optimizasyon (havuz/takvim dengeleme, holder aracı) | Kuantum-esinli optimizasyon (klasik donanımda, gerçek matematik) |

Tüm katmanlar tamamen GL1TCH sahipliğine bağlıdır (Bölüm 4-5). Ödül
mekanizması, kurucunun veya ekibin elindeki GL1TCH'e dokunmaz (Bölüm 9).

**Tasarım felsefesi — neden "daha fazla kuantum" değil, "doğru kuantum":**
Bu sistem bilinçli olarak, bugün gerçekten çalışan kuantum
teknolojilerini kullanır. "Gerçek kuantum bilgisayarda ağır hesaplama"
gibi, 2026 donanımının gürültü/hata oranları nedeniyle klasik
yöntemlerden daha yavaş/güvenilmez sonuç verecek özellikler bilinçli
olarak DIŞARIDA bırakılmıştır. Her sütun, bugün ölçülebilir değer üreten,
dürüstçe etiketlenebilen bir teknolojiye dayanır. Kalite, "en çok kuantum
kelimesi" değil, "her iddianın gerçekten karşılığı olması" ile ölçülür.

---

## 2. Dürüstlük Çerçevesi

- Vault bugünkü saldırı riskini ölçmez, hazırlık/hijyen ölçer.
- Draw, ABD hükümetinin resmi bilim kurumu NIST'in yürüttüğü, Nature'da
  yayınlanmış, hakemli bir kuantum deneyine dayanır — iddia edilen değil,
  bilimsel olarak doğrulanmış bir kaynaktır.
- Seal bugünden çalışan gerçek post-kuantum kriptografidir, yalnızca
  Vault modülündeki kullanıcıya özel veri kapsamındadır.
- Quantum Sertifika NFT'ler parasal değeri garanti eden bir yatırım
  aracı değildir; kanıt/koleksiyon nesnesidir. Bu, kullanıcıya açıkça
  yazılır.
- Quantum Forge, GERÇEK bir kuantum bilgisayar kullanmaz; kuantum
  dinamiklerini taklit eden, klasik donanımda çalışan "kuantum-esinli"
  optimizasyon algoritmaları kullanır. Bu, 2026'da endüstrinin baskın
  ve gerçekten değer üreten yaklaşımıdır; kullanıcıya "kuantum-esinli"
  olarak dürüstçe etiketlenir, "kuantum bilgisayarda çalışıyor" denmez.

---

## 3. Mimari

```
/app
  /quantum-core
    page.tsx
    /vault/...
    /draw/...
    /seal/...
    /beacon/page.tsx
    /rewards/page.tsx               -> ödül havuzu durumu (yeni)

/lib
  /quantum
    /access/balance-guard.ts
    /vault/...
    /draw
      curby-client.ts               -> NIST CURBy entegrasyonu (birincil)
      anu-qrng-client.ts            -> ANU QRNG (yalnızca yedek/fallback)
      draw-engine.ts
      beacon-logger.ts
    /seal/...
    /rewards
      sol-pool-manager.ts           -> Bölüm 9
      certificate-minter.ts         -> Bölüm 10

/components
  /quantum-core/...
```

**Kaynak önceliklendirme kuralı:** CURBy birincil kaynaktır. Ödüllü/
yüksek-önemli çekilişlerde CURBy erişilemezse ANU'ya GEÇİLMEZ — çekiliş
ertelenir (bkz. 7.2, downgrade saldırısı önlemi). ANU yalnızca ödülsüz,
düşük-önemli işlemlerde (örn. kuyruk sıralaması) yedek olarak kullanılır
ve bu kullanım Beacon'da açıkça işaretlenir. Hiçbir zaman sessizce,
kaynak belirtilmeden bir yedeğe geçilmez.

---

## 4. Birleşik Erişim Matrisi

| Rank | Vault | Draw | Seal | Forge |
|---|---|---|---|---|
| Infected (100.000+) | Temel skor | Çekilişlere katılma + ödül havuzuna dahil olma | — | — |
| Signal Bearer (1.000.000+) | + Deployer cross-check | + Draw geçmişi | Temel şifreli arşiv | Temel optimizasyon aracı |
| Core Node (5.000.000+) | + Karşılaştırma aracı | + Denetim örneklemesi çekilişleri | + Rapor export | + Çok-kısıtlı optimizasyon + senaryo karşılaştırma |
| Ghost Node (10.000.000+) | + Tam geçmiş grafiği | + Öncelikli havuz erişimi + aylık "gerçek kuantum deneyimi" ödülü (Bölüm 9.3) | + API erişim anahtarı | + Forge API erişimi |

Alt eşik yoktur. Yalnızca Beacon (Bölüm 11) herkese açıktır.

---

## 5. Gate Mekanizması — Sürdürülebilir Bakiye Doğrulama

*(v5 ile aynı — değişmedi.)* Her fonksiyonel istekte, mevcut
Proof-of-Signal altyapısındaki 7 günlük ortalama bakiye sunucu
tarafında yeniden doğrulanır. Anlık bakiye tek başına yeterli değildir.

---

## 6. Sütun A — Quantum Vault

*(v5 ile aynı — değişmedi.)* Skor: imza hijyeni, custody yapısı,
operasyonel geçmiş, authority durumu, şeffaflık — 0-100, 4 tier.

---

## 7. Sütun B — Quantum Draw (CURBy Entegrasyonu)

### 7.1 Neden CURBy Birincil Kaynak

CURBy, kuantum dolanıklığa dayalı bir Bell testinden elde edilen
rastgeleliği, izlenebilir ve sertifikalanabilir bir servise dönüştürür;
sonuçlar hem NIST hem de bağımsız bir üçüncü tarafın (Distributed
Randomness Beacon Daemon) katkısıyla, birbirine bağlı hash zincirleriyle
kayıt altına alınır — bir tarafın veriyi geriye dönük değiştirmesi,
zincirdeki tutarsızlıktan tespit edilebilir. Bu, ANU'nun tek-kaynaklı
vakum-dalgalanması ölçümünden daha güçlü bir bütünlük garantisi sunar.

**Önemli teknik uyarı (dokümantasyondan doğrudan alınmalı):** CURBy
çıktıları kriptografik anahtar materyali olarak kullanılmamalıdır —
bu değerler kamuya açıktır ve bu amaç için tasarlanmamıştır. Bu nedenle
Sütun C (Seal) hiçbir zaman CURBy/ANU çıktısını şifreleme anahtarı
olarak kullanmaz; yalnızca Draw'daki seçim/eşleme kararları için
kullanılır. Bu ayrım kod ve dokümantasyonda net şekilde belirtilir.

### 7.2 Akış — Commit-Reveal Deseni (güvenlik için zorunlu)

**Kritik güvenlik ilkesi:** CURBy pulse'ları kamuya açık yayınlanır.
Eğer katılım listesi, kullanılacak pulse yayınlandıktan SONRA hâlâ
açıksa, bir saldırgan pulse değerini görüp `pulse mod pool_size`
hesabını kazanacak pozisyona denk getirecek şekilde cüzdan ekleyebilir.
Bu yüzden akış kesinlikle şu sırayla işler:

1. **Katılım penceresi açılır** (örn. Pazartesi 00:00 – Cuma 23:59).
   Kullanıcılar `draw/enter` ile katılır.
2. **Liste dondurulur ve taahhüt edilir:** Pencere kapanınca katılımcı
   listesinin hash'i (merkle root) Beacon'a yazılır — GELECEKTEKİ bir
   pulse hedeflenerek ("Cumartesi 12:00'deki CURBy pulse'u
   kullanılacaktır" şeklinde, pulse henüz var olmadan ilan edilir).
3. **Pulse yayınlanır:** Hedeflenen zamanda CURBy pulse'u gelir. Bu
   noktada ne liste değiştirilebilir (hash taahhüdü var) ne de pulse
   önceden bilinebilirdi (henüz üretilmemişti).
4. **Kazanan deterministik olarak hesaplanır:**
   `winner_index = H(pulse_value || participant_merkle_root) mod pool_size`
   — pulse tek başına değil, dondurulmuş liste hash'iyle birlikte
   hash'lenir; böylece aynı pulse başka bir çekilişte farklı sonuç verir.
5. Sonuç + tüm girdiler (merkle root, pulse hash, hedefleme ilanının
   timestamp'i) Beacon'a yazılır — herkes adım adım yeniden hesaplayıp
   doğrulayabilir.
6. Ödül dağıtımı ve NFT mint tetiklenir (Bölüm 9-10).

**Fallback kuralı (güncellendi):** Ödül içeren çekilişlerde CURBy
erişilemezse ANU'ya GEÇILMEZ — çekiliş bir sonraki CURBy pulse'una
ertelenir ve bu Beacon'da ilan edilir. Nedeni: kaynak değiştirme kararı
bir manipülasyon vektörü olabilir ("hangi kaynağın kullanılacağını
seçmek" = sonucu etkileyebilmek). ANU fallback yalnızca ödülsüz,
düşük-önemli işlemlerde (örn. kuyruk sıralaması) kullanılabilir.

### 7.3 Adillik İlkesi ve Sybil Riski

Rank/bakiye miktarı kazanma OLASILIĞINI asla etkilemez; yalnızca hangi
havuzlara katılabileceğini belirler (Bölüm 4).

**Dürüstçe kabul edilmesi gereken sınırlama — Sybil bölme:** "Cüzdan
başına bir giriş" kuralı, teoride büyük bir sahibin bakiyesini birden
çok cüzdana bölerek (10 × 100.000 = 10 giriş) daha fazla şans elde
etmesine izin verir. Bunu tamamen engellemek kimlik doğrulaması olmadan
mümkün değildir. Alınan önlemler:
- 7 günlük ortalama şartı her cüzdan için ayrı ayrı geçerlidir — bölme,
  sermayeyi 7 gün boyunca bölünmüş halde kilitlemeyi gerektirir, yani
  bedava değildir.
- Bu sınırlama kullanıcıya gizlenmez; Draw kuralları sayfasında "giriş
  cüzdan başınadır, bakiye başına değildir" açıkça yazılır.
- Yüksek değerli çekilişlerde (Faz 3) mevcut Signal Reputation'ın
  topluluk/XP bileşeni ek bir ağırlık şartı olarak değerlendirilebilir
  (salt bakiyeyle taklit edilmesi daha zor bir sinyal).

---

## 8. Sütun C — Quantum Seal

*(v5 ile aynı — değişmedi.)* `liboqs` / ML-KEM (Kyber), yalnızca Vault
kullanıcı verisi kapsamında, Signal Bearer'dan itibaren.

---

## 8B. Sütun D — Quantum Forge (Kuantum-Esinli Optimizasyon)

### 8B.1 Ne İşe Yarar

Forge, karmaşık kombinatoryal problemleri — çok sayıda değişken ve
kısıtın olduğu, klasik "kaba kuvvet" ile zor çözülen problemleri —
kuantum-esinli optimizasyon algoritmalarıyla çözer. İki kullanım
katmanı vardır:

**İç kullanım (sistem için):**
- Draw havuzlarının ve ödül dağıtım takviminin dengelenmesi
- Denetim örnekleme stratejisinin optimize edilmesi (hangi deployer'lar,
  hangi sıklıkta örneklenmeli)

**Holder aracı (kullanıcı için):**
- Kullanıcının kendi token/varlık dağılımını, tanımladığı kısıtlar
  altında dengeleme senaryoları üretmesi (örn. "şu oranları koru, şu
  riski minimize et" tipi bir kısıt problemi)
- Bu bir yatırım tavsiyesi DEĞİLDİR; kullanıcının kendi tanımladığı
  matematiksel kısıtları çözen bir hesap aracıdır. Bu ayrım UI'da açıkça
  belirtilir.

### 8B.2 Teknik Temel (dürüst çerçeve)

- Problem, standart bir QUBO/Ising formülasyonuna dönüştürülür (kuantum
  optimizasyonunun evrensel dili — ileride gerçek kuantum donanımına
  taşınabilir olması için).
- Çözüm, klasik donanımda çalışan kuantum-esinli bir çözücüyle (örn.
  simulated annealing / tensor-network tabanlı yöntemler) üretilir.
- **Neden gerçek değer:** 2026'da endüstrinin baskın dağıtım modeli
  hibrit kuantum-klasik iş akışlarıdır ve kuantum-esinli optimizasyon,
  kuantum donanımı olmadan bugün ölçülebilir kazanç sağlar — yönlendirme
  ve portföy optimizasyonu pilotlarında %10-30 verimlilik iyileşmesi
  raporlanmıştır. Bu, "gelecekte olabilecek" değil, bugün çalışan bir
  yaklaşımdır.

### 8B.3 Gelecek Uyumu (isteğe bağlı, Faz 3+)

Problem zaten QUBO/Ising formatında olduğu için, ileride istenirse aynı
problem gerçek bir kuantum işlemcisine (IBM, D-Wave) gönderilebilir ve
sonuçlar karşılaştırılabilir. Bu, sistemin "gerçek kuantum donanımı
olgunlaştıkça hazır olması" anlamına gelir — ama bu bir gösteriş
özelliğidir, MVP'de gerekmez ve klasik çözücü çoğu durumda daha hızlı/
güvenilir olduğu için varsayılan kalır.

### 8B.4 Dürüstlük Sınırı

Forge, her problemi klasik yöntemden daha iyi çözeceğini iddia ETMEZ.
İyi yapılandırılmış bazı problemlerde klasik çözücüler hâlâ daha hızlı
ve güvenilirdir. Forge, yalnızca çok-kısıtlı, kombinatoryal problemlerde
(bu sistemin gerçek kullanım alanları) avantaj sunar ve kullanıcıya
hangi problem tipinin buna uygun olduğu açıkça anlatılır.

---

## 9. Ödül Mekanizması — Kesinleşmiş Tasarım

### 9.1 Temel İlke

Ödül havuzu, kurucunun veya ekibin kişisel GL1TCH bakiyesinden
**beslenmez**. Bunun yerine, sistemin kendi kullanımından doğan gerçek
gelirle kendi kendini finanse eder.

### 9.2 Finansman Kaynağı

| Kaynak | Mekanizma | Havuza Katkısı |
|---|---|---|
| Rapor export ücreti | Core Node+ kullanıcı, PDF/JSON rapor export ederken küçük bir SOL ücreti öder (örn. 0.01 SOL) | Doğrudan SOL havuzuna |
| Premium API erişimi | Ghost Node API anahtarı kullanımı, çağrı başına mikro-ücretlendirilir | Doğrudan SOL havuzuna |
| Mevcut Give-Back Wallet | Sitenin zaten var olan, herkese açık şeffaf give-back cüzdanından periyodik, önceden ilan edilmiş küçük bir pay | Şeffaf, on-chain görülebilir aktarım |

**Önemli:** Give-Back Wallet katkısı sabit bir yüzde olarak önceden
ilan edilir (örn. "aylık gelirin %X'i") ve miktar/zamanlama Beacon'da
şeffaf şekilde loglanır — keyfi, anlık kararlarla değil.

### 9.3 Dağıtım Şekli

- **Haftalık Draw ödülü:** Havuzdaki birikmiş SOL, kazanan Infected+
  kullanıcıya otomatik transfer edilir (akıllı kontrat üzerinden,
  manuel onay gerektirmez — manipülasyon riski ortadan kalkar).
- **Aylık "gerçek kuantum deneyimi" ödülü (yalnızca Ghost Node havuzu):**
  Kazanan kullanıcı, ekibin sağladığı bir IBM Quantum hesabı üzerinden
  gerçek bir kuantum işlemcisinde küçük bir devre (circuit) çalıştırma
  deneyimi kazanır. Teknik gerçek: IBM Quantum Open Plan ücretsizdir ve
  28 günde yaklaşık 10 dakika gerçek kuantum çalışma süresi verir — bu,
  ayda bir kazanana küçük bir devre çalıştırmak için yeterlidir ama
  ağır/uzun hesaplamalar için değildir. Bu yüzden ödül, "büyük bir
  hesaplama" değil, "gerçek bir kuantum işlemcisiyle etkileşim deneyimi +
  kanıtlanabilir job ID" olarak konumlandırılır. Sonuç ve job ID kanıt
  olarak kullanıcıya ve Beacon'a kaydedilir. Parasal karşılığı yoktur ve
  bu açıkça belirtilir; değeri deneyim ve benzersizliktir.
- **Havuz boşsa:** Sistem, "bu hafta ödül havuzu boş, sonraki hafta
  birikmiş X SOL ile devam ediyor" mesajını Beacon'da ve Draw sayfasında
  şeffafça gösterir. Asla sahte/yok bir ödül vaat edilmez.

### 9.4 Kapasite Beklentisi (dürüstlük için)

Bu havuzun büyüklüğü doğrudan kullanım hacmine bağlıdır; başlangıçta
küçük olması beklenir. Bu, kullanıcıya "büyük ödüller" vaadiyle
sunulmaz — "kullanım arttıkça büyüyen, şeffaf, gerçek bir havuz" olarak
konumlandırılır.

---

## 10. Quantum Sertifika NFT

### 10.1 Ne Olduğu

Her Draw kazanana, Solana üzerinde basılan, aşağıdaki verileri
içeren benzersiz bir NFT verilir:

```
{
  drawId: string,
  curbyPulseHash: string,     // kullanılan kuantum pulse'un hash'i
  curbyPulseTimestamp: string,
  nistSignatureRef: string,   // CURBy'nin kendi imza referansı
  winnerWallet: string,
  drawType: string
}
```

### 10.2 Değeri

- **Parasal değil, kanıt değeri:** Bu NFT, "belirli bir anda, evrenin
  belirli bir kuantum ölçümüne bağlı olarak seçildim" iddiasının
  taklit edilemez, kalıcı kaydıdır.
- **İkincil pazar mümkündür ama vaat edilmez:** Kullanıcılar isterse
  bu NFT'leri değiştirebilir/satabilir, ama proje bunun bir yatırım
  aracı olduğunu iddia etmez — bu netçe belirtilir.
- **Koleksiyon mantığı:** Zamanla, ilk 100 CURBy-bağlı NFT gibi
  "erken dönem" kategorileri organik olarak oluşabilir (tıpkı erken
  dönem on-chain eserlerin değer kazanması gibi) ama bu bir taahhüt
  değil, olası bir yan etkidir.

### 10.3 Neden Bu Gerçekten Farklı

Bu, "rastgele bir NFT" değil — her biri gerçek, doğrulanabilir bir
kuantum fiziği ölçümüne kriptografik olarak bağlı. Hiçbir mevcut meme
coin projesinin sunmadığı bir birleşim: gerçek bilim + gerçek
blockchain kanıtı + koleksiyon nesnesi.

---

## 11. Quantum Beacon

*(v5 ile aynı, kesinleşmiş karar korunuyor.)* Herkese açık, gate'siz,
salt-görüntüleme. Artık ek olarak: CURBy/ANU fallback durumları ve
ödül havuzu hareketleri de bu kütükte şeffaf şekilde loglanır.

```
table quantum_beacon_log
  id, draw_type, qrng_source ("curby" | "anu_fallback"),
  raw_value_hash, onchain_tx_hash, timestamp, result_summary,
  reward_amount_sol, certificate_mint_address
```

---

## 12. Birleşik API Tasarımı

**Kritik düzeltme:** Önceki sürümdeki `draw/request` endpoint'i, çekiliş
yürütmeyi kullanıcı isteğine bağlıyordu — bu ciddi bir tasarım hatasıdır
(kullanıcı, çekilişin NE ZAMAN yürütüleceğini kontrol ederek avantaj
elde edebilir). Doğrusu: kullanıcı yalnızca KATILIR; çekilişin
yürütülmesi zamanlanmış, sunucu tarafı bir işlemdir.

```
POST /api/quantum-core/draw/enter
  auth: ZORUNLU + sustained-balance guard
  → kullanıcıyı açık katılım penceresine ekler; çekilişi YÜRÜTMEZ

[SUNUCU-İÇİ, dışa kapalı] draw-executor (zamanlanmış görev / cron)
  → Bölüm 7.2'deki commit-reveal akışını yürütür; hiçbir dış istek
    bu işlemi tetikleyemez

GET  /api/quantum-core/draw/status/:drawId
  auth: yok
  → pencere durumu, merkle root taahhüdü, hedeflenen pulse zamanı,
    (sonuçlandıysa) kazanan + doğrulama girdileri

GET  /api/quantum-core/rewards/pool-status
  auth: yok (herkese açık şeffaflık, rate-limit'li)

POST /api/quantum-core/seal/store
  auth: ZORUNLU + sustained-balance guard + Signal Bearer+

GET  /api/quantum-core/beacon
  auth: yok (rate-limit'li)
```

### 12.1 Kimlik Doğrulama Güvenliği (tüm ZORUNLU auth endpoint'leri için)

- **İmza replay koruması:** Cüzdan imzası, tek kullanımlık nonce + kısa
  geçerlilik süresi (örn. 5 dk) + hedef endpoint adı içeren bir mesaj
  üzerinden alınır. Aynı imza ikinci kez kabul edilmez (nonce sunucuda
  tüketilir). Bu olmadan, yakalanan bir imza süresiz yeniden
  kullanılabilir — kritik açık.
- **Bakiye okuma güvenilirliği:** 7 günlük ortalama, yalnızca projenin
  kendi kontrolündeki güvenilir RPC endpoint'lerinden okunur; kullanıcı
  tarafından sağlanan hiçbir RPC/veri kaynağı kabul edilmez.
- **Rate limiting:** Herkese açık endpoint'ler dahil tüm endpoint'lerde
  IP + cüzdan bazlı hız sınırı uygulanır (DoS ve kaba kuvvet önleme).

*(Vault ve diğer önceki endpoint'ler v5 ile aynı, yukarıdaki 12.1
kuralları hepsine uygulanır.)*

---

## 13. Veri Modeli

```
table quantum_scans           -- Sütun A
table quantum_beacon_log      -- Sütun B + ödül/NFT kayıtları (Bölüm 11)
table quantum_sealed_records  -- Sütun C
table reward_pool_ledger
  id, source ("export_fee" | "api_fee" | "giveback_wallet"),
  amount_sol, tx_hash, timestamp
table quantum_certificates
  id, mint_address, draw_id, owner_wallet, minted_at
```

---

## 14. Güvenlik Gereksinimleri

*(v5'teki tüm gereksinimlere ek olarak:)*

### 14.1 Ödül Havuzu Bütünlüğü
- Havuz, veritabanı kaydı değil, **on-chain bir program (akıllı kontrat)
  tarafından kontrol edilen cüzdandır** — `reward_pool_ledger` tablosu
  yalnızca on-chain gerçeğin okunabilir aynasıdır, doğruluk kaynağı
  değildir. İkisi arasında tutarsızlık tespit edilirse sistem dağıtımı
  durdurur ve durumu Beacon'da ilan eder.
- Ödül transferi otomatiktir; hiçbir ekip üyesinin manuel "kazananı
  onaylama" veya havuzdan çekim yetkisi yoktur. Kontratın upgrade
  authority'si ya revoked ya da timelock'lu olmalıdır (sitenin kendi
  Trust Wall standardıyla tutarlı).

### 14.2 Anahtar Yönetimi
- NFT mint yetkisi ve havuz kontrat etkileşimi için kullanılan sunucu
  anahtarları asla ortam değişkeninde düz metin tutulmaz; bir KMS/secret
  manager üzerinden, erişimi loglanan şekilde saklanır.
- Mint işlemi yalnızca Beacon'a yazılmış, doğrulanmış bir draw
  kaydından tetiklenir; keyfi mint çağrısı program seviyesinde
  engellenir (sadece API seviyesinde değil).

### 14.3 Kaynak Düşürme (Downgrade) Saldırısı
- Bir saldırgan CURBy erişimini engelleyerek (örn. sunucunun dış ağ
  yolunu hedefleyerek) sistemi daha zayıf bir kaynağa düşmeye
  zorlayabilir. Bu yüzden ödüllü çekilişlerde fallback YOKTUR — yalnızca
  erteleme vardır (bkz. 7.2). "Erişilemiyor" durumu da Beacon'da
  loglanır; tekrarlayan erişim sorunları görünür olur.

### 14.4 Diğer
- CURBy verisi kriptografik anahtar olarak KULLANILMAZ (bkz. 7.1).
- Draw yürütücüsü (executor) dışarıdan çağrılabilir bir endpoint
  DEĞİLDİR; yalnızca zamanlanmış sunucu-içi görevdir.
- Tüm bağımlılıklar (özellikle `liboqs` ve Solana kütüphaneleri) için
  otomatik güvenlik güncellemesi/dependency scanning, sitenin mevcut
  /security postürüne dahil edilir.

### 14.5 CURBy Pulse Doğrulaması (kaynağa körü körüne güvenmeme)
Sistem, CURBy'den gelen pulse'u OLDUĞU GİBİ kabul etmez. Her pulse:
- CURBy'nin yayınladığı imza/hash zinciriyle doğrulanır (pulse gerçekten
  CURBy'den mi, bozulmuş/enjekte edilmiş mi).
- Beklenen zaman penceresine ait mi kontrol edilir (saldırgan, DNS/proxy
  ile eski bir pulse'u "taze" gibi sunamaz — timestamp + zincir sırası
  doğrulanır).
- Doğrulama başarısızsa çekiliş yürütülmez, ertelenir ve durum Beacon'a
  yazılır. Bu, "man-in-the-middle ile sahte pulse enjekte etme"
  saldırısını kapatır (ANU dokümantasyonunun kendisi de bu ağ-katmanı
  riskine dikkat çeker).

### 14.6 Katılım Penceresi ve Merkle Root Manipülasyonu
- Katılımcı listesinin merkle root'u hesaplandıktan sonra, listenin
  kendisi (tüm cüzdan adresleri) de ayrıca saklanır ki herkes root'u
  bağımsız yeniden hesaplayıp doğrulayabilsin — "root'u yayınladım ama
  liste gizli" ile sahtecilik yapılamaz.
- Pencere kapanış zamanı sunucu saatine değil, hedeflenen CURBy
  pulse'unun timestamp'ine göre kesinleştirilir; sunucu saati
  oynatılarak pencere uzatılamaz.
- Bir cüzdanın aynı çekilişe iki kez girmesi (çift kayıt) veri tabanı
  seviyesinde unique kısıtla engellenir.

### 14.7 Quantum Seal — Veri Sahipliği ve Erişim
- Şifreli kayıt (`quantum_sealed_records`) çekilirken, yalnızca
  `owner_wallet` alanı imzalı isteği yapan cüzdanla eşleşiyorsa döner —
  bir kullanıcının başkasının şifreli verisini ID tahmin ederek çekmesi
  (IDOR açığı) engellenir.
- ID'ler tahmin edilebilir sıra numarası değil, rastgele UUID olur.
- Şifre çözme yalnızca client-side yapıldığı için, sunucu ele geçirilse
  bile düz metin sızmaz — ama sunucu yine de yetkisiz kullanıcıya şifreli
  blob'u dahi vermemelidir (savunma derinliği).

### 14.8 Ödül Para Kaynağı Doğrulaması (havuz zehirleme önlemi)
- Havuza yalnızca Bölüm 9.2'de tanımlı kaynaklardan (export ücreti, API
  ücreti, give-back wallet) gelen transferler "sayılır". Rastgele bir
  dışarıdan gönderilen SOL, havuz muhasebesini şişirmek/karıştırmak için
  kullanılamaz — ledger yalnızca bilinen kaynak imzalarını işler.
- Dağıtım miktarı, çekiliş penceresi KAPANDIĞI ANDAKİ havuz bakiyesine
  göre kilitlenir; böylece "kazanan belli olduktan sonra havuza para
  ekleyip/çekip ödülü oynatma" mümkün olmaz.

### 14.9 Genel İlke — Tek Yetki Noktası Olmaması
Kritik hiçbir işlem (ödül dağıtımı, NFT mint, havuz çekimi) tek bir
sunucu anahtarının veya tek bir kişinin kontrolünde olmamalı. Mümkün
olan her yerde on-chain program mantığı + çok-imzalı (multisig) yönetim
kullanılır; bu, sitenin kendi Trust Wall standardıyla (mint/freeze
authority revoked, multisig) tutarlıdır.

---

## 15. Test ve Kalite Kriterleri

*(v5'e ek olarak:)*
- **Commit-reveal bütünlük testi:** Katılım penceresi kapandıktan sonra
  listeye ekleme girişiminin reddedildiğini ve merkle root'un
  değişmediğini doğrulayan test.
- **Zamanlama saldırısı testi:** Hedeflenen pulse yayınlandıktan sonra
  gelen katılım isteğinin kesin olarak reddedildiğini doğrulayan test.
- **Replay saldırısı testi:** Aynı cüzdan imzasının ikinci kez
  kullanılamadığını doğrulayan test.
- **Erteleme testi:** CURBy erişilemezken ödüllü çekilişin ANU'ya
  DÜŞMEDİĞİNİ, ertelendiğini ve Beacon'da ilan edildiğini doğrulayan test.
- **Havuz tutarlılık testi:** On-chain havuz bakiyesi ile ledger
  aynasının uyuşmadığı senaryoda dağıtımın otomatik durduğunu doğrulayan
  test.
- **NFT-Beacon tutarlılık testi:** Her basılan sertifikanın, Beacon'daki
  ilgili draw kaydıyla birebir eşleştiğini doğrulayan test.
- **IDOR testi:** Bir kullanıcının, başkasının şifreli Seal kaydını
  ID ile çekmeye çalıştığında reddedildiğini doğrulayan test.
- **Sahte pulse testi:** İmzası/zaman penceresi doğrulanamayan bir
  pulse geldiğinde çekilişin yürütülmediğini doğrulayan test.
- **Havuz zehirleme testi:** Bilinmeyen bir kaynaktan gelen SOL'un havuz
  muhasebesini etkilemediğini doğrulayan test.
- **Çift kayıt testi:** Aynı cüzdanın aynı çekilişe iki kez giremediğini
  doğrulayan test.
- **Pencere uzatma testi:** Sunucu saati oynatılsa bile katılım
  penceresinin hedef pulse timestamp'ine göre kapandığını doğrulayan test.

---

## 16. UI/UX Standartları

*(v5'e ek olarak:)*
- `/quantum-core/rewards` sayfası, havuzun nasıl büyüdüğünü (kaynaklara
  göre kırılım) şeffafça gösterir — "gizemli bir ödül" değil, izlenebilir
  bir mekanizma hissi verir.
- Quantum Sertifika NFT'nin tanıtımında büyük, göz alıcı "kazandınız!"
  dilinden çok, "işte kanıtınız" çerçevesi kullanılır — bu, ürünün
  bilimsel/güvenilir konumlanışıyla tutarlıdır.

---

## 17. Faz Planı

**Faz 1 — MVP**
- Sürdürülebilir bakiye guard'ı
- Quantum Vault temel skor
- Quantum Draw (CURBy birincil, ANU fallback), yalnızca katılım —
  ödül havuzu henüz boş/sembolik başlar

**Faz 2**
- Ödül havuzu finansman kaynaklarının devreye alınması (export ücreti,
  API ücreti, give-back wallet payı)
- Quantum Sertifika NFT mint mekanizması
- Quantum Seal (Signal Bearer+)
- Quantum Forge — temel optimizasyon aracı (Signal Bearer+), önce iç
  kullanım (havuz/takvim dengeleme), sonra holder aracı

**Faz 3**
- Aylık "gerçek kuantum deneyimi" ödülü (Ghost Node)
- Karşılaştırma aracı, rapor export
- Forge'un çok-kısıtlı optimizasyon katmanı + Forge API (Ghost Node)
- Beacon hash'inin periyodik on-chain kaydı
- (İsteğe bağlı) Forge problemlerinin gerçek kuantum donanımına
  gönderilip klasik sonuçla karşılaştırılması — gösteri amaçlı

---

## 18. Claude Code Talimat Bloğu

```
GÖREV: gl1tch. projesine "Quantum Core" modülünü (Vault + Draw + Seal +
Forge + Ödül Mekanizması + Sertifika NFT) tamamen GL1TCH sahipliğine
bağlı şekilde ekle.

ÖNCELİK SIRASI:
1. Sürdürülebilir bakiye guard'ı (mevcut Proof-of-Signal altyapısı).
2. CURBy istemcisi (birincil) + ANU QRNG istemcisi (yalnızca fallback,
   her fallback kullanımı Beacon'da açıkça işaretlenir).
3. Vault, Draw, Seal modülleri.
4. Ödül havuzu ledger'ı ve otomatik (akıllı kontrat bazlı) dağıtım —
   HİÇBİR manuel/insan onaylı transfer olmayacak.
5. Quantum Sertifika NFT mint mekanizması, yalnızca doğrulanmış Beacon
   kayıtlarından tetiklenecek.

KESİN KURALLAR:
- Çekiliş yürütme ASLA dışarıdan çağrılabilir bir endpoint olamaz;
  yalnızca zamanlanmış sunucu-içi görevdir. Kullanıcılar yalnızca
  katılır (draw/enter).
- Commit-reveal sırası kesindir: liste dondurulur + merkle root
  yayınlanır → SONRA gelecekteki hedeflenen pulse kullanılır. Pulse
  yayınlandıktan sonra hiçbir katılım kabul edilmez.
- Ödüllü çekilişlerde CURBy erişilemezse fallback YOK, yalnızca
  erteleme var; erteleme Beacon'da ilan edilir.
- Cüzdan imzaları nonce + süre + endpoint bağlamı içerir; replay
  edilemez.
- Ödül havuzunun doğruluk kaynağı on-chain kontrattır; DB yalnızca
  aynadır; tutarsızlıkta dağıtım otomatik durur.
- Sunucu anahtarları KMS/secret manager'da tutulur, düz metin ortam
  değişkeninde ASLA.
- Ödül havuzu kurucunun/ekibin kişisel GL1TCH bakiyesinden ASLA
  beslenmez; yalnızca Bölüm 9.2'deki kaynaklardan gelir.
- CURBy/ANU çıktısı kriptografik anahtar materyali olarak KULLANILMAZ.
- Rank/bakiye, Draw'daki kazanma olasılığını ASLA etkilemez.
- Kendi kriptografi algoritması yazılmaz.
- Quantum Forge "kuantum-esinli" olarak etiketlenir; "gerçek kuantum
  bilgisayarda çalışıyor" DENMEZ. Her problemi klasikten iyi çözeceği
  iddia edilmez; yalnızca uygun problem tiplerinde kullanılır.
- Forge holder aracı yatırım tavsiyesi olarak sunulmaz; kullanıcının
  kendi tanımladığı kısıtları çözen bir hesap aracıdır.
- NFT'ler yatırım aracı olarak pazarlanmaz; kanıt/koleksiyon nesnesi
  olarak sunulur.
- Her hard-gate kontrolü sunucu tarafında yeniden doğrulanır.
```

---

## 18B. v9 Güncellemeleri — Boşluk Kapatma (bu bölüm önceki maddeleri EZER)

> Bu bölüm, spec incelemesinde tespit edilen 6 somut boşluğu kapatır ve
> gerçek/doğrulanmış kararlarla önceki maddeleri günceller. Amaç: spec'i
> gerçekten kurulabilir ve projenin mevcut mimarisiyle tutarlı hâle getirmek.

### 18B.1 Kayıp "v5" tabanı → satır-içi asgari tanımlar
"(v5 ile aynı)" diyen bölümler için v5 dokümanı repoda yok. Kurulacak
asgari, kendi kendine yeterli tanımlar:

- **Vault skoru (§6):** 5 sinyalden 0–100. Her sinyal 0–20:
  `authority` (mint+freeze null mı), `custody` (LP kilit/burn + top-holder
  yoğunluğu), `hygiene` (imza/nonce hijyeni, yeniden-kullanım yok),
  `operational` (deployer geçmişi — Signal Graph reputation), `transparency`
  (kaynak/sosyal/doğrulanabilirlik). Skor = toplam. Tier: 0–39 `caution`,
  40–69 `neutral`, 70–89 `ready`, 90–100 `hardened`. Bu bir SALDIRI riski
  değil, HAZIRLIK ölçüsüdür (§2). Girdiler mevcut `src/lib/scan.ts`
  çıktısından türetilir — yeni zincir okuması gerekmez.
- **Seal akışı (§8):** ML-KEM ile hibrit: `encapsulate(pubkey)` → shared
  secret; secret'tan AES-256-GCM anahtarı türet; veriyi client-side şifrele;
  yalnızca ciphertext + KEM ct saklanır. Çözme client-side (§14.7).

### 18B.2 Veri modeli → Railway-volume JSON (Postgres YOK)
§13'teki `table quantum_*` YANLIŞ — bu proje bilinçli olarak DB kullanmaz.
Tüm durum, bot'un Railway volume'ünde JSON dosyalarında tutulur ve site
bot'un HTTP köprüsünden okur/yazar (Signal Graph ile birebir aynı kalıp).
Kurulacak store: `bot/src/quantum-core/store.ts` (SignalGraphStore şablonu),
dosya `gl1tch-quantum-core.json` (`QUANTUM_CORE_FILE` env override). İçerik:
`draws[]` (drawId, type, windowOpen/Close, merkleRoot, participants[],
targetPulseRound, status, winner, pulse{round,cid,valueHash,timestamp}) +
`beacon[]` (append-only log). "table" ifadeleri bu store'un alanları olarak
okunmalı, SQL tablosu olarak değil.

### 18B.3 Kripto kütüphanesi → @noble/post-quantum (liboqs DEĞİL)
§8/§46 `liboqs` native C — Vercel serverless'ta uygun değil. Kurulacak:
**`@noble/post-quantum`** (saf JS, FIPS 203 ML-KEM-768, denetlenmiş) +
`@noble/hashes`. Kendi kripto yazılmaz (§18 kuralı korunur); sadece
kütüphane değişti.

### 18B.4 CURBy gerçek API (doğrulandı, canlı)
Endpoint: `https://random.colorado.edu/api/curbyq/round/latest`
(+ `/api/curbyq/round/{index}` ve bit çıkarımı için `.../data`). Format
**Twine/IPLD**: kayıt = `{cid, data:{content, signature}}`; `content` =
`{chain, index, links, mixins, payload, source}`; `payload` =
`{parameters:{isQuantum, nBitsOut:512, ...}, round, stage, timestamp}`.
**Kritik:** Beacon çok-aşamalıdır — `stage:"request"` (isQuantum:false,
henüz değer yok) → tamamlanınca değer aşaması. Client:
1. En son TAMAMLANMIŞ value-aşaması round'unu hedefler (request-aşamasını
   pulse olarak KULLANMAZ).
2. 512-bit değeri `/data` ucundan çeker; `data.signature` varlığını,
   `content.index/round` ve `timestamp`'in beklenen pencerede olduğunu
   doğrular (§14.5).
3. Doğrulanamazsa çekiliş yürütülmez, ertelenir, Beacon'a yazılır.
Bu, §7'deki "pulse"un aslında aşama-farkındalıklı bir Twine round'u
olduğu gerçeğini netleştirir.

### 18B.5 Zamanlama → bot-cron (Vercel Hobby cron = günde 1, yetersiz)
Draw executor Vercel'de değil, **bot'ta zamanlanmış görev** olarak çalışır
(radar ping ile aynı kalıp: `setInterval`, `bot/src/index.ts`). Executor
dışarıdan çağrılamaz (§14.4 korunur); yalnızca pencere kapanınca merkle
root'u dondurur, gelecekteki CURBy round'unu hedefler, tamamlanınca kazananı
hesaplar ve Beacon'a yazar. Site yalnızca `draw/enter` (imza-authed) ve
salt-okunur `draw/status` + `beacon` uçlarını sunar.

### 18B.6 EN KRİTİK — Non-custodial sınırı (SOL custody = Faz 2, founder-gated + audit)
§9-10'daki SOL ödül havuzu + NFT mint, **projenin sert değişmezleriyle
çelişir**: non-custodial, asla key custody, CI'da fon/onay-imzası yasak,
Trust Wall standardı. Bu yüzden:

- **Faz 1 (bu kurulum) TAMAMEN NON-CUSTODIAL'dır.** Hiçbir SOL tutulmaz/
  taşınmaz, hiçbir mint hot-key'i sunucuda bulunmaz. Draw kazananı
  **doğrulanabilir bir Beacon kaydı + kanıt** kazanır (parasal ödül değil).
  Bu, §9.4'ün "başlangıçta boş/sembolik havuz" ve Faz planının kendisiyle
  uyumludur.
- **SOL ödül havuzu, otomatik dağıtım ve on-chain NFT mint (§9.3, §10, §14.1,
  §14.2, §14.8) Faz 2'ye ertelenir** ve yalnızca: (a) bağımsız akıllı-kontrat
  audit'i, (b) KMS/multisig anahtar yönetimi, (c) kurucunun açık onayı ile
  devreye alınır. Bu bölümler tasarım olarak korunur ama Faz 1'de KOD
  ÜRETİLMEZ.
- Faz 1'de "sertifika", on-chain NFT değil, **Beacon'daki imzalı, yeniden-
  hesaplanabilir kazanan kaydıdır** (aynı kanıt değeri, sıfır custody).

### 18B.7 Yol eşlemesi
Spec'teki `/app`, `/lib` → gerçek repo `src/app`, `src/lib`. Bot tarafı
`bot/src/quantum-core/`. Site→bot köprü tabanı env `SCAN_STATS_URL`.

---

## 19. Terimler Sözlüğü

*(v5'teki tüm terimlere ek olarak:)*
- **CURBy:** NIST ve Colorado Üniversitesi'nin geliştirdiği, Bell testi
  (kuantum dolanıklık deneyi) tabanlı, sertifikalanmış ve izlenebilir
  kamu kuantum rastgelelik servisi.
- **Bell Testi:** Kuantum dolanıklığın klasik fizikle açıklanamayacağını
  kanıtlayan bir deney türü; CURBy bu deneyin sonuçlarını rastgelelik
  kaynağı olarak kullanır.
- **Pulse:** CURBy'nin belirli aralıklarla yayınladığı, zaman damgalı ve
  imzalı rastgele değer paketi.
- **Kuantum-Esinli Optimizasyon (Quantum-Inspired Optimization):** Kuantum
  fiziğinin optimizasyon dinamiklerini (örn. tünelleme, tavlama) taklit
  eden, ancak klasik donanımda çalışan algoritmalar. Gerçek kuantum
  donanımı gerektirmez, bugün ölçülebilir kazanç sağlar.
- **QUBO / Ising:** Kombinatoryal optimizasyon problemlerini bir "enerji
  manzarası" olarak ifade eden standart matematiksel formülasyonlar; hem
  kuantum-esinli çözücüler hem de gerçek kuantum donanımı bu formatı
  kullanır (bu yüzden gelecek uyumludur).
