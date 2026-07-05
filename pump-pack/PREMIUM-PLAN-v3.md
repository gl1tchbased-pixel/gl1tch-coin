# GL1TCH — Premium Scanner & Büyüme Geliştirme Planı (v3)

**Hedef:** GL1TCH'in mevcut scanner ürününü, piyasadaki hiçbir meme coin güvenlik aracının yapmadığı seviyeye taşımak. Öncelik sırası: **(1) kullanıcı güvenliği ve yararı, (2) güven/kredibilite, (3) büyüme**. Büyüme, güvenden ödün vererek elde edilirse kalıcı değildir — bu plan bilinçli olarak bu sırayı izler. Marka teması ("Infect The Internet", sinyal/virüs metaforu) her fazda korunmalı.

**Mevcut altyapı (referans):** Next.js tabanlı site, `/scan`, `/radar`, `/proof`, `/ranks`, `/live`, `/whitepaper` sayfaları mevcut. Rank sistemi bakiyeye göre 5 tier (Observer → Ghost Node). Scanner zaten AI verdict, deployer geçmişi, shareable card ve embeddable badge üretiyor. Bu plan mevcut scanner motorunu **temel katman** olarak kullanır, üzerine inşa eder — sıfırdan yazmaz.

**Genel prensip:** Her faz bir öncekinin verisini/altyapısını kullanır. Sıra teknik bağımlılığa göre optimize edilmiştir, pazarlama önceliğine göre değil. Güvenlik fazı (Faz -1) hiçbir istisna olmadan diğer tüm fazlardan önce gelir çünkü kripto alanında kullanıcı güveni tek seferlik bir güvenlik hatasıyla kalıcı olarak kaybedilir.

**v3'te değişen:** Bu revizyon, dağınık halde duran iki çekirdek fikri (deployer/fon/cüzdan/tarama verisinin birleştiği veri omurgası ve itibar tabanlı tahmin mekaniği) tek bir isimlendirilmiş mimariye bağlıyor: **Signal Graph** ve **Proof-of-Signal**. Ayrıca rakip farklılaştırma matrisi, önerilen teknik yığın, detaylı test stratejisi, risk kaydı ve çok zincirli genişleme yol haritası eklendi. Bunlar önceki versiyonda ya hiç yoktu ya da fazlara dağılmış, isimsiz haldeydi.

---

## Çekirdek Mimari: Signal Graph & Proof-of-Signal

Bu iki kavram artık plandaki her fazın referans vereceği **isimlendirilmiş, tek kaynaklı** yapı taşlarıdır. Daha önce "deployer verisi", "katkı puanı", "kümeleme motoru" gibi farklı fazlarda farklı isimlerle geçen parçalar aslında aynı iki sistemin uzantısıydı — isimsiz kalmaları hem iç tutarlılığı hem de dışa anlatılan hikâyeyi zayıflatıyordu.

### Signal Graph (Veri Omurgası)
Deployer, cüzdan, fonlama kaynağı ve tarama sonuçlarını tek bir ilişkisel grafiğe bağlayan, her fazın üzerine inşa ettiği **birikimli** veri katmanı.

- **Düğüm tipleri:** `deployer`, `wallet`, `funding_source`, `token`, `scan_result`.
- **Kenar tipleri:** `deployed_by`, `funded_by`, `co_funded_with`, `scanned_as`, `clustered_with`.
- **Faz 0:** İlk şema (`deployer_id → [token_id, launch_date, outcome]`) burada doğar.
- **Faz 1:** Fonlama kaynağı analizi, sniper kümesi tespiti ve benzer-desen tespiti bu grafiği sorgular ve zenginleştirir.
- **Faz 2:** Portföy izleme, kullanıcı cüzdanlarını grafiğe yeni bir düğüm tipi olarak ekler (izin/bağlantı verisi değil, yalnızca "hangi token'ları izliyor" ilişkisi).
- **Faz 3:** Outbreak Map, grafikteki olayları zaman damgalı bir akışa çevirip görselleştirir.
- **Faz 6:** API, Signal Graph'in salt-okunur bir kesitini dışa açar (partner'lar ham grafiğe değil, hesaplanmış skorlara erişir — bu ayrım güvenlik ve maliyet için kritik).
- **Mimari kural:** Basit tablo/SQL ile başla (Faz 0-1), veri hacmi büyüdükçe (tahmini eşik: >500K düğüm veya sorgu gecikmesi >500ms) recursive CTE'den ayrı bir graph veritabanına (ör. Neo4j, veya Postgres + Apache AGE) geçişe hazır ol. Bu geçiş kararı erken sabitlenmemeli, ölçüm tetiklemeli.

### Proof-of-Signal (İtibar Mekaniği)
Kullanıcıların token'ların risk durumu hakkında **finansal bahis değil, itibar bahsi** yaptığı tahmin sistemi. Faz 0'daki "Katkı Puanı" fikrinin olgunlaşmış, markalı ve `/proof` sayfasına oturan hâli.

- **Mekanik:** Kullanıcı bir token için "riskli" veya "temiz" tahmini yapar (mevcut rank/tier ile orantılı bir "ağırlık" taşır — bakiye değil, geçmiş doğruluk oranı ağırlığı belirler). Sonuç (rug oldu/olmadı) doğrulandığında tahmin puanlanır.
- **Neden token değil rank:** Finansal bahis mekaniği hem düzenleyici risk taşır (kumar/bahis algısı) hem de "parası olan kazanır" dinamiğine kayar — bu markanın "temel koruma ücretsiz" ilkesiyle doğrudan çelişir. Rank/itibar ağırlıklı sistem, doğru tahmin geçmişi olan kullanıcının sesinin daha çok saymasını sağlar, cüzdanının büyüklüğünün değil.
- **/proof sayfası dönüşümü:** Statik bir "kanıt" sayfasından, herkese açık bir **itibar liderlik tablosuna** (leaderboard) dönüşür — en yüksek doğruluk oranına sahip kullanıcılar, tahmin geçmişleri ve doğruluk yüzdeleriyle görünür. Bu hem gamification hem de sosyal kanıt (kimin tahminlerine güvenilir) sağlar.
- **Kötüye kullanım koruması:** Faz 0'daki sybil/anti-gaming kuralı (cüzdan yaşı, tekilleştirme) doğrudan burada geçerli; Faz 1'in fonlama kümeleme motoru olgunlaştıkça "ortak fonlama kaynağından beslenen çoklu tahmin hesabı" tespiti bu motora bağlanır.
- **İleride kullanım alanı (opsiyonel, erken vaat edilmez):** Yüksek doğruluk skoru olan kullanıcılar, Faz 1'deki itiraz inceleme kuyruğuna "topluluk gözden geçirici" olarak katkı sunabilir hâle gelebilir — ama bu yalnızca sistem olgunlaştıktan sonra, ayrı bir karar olarak değerlendirilmeli, bu fazda taahhüt edilmiyor.

**Kabul kriteri (bu bölüm için):** Faz 0 ve Faz 6 dokümantasyonunda "Katkı Puanı" yerine "Proof-of-Signal" terimi tutarlı şekilde kullanılıyor; `/proof` sayfası leaderboard olarak yeniden tasarlanmış; Signal Graph şeması tek bir yerde (ör. `docs/signal-graph-schema.md`) merkezi olarak dokümante edilmiş ve her faz kendi eklediği düğüm/kenar tipini bu dosyaya işlemekle yükümlü.

---

## Claude Code İçin Talimatlar

Bu dosya faz faz, sırayla uygulanmak üzere tasarlanmıştır. Claude Code bu planla çalışırken şu kurallara uymalı:

1. **Sıra dışına çıkma:** Faz -1 tamamlanmadan (veya en azından o fazın "Zorunlu Kabul Kriterleri" karşılanmadan) hiçbir sonraki faz koda dökülmemeli. Özellikle cüzdan bağlama (Faz 2) ve embed/extension (Faz 3-4) güvenlik temelleri olmadan asla uygulamaya alınmamalı.
2. **Gizli anahtar/secret asla kod içine yazılmaz.** Tüm API anahtarları, RPC endpoint'leri, bot token'ları `.env` üzerinden okunmalı, `.env` dosyası `.gitignore`'da olmalı, repoya hiçbir zaman commit edilmemeli. Claude Code bir secret'ın kod içine hardcode edildiğini fark ederse işlemi durdurup kullanıcıyı uyarmalı.
3. **Güvenlik etkisi olan her görev için** (cüzdan bağlama, imza doğrulama, API auth, extension izinleri, embed script) bir cümlelik "bu neden güvenli" gerekçesi kod yorumunda veya PR açıklamasında belirtilmeli.
4. **Para harcayan veya geri alınamaz aksiyonlar** (üçüncü parti API'ye ücretli abonelik, prod ortama deploy, kullanıcı verisi silme, canlıya "rug_onaylandı" etiketi basan bir otomasyon) kullanıcı onayı olmadan asla otomatik tetiklenmemeli.
5. Her fazın sonunda, o fazın **Kabul Kriterleri**'nin karşılandığını gösteren kısa bir özet (hangi dosyalar değişti, hangi testler eklendi, hangi güvenlik kontrolü yapıldı) üretilmeli.
6. Mevcut kod stiline, sayfa yapısına ve marka tonuna ("don't trust, verify") sadık kalınmalı — bu ilke sadece pazarlama dili değil, mimari bir zorunluluktur: **hiçbir özellik kullanıcının "doğrula" hakkını azaltmamalı.**
7. Bir görev sırasında bu planda öngörülmemiş bir güvenlik açığı fark edilirse (örn. bir kütüphanenin bilinen bir CVE'si), sessizce geçilmez — kullanıcıya bildirilir ve görev, açık kapatılana kadar askıya alınır.
8. **Skorlama/kural motorunda yapılan her değişiklik**, Faz 1'de tanımlanan metodoloji değişiklik günlüğüne (`docs/scoring-changelog.md`) tarih + gerekçe ile eklenmeli — bu bir "sonra yaparım" görevi değil, ilgili PR'ın parçası.
9. **Signal Graph şemasına yeni bir düğüm/kenar tipi eklendiğinde**, `docs/signal-graph-schema.md` aynı PR içinde güncellenmeli. Şema dokümantasyonu koddan geride kalırsa, sonraki fazların üzerine inşa ettiği zemin güvenilmez hale gelir.
10. **Riskli/geri dönüşü zor bir teknik karar** (ör. veritabanı değişimi, üçüncü parti sağlayıcı seçimi) verilmeden önce, aşağıdaki Risk Kaydı bölümüne kısa bir giriş eklenmeli — karar sessizce alınmamalı.
11. **Feature flag disiplini:** Kullanıcı davranışını değiştiren büyük özellikler (yeni skor formülü, yeni bildirim kanalı) mümkünse bir feature flag arkasında aşamalı açılmalı; anında %100 kullanıcıya geçiş, geri alınamaz bir hata riskini büyütür.

---

## FAZ -1 — Güvenlik, Operasyon ve Güven Temeli (Zorunlu Ön Koşul)

**Amaç:** Sonraki hiçbir fazın "sonradan güvenlik eklerim" veya "sonradan süreç kurarım" diyerek başlamaması. Kripto ürünlerinde en büyük itibar kaybı nedeni ya çalınan kullanıcı fonları ya da sızan kullanıcı verisidir; ikinci en büyük neden ise "güveniyorduk ama alt yapıları amatördü" algısıdır (yedeksiz veritabanı, test edilmemiş release, korumasız admin paneli). Bu faz üçünü de yapısal olarak imkânsızlaştırmayı hedefler.

### Görevler

- [ ] **Cüzdan etkileşimi için "asla imza istemeyen" mimari kararı:** GL1TCH'in hiçbir bileşeni (şimdi veya gelecekte) `eth_sendTransaction`, token approval, `setApprovalForAll` veya benzeri fon hareketi/yetki devri isteyen bir çağrı yapmamalı. Yalnızca **cüzdan sahipliğini doğrulayan imza** (bkz. Faz 2 — SIWE benzeri nonce tabanlı mesaj imzası) kullanılabilir. Bu kural kod tabanında bir lint kuralı veya CI kontrolüyle (örn. yasaklı fonksiyon çağrılarını arayan bir statik analiz adımı) teknik olarak zorlanmalı, sadece dokümanda yazmamalı.
- [ ] **Tehdit modeli (threat model) dokümanı:** Kod yazılmadan önce kısa bir tehdit modeli çıkarılsın — kim saldırır (rakip proje, sybil kullanıcı, drainer operatörü, script kiddie), hangi varlık değerlidir (kullanıcı güveni, skor bütünlüğü, cüzdan verisi, admin erişimi), hangi giriş noktaları var. Bu doküman `docs/threat-model.md` olarak tutulup her büyük fazdan önce (özellikle Faz 2, 4, 6) gözden geçirilmeli. Uzun bir güvenlik denetimi değil, yarım sayfalık bir "en kötü ne olabilir" listesi yeterli.
- [ ] **Secrets & ortam yönetimi:** Tüm API anahtarları/RPC key'leri için `.env` + secret manager (örn. Vercel/Cloud secret store) kullanımı standartlaştırılsın; repo taramasından geçen bir "secret leak" kontrolü (örn. gitleaks) CI'a eklensin. **Secret rotasyon takvimi** de burada tanımlansın (ör. RPC/bot key'leri 90 günde bir, herhangi bir sızıntı şüphesinde derhal).
- [ ] **Bağımlılık/tedarik zinciri güvenliği:** `npm audit` / Dependabot veya benzeri bir SCA (software composition analysis) aracı CI pipeline'ına eklensin; kritik/yüksek seviyeli açığı olan paket merge edilemesin.
- [ ] **Temel HTTP güvenlik başlıkları:** HTTPS zorunlu + HSTS, Content-Security-Policy (özellikle inline script'i kısıtlayan), X-Frame-Options/frame-ancestors, X-Content-Type-Options tüm sayfalarda standart olarak uygulansın. Bu, Faz 3'teki embed widget ve Faz 4'teki extension için de temel oluşturur.
- [ ] **Girdi doğrulama standardı:** Kullanıcıdan/URL'den gelen her değer (kontrat adresi, cüzdan adresi, arama sorgusu) için merkezi bir doğrulama katmanı (adres formatı, uzunluk, karakter seti) tanımlansın — hem güvenlik hem de hatalı taramaların önlenmesi için.
- [ ] **Rate limiting & temel DDoS koruması:** `/scan` dahil tüm public endpoint'ler için IP/cüzdan bazlı rate-limit ve bir edge/WAF katmanı (Cloudflare vb.) standart olarak tanımlansın — bu, sonraki fazlardaki (Faz 3 Outbreak Map, Faz 6 API) her yeni public endpoint için tekrar tekrar konuşulmasın diye burada bir kere netleştirilir.
- [ ] **Loglama, izleme ve olay müdahale (incident response) planı:** Anormal trafik, başarısız imza doğrulama denemeleri, API kötüye kullanımı gibi olaylar için temel bir alerting mekanizması ve "bir güvenlik olayı olursa ilk 1 saatte ne yapılır" kısa bir runbook yazılsın. **Yapılandırılmış hata izleme (ör. Sentry veya benzeri)** en baştan kurulmalı — prod'daki bir hata, kullanıcı şikâyet edene kadar fark edilmemeli.
- [ ] **Bağımsız güvenlik incelemesi takvimi:** En geç Faz 2 (cüzdan bağlama) canlıya alınmadan önce, en az bir bağımsız/otomatize güvenlik taraması (örn. OWASP ZAP taraması veya harici bir freelance pentest) planlansın; büyüdükçe (Faz 6 API canlıya alınmadan önce) tam kapsamlı bir pentest hedeflensin.
- [ ] **Test & release süreci:** Staging (prod-benzeri ama izole) ortam kurulsun; her değişiklik önce staging'de test edilsin. Ana dala (main/production branch) doğrudan push kapatılsın — en az bir kod incelemesi (self-review olsa dahi, değişiklik özeti + etki analizi) zorunlu olsun. Kritik akışlar (imza doğrulama, ödeme/tier mantığı, scoring motoru) için otomatik test paketi olmadan bu akışlara dokunan bir PR merge edilemesin. Geri alma (rollback) prosedürü — bir deploy sorun çıkarırsa önceki sürüme dönüş süresi — dokümante edilsin. (Detaylı test piramidi için aşağıdaki "Test Stratejisi" bölümüne bkz.)
- [ ] **Felaket kurtarma (disaster recovery) ve yedekleme:** Veritabanının otomatik, düzenli (ör. günlük) yedeği alınsın; yedekten geri yükleme en az bir kez fiilen test edilsin (yedek var ama çalışmıyor, en sık rastlanan DR hatasıdır). "Ana sağlayıcı (hosting/RPC/DB) çökerse ilk 1 saatte ne yapılır" kısa bir runbook yazılsın.
- [ ] **İç ekip ve admin paneli erişim güvenliği:** İtiraz kuyruğunu inceleme, kullanıcı verisine erişim, scoring kuralını değiştirme gibi yetkiler içeren bir admin paneli varsa/olacaksa, bu panel rol bazlı yetkilendirme (kimin ne yapabileceği ayrı ayrı tanımlı) ve zorunlu 2FA ile korunmalı. Dış dünyaya kapalı bu panel, aslında kullanıcı verisine en geniş erişimi olan yüzey olduğu için dış güvenlik kadar ciddiye alınmalı.
- [ ] **Analytics ve çerez rızası:** Büyüme metriklerini ölçmek için kurulacak analytics altyapısı (Faz bazlı metrik tablosuna bkz.) baştan gizlilik-öncelikli seçilmeli (mümkünse cookieless/first-party bir araç); kişisel veri toplayan herhangi bir analytics/pixel kullanılacaksa KVKK/GDPR uyumlu bir çerez rızası (cookie consent) banner'ı olmadan devreye alınmamalı — bu, Faz -1'deki veri minimizasyonu ilkesinin doğal bir uzantısıdır.
- [ ] **Veri minimizasyonu ilkesi:** Hangi kullanıcı verisinin (cüzdan adresi, IP, tarama geçmişi) toplanacağı, ne kadar saklanacağı ve neden gerekli olduğu baştan yazılı hale getirilsin — "gerekmedikçe toplama" varsayılan davranış olsun. Faz 2'deki KVKK/GDPR politikası bu ilkeye dayanacak.

### Zorunlu Kabul Kriterleri (sonraki fazlar bunlar olmadan başlamaz)
- Cüzdan imzalama akışı asla fon/yetki transferi istemeyecek şekilde mimariye kilitlenmiş ve bu CI'da kontrol ediliyor.
- Tehdit modeli dokümanı yazılmış ve `docs/threat-model.md` altında erişilebilir.
- Hiçbir secret repoda yok; CI'da secret-leak taraması aktif; rotasyon takvimi yazılı.
- CI'da bağımlılık güvenlik taraması aktif ve kritik açıkta build kırılıyor.
- Temel güvenlik header'ları (CSP, HSTS vb.) tüm sayfalarda uygulanmış.
- Rate limiting en az `/scan` endpoint'inde çalışıyor.
- Hata izleme (error tracking) prod ortamında aktif ve en az bir test hatasıyla doğrulanmış.
- Veri minimizasyonu ve saklama ilkesi bir sayfada (taslak da olsa) yazılı.
- Staging ortamı mevcut; en az bir deploy staging → prod akışıyla test edilmiş; rollback prosedürü dokümante edilmiş.
- Veritabanı yedeği alınıyor ve en az bir kez geri yükleme testi yapılmış.
- Admin paneli varsa rol bazlı yetki + 2FA ile korunuyor.
- Kişisel veri toplayan herhangi bir analytics aracı, çerez rızası mekanizması olmadan devrede değil.

---

## FAZ 0 — Hızlı Kazanımlar (Temel Katman Güçlendirme)

**Amaç:** Mevcut scanner'ı, sonraki fazların üzerine oturacağı sağlam bir temel haline getirmek. Düşük efor, hemen görünür fark.

### Görevler
- [ ] **Temel korumanın token'dan bağımsızlığı (en yüksek öncelikli ilke):** Mevcut rank sistemi bakiyeye (GL1TCH'in kendi token'ı) dayanıyor. Bu fazdan itibaren net bir sınır çizilmeli: **temel tarama, sade dil açıklaması ve Immunity Score (Faz 1) hiçbir koşulda token bakiyesine veya satın almaya bağlanmaz** — bunlar herkese ücretsiz kalır. Bakiye/rank sistemi yalnızca kozmetik veya ek konfor özellikleri (rozet, öncelikli destek, gelişmiş filtre gibi) için kullanılabilir. Gerekçe: bir güvenlik aracının "korunmak için önce bizim varlığımızı satın al" demesi, tam olarak önlemeye çalıştığı güven sorununu markanın kendisine taşır. Bu kural `/whitepaper` veya benzer bir sayfada açıkça yazılmalı ve sonraki hiçbir fazda (özellikle Faz 6 monetizasyon) ihlal edilmemeli.
- [ ] **Token bazlı tier eşikleri (somut rakamlar):** GL1TCH'in toplam arzı 1 milyar, kurucuda ~%4,11 (~41,1M) bulunuyor; dolaşımdaki kısım ~958,9M olarak kabul edilerek aşağıdaki eşikler tanımlanır. Bu eşikler yalnızca **konfor/hız katmanını** açar, skorun kendisini asla:

  | Tier | Bakiye eşiği | Dolaşımın % (~959M üzerinden) | Açılan konfor katmanı |
  |---|---|---|---|
  | Observer | 0 | — | Tam tarama + Immunity Score (herkeste zaten ücretsiz) |
  | Scout | 100.000 | ~%0,01 | Watchlist limiti artışı, günlük Proof-of-Signal XP bonusu, temel rozet |
  | Sentinel | 500.000 | ~%0,05 | Hızlandırılmış bildirim (dakika yerine saniyeler — Faz 2 fast-path), portföy skoru detay görünümü |
  | Operative | 2.500.000 | ~%0,26 | İndirilebilir tam deployer/cüzdan raporu (Faz 6), webhook erişimi |
  | Ghost Node | 10.000.000 | ~%1,04 | API erişimi (Faz 6), leaderboard'da özel rozet, öncelikli destek |

  **Tutma süresi (anti-flash-loan/anti-manipülasyon) şartı:** Tier hesaplaması anlık bakiyeye değil, **son 7 günün ortalama/minimum bakiyesine** (snapshot tabanlı) dayanmalı — aksi halde bir kullanıcı yalnızca eşiği anlık geçmek için token alıp hemen satabilir ve sistem anlamını yitirir. Bu kural bir CI/iş kuralı testiyle doğrulanmalı (ör. "bakiye eşiği geçti ama 7 günlük ortalama altında" senaryosu tier açmamalı).
  **Eşiklerin gözden geçirilmesi:** Bu rakamlar sabit değildir — token fiyatı/piyasa değeri önemli ölçüde değişirse (ör. dolaşımın büyük kısmı az sayıda cüzdanda toplanırsa) eşikler yeniden kalibre edilmeli; bu karar Risk Kaydı'na not düşülmeli.
  **Tier doğrulama güvenlik mimarisi (zorunlu, aksi hâlde açık kapı):**
  - Tier hesaplaması **yalnızca sunucu tarafında**, imza ile sahipliği doğrulanmış bir cüzdan adresi üzerinden yapılır — istemci (tarayıcı) tarafından gönderilen bir tier/bakiye değeri asla doğrudan güvenilip kabul edilmez. Sunucu her seferinde bakiyeyi kendi RPC sorgusuyla yeniden hesaplar.
  - **İmzasız/sahiplik doğrulanmamış adres için tier sorgusu yapılmaz** — Faz 2'deki nonce + domain-binding imza akışı, tier hesaplamasının ön koşuludur; bu iki sistem aynı doğrulama katmanını paylaşmalı, ayrı ayrı yazılmamalı.
  - **Periyodik yeniden değerlendirme:** Tier bir kez hesaplanıp donmamalı — günlük bir cron/job ile 7 günlük ortalama yeniden hesaplanmalı; token satılırsa tier de buna göre düşmeli.
  - **Bakiye sorgu endpoint'i rate-limit'e tabi olmalı** (Faz -1 standardı) — aksi halde bu endpoint başka kullanıcıların cüzdan bakiyelerini toplu sorgulamak için kötüye kullanılabilir (gizlilik riski).
  - **Sybil/çoklu cüzdan istismarı:** Tier'a bağlı herhangi bir teşvik (rozet, XP bonusu vb.) birden fazla cüzdana dağıtılan aynı kaynaktan token ile çoğaltılabilir; Faz 1'deki Signal Graph ortak fonlama tespiti bu senaryoyu da kapsayacak şekilde genişletilmeli.
  - **Phishing/sahte site riski (kullanıcı tarafı):** Gerçek tehdit genelde GL1TCH'in kendisinde değil, kopya/sahte bir sitenin "sadece imzala" diyerek aslında fon transferi transaction'ı imzalatmasındadır. Resmi/denetlenmiş wallet-adapter kütüphanesi kullanımı ve imza mesajının içeriğinin kullanıcıya açıkça gösterilmesi (Faz 2'deki "bu imza fon yetkisi vermez" metni) bu riski azaltır ama tamamen ortadan kaldırmaz — bu nedenle kullanıcı eğitimi (`/whitepaper` veya yardım sayfasında "gerçek GL1TCH imza isteği nasıl görünür" açıklaması) ayrı bir görev olarak eklenmeli.
- [ ] **Sade dil risk motoru:** Mevcut sayısal/teknik skor çıktısının (mint authority, freeze authority, tax, LP lock vb.) yanına, her bulgu için düz cümle açıklama üreten bir katman ekle. Örn: "mint_authority: active" → "Bu projenin kurucusu istediği zaman yeni token basabilir, elindeki payı sulandırabilir." Dil her zaman **olasılık/tanım dili** olmalı, suçlama dili değil (bkz. Hukuki bölüm).
- [ ] **Signal Graph v0 şeması:** Yukarıdaki "Çekirdek Mimari" bölümünde tanımlanan `deployer`, `wallet`, `funding_source`, `token`, `scan_result` düğüm tiplerinin ilk sürümünü kur (`deployer_id → [token_id, launch_date, outcome]` ile başla, ama şemayı `docs/signal-graph-schema.md` içinde tam düğüm/kenar listesiyle dokümante et — sonraki fazlar bu dosyayı genişletecek).
- [ ] **Proof-of-Signal v0 (Scan-to-Rank entegrasyonu):** Mevcut rank sistemine (`/ranks`) yeni bir XP ekseni ekle: tarama yapma, doğru "riskli" tahmini (sonradan rug olduğu doğrulanan token'ı erken işaretleme) gibi aksiyonlar puan kazandırsın. Bakiye + aktivite kombinasyonu ile rank hesaplansın (mevcut bakiye-only mantığını bozmadan, üstüne ek "Proof-of-Signal puanı" olarak — tam leaderboard deneyimi Faz 6'da tamamlanır). **Kullanıcı yararı notu:** puanlama sistemi kullanıcıyı gerçek dışı/aşırı sık tarama yapmaya (dark pattern / bağımlılık döngüsü) teşvik etmemeli; günlük makul bir üst limit ("diminishing returns") tasarlanmalı.
- [ ] **Veri kaynağı netleştirme:** Deployer/tx geçmişi için hangi RPC/indexer kullanılacağı (kendi node, Helius, QuickNode vb.) ve rate-limit/maliyet tahmini dokümante edilsin — Faz 1-3 bu veriye yoğun şekilde bağımlı olacak. Faz 1'deki honeypot simülasyonu ayrıca bir **transaction simulation** yeteneği olan bir RPC/sağlayıcı gerektirir — bu maliyet kalemi de burada, erken aşamada tahmin edilmeli, Faz 1'e gelindiğinde sürpriz olmamalı. (Somut sağlayıcı önerileri için "Önerilen Teknik Yığın" bölümüne bkz.)
- [ ] **Proof-of-Signal kötüye kullanım koruması:** "Doğru riskli tahmin" puanlaması sybil hesaplar veya toplu/otomatik oylamayla manipüle edilebilir. Cüzdan yaşı, geçmiş aktivite, tekilleştirme (rate-limit per wallet/IP) gibi temel bir anti-gaming kuralı bu fazda tanımlanmalı; sonraki fazlara "temiz" bir puanlama mirası bırakılsın. **İleriye dönük not:** Faz 1'de kurulacak fonlama-kaynağı kümeleme motoru (Signal Graph'in bir parçası) olgunlaştığında, bu basit kural seti aynı motoru kullanarak "ortak fonlama kaynağından beslenen çoklu oy veren cüzdan" gibi çok daha güçlü bir sybil tespitine yükseltilmeli — iki ayrı anti-gaming sistemi bakımı yerine tek bir Signal Graph altyapısının tekrar kullanılması hedeflenmeli.
- [ ] **Scan endpoint'i için SSRF/kötüye kullanım koruması:** Tarama sırasında dışarıdan gelen bir adres/URL parametresi hiçbir zaman doğrudan sunucu tarafında keyfi bir dış isteğe (fetch) parametre olarak geçirilmemeli — yalnızca beklenen formatta (Solana adresi vb.) doğrulanmış girdiler işlensin (Faz -1'deki merkezi girdi doğrulama katmanını kullan).

### Kabul Kriterleri
- Scanner sonuç sayfasında her teknik bulgunun yanında sade dil açıklaması görünüyor.
- `/ranks` sayfasında kullanıcı hem bakiye hem aktivite bazlı ilerlemesini görebiliyor.
- Signal Graph v0 şeması `docs/signal-graph-schema.md` içinde dokümante edilmiş ve deployer verisi bu şemaya göre tekrar kullanılabilir bir API/DB tablosu olarak mevcut.
- Tier eşikleri (Scout/Sentinel/Operative/Ghost Node) 7 günlük ortalama/minimum bakiye snapshot'ına göre hesaplanıyor; anlık bakiye ile tier açmaya çalışan bir test senaryosu başarısız oluyor (yani sistem doğru şekilde reddediyor).
- Tier hesaplaması yalnızca sunucu tarafında, imza ile doğrulanmış cüzdan üzerinden yapılıyor; istemciden gelen bir tier/bakiye değerinin doğrudan kabul edilmediği bir testle doğrulanmış. Bakiye sorgu endpoint'i rate-limit'e tabi.
- Proof-of-Signal puanlama sistemi için temel bir anti-gaming/rate-limit kuralı uygulanmış ve dokümante edilmiş.
- Scan endpoint'i girdi doğrulamasından geçmeyen hiçbir isteği işlemiyor.
- Temel tarama ve sade dil açıklaması, token bakiyesi/tier kontrolü olmadan herkese açık şekilde çalışıyor — bu bir kod incelemesiyle doğrulanmış.

---

## FAZ 1 — Immunity Score (Öngörücü Risk Skoru)

**Amaç:** Rakiplerin hepsi (RugCheck, SolSniffer) **reaktif** çalışıyor — olay olmuş bitmiş bulguları listeliyor. GL1TCH, rug olmadan önce olasılık tahmini yapan ilk halka açık araç olsun. (Somut farklılaşma noktaları için aşağıdaki "Rakip Farklılaştırma Matrisi" bölümüne bkz.)

### Görevler
- [ ] **Deployer kümeleme modeli (Signal Graph üzerinde):** Aynı deployer'ın/fonlama kaynağının geçmişte çıkardığı projelerin sonuçlarına bakan bir skorlama (Faz 0'daki Signal Graph şemasını kullan ve genişlet).
- [ ] **Fonlama kaynağı analizi:** Token'ı launch eden cüzdana SOL'un nereden geldiğini takip et (aynı kaynak → önceden rug yapmış başka cüzdanlarla bağlantı var mı) — bu ilişki Signal Graph'e `funded_by`/`co_funded_with` kenarı olarak yazılır.
- [ ] **Benzer-desen tespiti:** Tokenomics/kontrat yapısı daha önce rug olmuş projelerle örtüşüyor mu (supply dağılımı, LP yapısı, launch zamanlaması gibi kaba özellik benzerliği — karmaşık ML değil, kural + istatistik tabanlı başlanmalı).
- [ ] **"Immunity Score" arayüzü:** 0-100 arası tek bir öngörücü skor, mevcut scanner sonucunun üstüne eklensin ("Bu proje, geçmişte rug olan projelerle %X oranında benzer desen taşıyor" gibi).
- [ ] Skorun yanına **güven aralığı / veri yetersizliği uyarısı** ekle (az veri varsa "düşük güvenilirlik" etiketi — yanlış pozitiften kaçınmak kritik, marka güvenilirliği bu doğruluğa bağlı).
- [ ] **İtiraz/düzeltme mekanizması:** Bir proje ekibi "yanlış işaretlendik" derse başvurabileceği bir süreç (form + manuel inceleme kuyruğu) tanımlanmalı. İtiraz formu, gerçekten proje sahibinin başvurduğunu makul ölçüde doğrulayan bir kontrol içermeli (örn. deployer cüzdanından imzalı mesajla doğrulama) — aksi halde itiraz kanalı rakip projelerce birbirini etkisizleştirmek için istismar edilebilir. Otomatik skorlama hatalı olduğunda hızlı düzeltme yapılamazsa tek bir yanlış pozitif marka güvenini kalıcı zedeleyebilir.
- [ ] **Backtesting:** Kural motoru canlıya alınmadan önce, geçmişte rug olduğu bilinen ve olmadığı bilinen token setleriyle geriye dönük test edilsin; false positive/false negative oranları dokümante edilsin ve düzenli olarak (yeni veri geldikçe, önerilen kadans: en az ayda bir) yeniden ölçülsün.
- [ ] **Model şeffaflığı / versiyon geçmişi:** Skorlama kurallarında yapılan her önemli değişiklik (yeni kural eklendi, eşik değiştirildi vb.) `docs/scoring-changelog.md` içinde tarihli bir "metodoloji değişiklik günlüğü" olarak kamuya açık şekilde tutulmalı. Bir proje veya kullanıcı "geçen ay skor X iken bugün neden Y" diye sorduğunda somut bir cevap verilebilmeli — bu, kara kutu olmama ilkesinin zaman boyutundaki karşılığıdır.
- [ ] **İtiraz süreci için yanıt süresi taahhüdü (SLA):** İtiraz formuna yapılan başvurulara en geç kaç iş günü içinde ilk yanıt verileceği (ör. 3 iş günü) belirlenip kamuya açık şekilde belirtilmeli. Taahhüt edilmeyen bir süreç, kullanıcı/proje gözünde "var ama işlemiyor" olarak algılanır.

### Derin Tespit Modülleri (Gelişmiş Sinyaller — Rakiplerin Statik Kontrolünün Ötesi)
Bu modüller planın "gerçek ürün farkı" kısmıdır. RugCheck/SolSniffer gibi araçlar büyük ölçüde **statik kontrat bayrakları** okur (mint authority açık mı, freeze var mı). Bunlar önemli ama artık standart hale geldi ve deneyimli scammer'lar bu bayrakları "temiz" göstermeyi öğrendi (ör. authority'yi gerçekten yakmadan yeni bir kontrolündeki cüzdana devretmek, "renounced" gibi görünüp öyle olmamak). GL1TCH'i gerçekten farklılaştıracak olan, **davranışsal ve simülasyon tabanlı** sinyallerdir:

- [ ] **Honeypot / sat-tuzağı simülasyonu:** Bir token "güvenli" etiketi almadan önce, gerçek bir kullanıcı gibi küçük miktarda simüle bir alım + hemen ardından satım işlemi (yerel fork/simulation RPC üzerinden, gerçek fon harcamadan) çalıştırılmalı. Statik kontrol "satış vergisi yok" dese bile, kontrat mantığında satışı engelleyen veya %100'e yakın gizli vergi uygulayan honeypot'lar simülasyon olmadan yakalanamaz. Bu, sektörde hâlâ az sayıda aracın yaptığı, gerçek teknik farklılaştırıcıdır.
- [ ] **Sahte "renounce" tespiti:** "Mint authority renounced" ibaresi bazen otorite gerçekten sistem/burn adresine değil, ekibin kontrolündeki **yeni bir keypair'e** transfer edilerek taklit edilir. Bu modül, authority devrinin gerçek bir burn/null adrese mi yoksa deployer ile bağlantılı (aynı fonlama kaynağından beslenen) başka bir cüzdana mı gittiğini ayırt etmeli — "renounced" etiketi yalnızca birincisinde verilmeli.
- [ ] **Paketli arz / sniper kümesi tespiti (bundled supply detection):** Launch anında aynı blokta veya birkaç saniye içinde, ortak bir fonlama kaynağından beslenen çoklu cüzdanın arzın büyük kısmını satın alması (Jito bundle vb. yöntemlerle organik görünen ama aslında insider dağıtımı olan desen) tespit edilmeli. Bu, "top 10 holder %X" gibi yüzeysel bir metrikten çok daha güçlü bir insan-kontrolü sinyalidir çünkü *zamanlama + ortak fonlama* korelasyonuna bakar.
- [ ] **Hacim sahteciliği (wash trading) tespiti:** Aynı cüzdan kümesi arasında dairesel alım-satım (A→B→C→A) veya anormal derecede yüksek hacim/tekil-alıcı oranı, gerçek talep varmış izlenimi vermek için kullanılan klasik bir pump-öncesi taktiktir; bu desen kural tabanlı olarak işaretlenmeli.
- [ ] **LP kilit derinlik doğrulaması:** "LP locked" etiketi tek başına yeterli değil — hangi locker kontratına kilitlendiği (bilinen/itibarlı bir locker mı, yoksa deployer'ın kendi yazdığı şüpheli bir kontrat mı), gerçek kilit süresi ve kilidin fiilen açılamaz olduğu doğrulanmalı. Ayrıca "LP burn edildi" iddiaları, tokenların gerçek standart burn adresine (ör. `1nc1nerator...` / sistem null adresi) gittiği kontrol edilerek doğrulanmalı — bazı scammer'lar "burn" görünümlü ama kendi kontrolündeki bir adrese gönderir.
- [ ] **Bonding curve → DEX geçiş penceresi (Pump.fun tipi platformlar için özel durum):** Bir token, bonding curve'den Raydium'a migrate olduğu anda LP henüz kilitlenmemiş kısa bir pencere yaşar — bu, dev'in yeni oluşan LP'yi çekebileceği klasik bir rug anıdır. Bu geçiş anındaki token'lar ayrı bir "geçiş penceresi — LP kilidi henüz doğrulanamadı" durumu ile özel olarak işaretlenmeli, genel skora karışmadan net bir uyarı olarak gösterilmeli.
- [ ] **Koordineli çıkış tespiti (canlı):** Aynı fonlama kümesinden gelen birden fazla cüzdanın kısa bir zaman penceresi içinde (aynı blok/birkaç dakika) eşzamanlı satışı — bu "rug olmuş" değil "rug olmakta olan" bir sinyaldir ve statik skordan bağımsız, ayrı ve daha yüksek öncelikli bir canlı uyarı olarak tetiklenmeli (Faz 2 bildirim sistemiyle doğrudan bağlanmalı — bu senaryo saniyeler içinde bildirim gerektirir, saatlik periyodik taramayı beklemez).
- [ ] **Pazarlama/kimlik korelasyonu (düşük öncelik, veri kaynağı bulunabilirse):** Aynı "doxxed" görsel/isim veya aynı pazarlama/influencer cüzdanının birden fazla farklı projede kullanılması, sybil marketing/tekrar eden aktör sinyali olarak işaretlenebilir. Bu modül gizlilik ve doğruluk riski en yüksek olanıdır — yalnızca kamuya açık, doğrulanabilir on-chain/halka açık veriyle çalışmalı, hiçbir zaman kişisel/özel veri kullanılmamalı ve düşük güven ile sunulmalı.

### Güven Seviyesi Sistemi (Tek Sayı Yerine Katmanlı Doğrulama)
Tek bir "0-100 skor" göstermek, ne kadar kaliteli olursa olsun kaçınılmaz olarak "sayı düşükse kötü, yüksekse iyi" şeklinde aşırı basitleştirilir ve gerçek yatırım riskiyle karıştırılır. Bunun yerine skorun **üstüne binen**, neyin fiilen kontrol edildiğini gösteren bir seviye sistemi eklenmeli:
- [ ] **Seviye tanımları:** `Doğrulanmadı` (yeterli veri yok) → `Temel Kontrol Geçti` (statik bayraklar temiz) → `Derin Doğrulama Geçti` (honeypot simülasyonu + LP derinlik kontrolü + sniper kümesi analizi de temiz) → `Kritik Uyarı` (bir veya daha fazla derin modül risk tespit etti). Her seviyenin **tam olarak hangi kontrollerden geçtiği** kullanıcıya açık şekilde listelenmeli — "yüksek skor" ile "hiç kontrol edilmemiş ama varsayılan olarak yüksek başlayan skor" birbirine karışmamalı.
- [ ] Bu seviye sistemi, Faz 3 Outbreak Map ve Faz 6 badge'inde de aynı dille kullanılmalı — marka genelinde tutarlı bir "ne kadar derin bakıldığı" ifadesi olsun.

### Kanıt Zinciri Arayüzü (Kanıtlanabilirlik İlkesinin Somutlaşması)
- [ ] Immunity Score'daki her iddia (ör. "bu deployer geçmişte 3 rug'a karıştı") tıklanabilir olmalı ve kullanıcıyı doğrudan destekleyici on-chain kanıta (ilgili işlem hash'leri, cüzdan adresleri, geçmiş token'ların kendi GL1TCH scan sonuçları) götürmeli. Bu, sitenin "don't trust, verify" vaadinin skor sayfasında somut, tıklanabilir bir karşılığı olur — "bize güvenin" değil "işte kanıt, kendin kontrol et" deneyimi.

### Bağışıklık Tepki Çerçevesi (Skoru Aksiyona Bağlayan Katman)
- [ ] Ham skorun yanına, marka temasıyla tutarlı ama **yatırım tavsiyesi olmayan**, yalnızca "bu bulgu tipik olarak ne anlama gelir" açıklayan aksiyon-odaklı bir etiketleme eklensin: `İzleniyor` (Sentinel) → `Yükseltilmiş Uyarı` (Alert) → `Karantina Önerilir` (Quarantine — yüksek risk deseni, pozisyonu gözden geçirmeyi düşünebilirsiniz dili ile) → `Salgın Doğrulandı` (Outbreak Confirmed — rug fiilen gerçekleşti). Bu, kullanıcıya "şimdi ne yapmalıyım" sorusuna somut bir çerçeve verir ama her etiketin yanında zorunlu olarak "finansal tavsiye değildir" ibaresi bulunmalı (bkz. Hukuki bölüm).

### Teknik Notlar
- Bu faz istatistiksel kural motoruyla başlamalı (ML modeli değil) — hız ve açıklanabilirlik önemli. "Neden bu skor" sorusuna her zaman cevap verilebilmeli (kara kutu olmamalı, güven ilkesi buna dayanıyor).
- Yanlış alarm riski marka için itibar riski — muhafazakâr eşikle başla, zamanla veri arttıkça kalibre et.
- **Skorlama motoru ile ticari birimler arasında "duvar":** Skor hesaplama mantığı hiçbir koşulda ödeme durumu, reklam ilişkisi veya partnerlik statüsünden etkilenmemeli. Bu kural Faz 6'daki monetizasyon ile çelişmeyecek şekilde şimdiden mimariye (ayrı, ücretsiz erişimi olan bir "scoring service") yerleştirilmeli.
- **Honeypot simülasyonu maliyet/mimari notu:** Her taramada gerçek bir simülasyon RPC çağrısı çalıştırmak (özellikle yoğun trafik altında) maliyetlidir; bu modül önce yalnızca "derin doğrulama" talep edilen veya ilk kez taranan token'larda çalıştırılıp sonuç cache'lenmeli, statik bayrakları zaten net "temiz" olan tanıdık/çok taranmış token'larda tekrar tekrar tetiklenmemeli.
- **Signal Graph ölçeklenmesi:** Fonlama kaynağı ve sniper kümesi tespiti, basit SQL sorgularıyla belirli bir ölçekten sonra yetersiz kalır; veri hacmi büyüdükçe (Faz 2-3 sonrası) bir graph-sorgu katmanına evrilecek şekilde veri modeli baştan tasarlanmalı (bkz. "Çekirdek Mimari" bölümü).

### Kabul Kriterleri
- Her scan sonucunda reaktif bulguların yanında öngörücü bir skor ve gerekçesi gösteriliyor.
- Skor hesaplama mantığı dokümante edilmiş ve kullanıcıya "neden" açıklanabiliyor.
- İtiraz süreci canlı, kimlik doğrulamalı ve en az bir uçtan uca test edilmiş.
- Backtest sonuçları (false positive/negative oranları) dokümante edilmiş.
- Metodoloji değişiklik günlüğü yayında ve en az bir gerçek güncellemeyle test edilmiş.
- İtiraz yanıt süresi taahhüdü kamuya açık şekilde belirtilmiş.
- Honeypot simülasyonu en az bir bilinen honeypot token örneğinde doğru şekilde riski yakalıyor (gerçek bir test vakası ile doğrulanmış).
- Güven Seviyesi etiketleri (Doğrulanmadı → Derin Doğrulama Geçti) her scan sonucunda görünüyor ve her seviyenin hangi kontrollerden geçtiği listeleniyor.
- Kanıt zincirindeki her iddia en az bir tıklanabilir on-chain referansa bağlanıyor.
- Bağışıklık Tepki etiketleri (İzleniyor/Yükseltilmiş Uyarı/Karantina Önerilir/Salgın Doğrulandı) skorun yanında gösteriliyor ve her biri "finansal tavsiye değildir" ibaresi taşıyor.

---

## FAZ 2 — Sürekli Portföy İzleme

**Amaç:** Scanner'ı "tek seferlik sorgu" olmaktan çıkarıp "sürekli bağışıklık sistemine" çevirmek. Retention ve tekrar ziyaret için en güçlü mekanizma. **Bu faz, GL1TCH'in en yüksek güven riskini taşıyan fazıdır** — çünkü kullanıcıdan cüzdan bağlaması istenen her ürün, kripto alanında varsayılan olarak şüpheyle karşılanır (drainer/scam sitelerin standart yöntemi budur). Bu yüzden güvenlik burada bir "görev" değil, fazın var oluş şartıdır.

### Görevler
- [ ] **Cüzdan bağlama — read-only, kanıtlanabilir imza tabanlı:** Bağlama akışı, endüstri standardı bir "Sign-In with Ethereum/Solana" benzeri nonce + domain-binding imza şemasıyla yapılmalı: (1) sunucu tek kullanımlık bir nonce üretir, (2) kullanıcı bu nonce'u ve GL1TCH domain'ini içeren düz metni cüzdanında imzalar, (3) sunucu imzayı doğrular ve nonce'u tek seferlik olarak geçersiz kılar (replay saldırısı engellenir). İmza mesajında **fon/yetki isteği olmadığı açıkça yazmalı** ("This signature only proves wallet ownership. It will not authorize any transaction."). Üçüncü parti bilinen ve denetlenmiş bir wallet-connect kütüphanesi (örn. resmi Solana wallet adapter) kullanılmalı, imza doğrulama kendi yazılmamalı.
- [ ] Bağlı cüzdandaki tüm SPL token'ları otomatik taransın, her biri için Faz 0+1 skorları hesaplansın.
- [ ] **Çoklu cüzdan desteği:** Bir kullanıcının birden fazla cüzdanı (ör. bir "trading" cüzdanı, bir "holding" cüzdanı) tek hesap altında izlenebilmeli — bu, ileri kullanıcı retention'ı için önemli ama Faz 2'nin ilk sürümünde zorunlu değil, mimari buna izin verecek şekilde tasarlanmalı (tek cüzdan varsayımıyla kilitlenmemeli).
- [ ] Arka planda periyodik yeniden tarama (ör. her birkaç saatte bir) — bir token'ın durumu kötüleşirse (yeni mint yetkisi kullanıldı, LP çekildi, whale satışı vb.) kullanıcıya bildirim. **Periyodik taramaya Faz 1'deki honeypot simülasyonu da dahil edilmeli** — bir token launch anında satılabilir olup sonradan (kontrat yükseltmesi veya mantık değişikliğiyle) satış-engelleyici bir duruma geçebilir; bu yalnızca tekrar simülasyon çalıştırarak yakalanır, tek seferlik ilk taramada değil.
- [ ] **Koordineli çıkış sinyali için ayrı, hızlı yol (fast-path):** Faz 1'deki koordineli çıkış tespiti, saatlik periyodik taramayı beklemeden — bağlı cüzdanların izlediği token'larda gerçek zamanlıya yakın (event-driven, ör. webhook/log subscription ile) tetiklenmeli. Bir rug birkaç dakika içinde tamamlanabildiğinden, bu tek senaryoda "periyodik tarama" yeterli değildir.
- [ ] **Bildirim kanalları:** Telegram bot entegrasyonu (mevcut GL1TCH TG botu varsa ona ekle) + opsiyonel e-posta/push. **Bot token'ı Faz -1'deki secret yönetimi standardına tabi**; bot webhook endpoint'i Telegram'ın imza/secret token doğrulamasını kullanarak sahte isteklere kapatılmalı. Uzun vadede tarayıcı push bildirimi (Faz 4 extension ile doğal entegre olur) da değerlendirilmeli — Telegram kullanmayan kullanıcı segmentini kaybetmemek için.
- [ ] Dashboard: "Portföy Bağışıklık Skoru" — tüm portföyün ağırlıklı ortalama risk görünümü, tek bakışta.
- [ ] **Ölçeklenme/maliyet planı:** Kullanıcı sayısı büyüdükçe periyodik toplu yeniden tarama RPC çağrı hacmini katlar. Kaç kullanıcıya kadar mevcut altyapının maruz kalacağı ve maliyet eşiği önceden tahmin edilmeli (batch/queue mimarisi, öncelik sıralaması gibi — bkz. "Önerilen Teknik Yığın" bölümü).
- [ ] **Veri saklama & gizlilik:** Bağlanan cüzdan adresleri ve tarama geçmişi ne kadar süre saklanacak, kullanıcı verisini silme talebi nasıl karşılanacak (KVKK/GDPR'a uygun asgari bir politika) netleştirilmeli. Cüzdan adresleri ve bildirim tercihleri gibi kişisel sayılabilecek veriler **veritabanında şifreli (at-rest encryption)** saklanmalı; erişim en az yetki (least-privilege) ilkesiyle kısıtlanmalı.
- [ ] **Bildirim kontrolü:** Kullanıcının bildirim sıklığını/kanalını özelleştirebilmesi ve kolayca opt-out edebilmesi — varsayılan hiçbir kutu önceden işaretli (pre-checked) olmamalı, açık rıza (opt-in) esas olmalı. Aksi halde Telegram/e-posta spam algısı retention'ı ters yönde etkiler.
- [ ] **Oturum/erişim güvenliği:** Cüzdan bağlantısı sonrası oluşturulan oturum (session) kısa ömürlü ve yenilenebilir olmalı; kullanıcı istediği an "cüzdanı ayır / tüm verilerimi sil" diyebileceği tek tıklık bir kontrol dashboard'da yer almalı.
- [ ] **"Kurtarılan kullanıcı" ölçümü:** Bir kullanıcının portföyünde tuttuğu bir token, izleme sırasında yüksek riske döndüğünde ve kullanıcı bildirim sonrası o token'ı elden çıkardığında, bu olay anonim/toplu şekilde bir "kaç kullanıcı potansiyel bir rug'dan önceden çıktı" metriğine sayılmalı. Bu hem en güçlü gerçek-etki kanıtı hem de en güçlü organik pazarlama materyalidir ("Bu ay GL1TCH X kullanıcıyı Y rug'dan önceden uyardı" gibi) — kullanıcı onayı olmadan bireysel/isimlendirilebilir veri paylaşılmaz, yalnızca toplu istatistik kullanılır.

### Kabul Kriterleri
- Kullanıcı cüzdanını bağladığında portföyündeki tüm tokenlar otomatik taranıyor.
- Bir token durumu kötüleştiğinde kullanıcı aktif olarak bilgilendiriliyor (pull değil push).
- Veri saklama/silme politikası yayınlanmış; kullanıcı bildirim ayarlarını değiştirebiliyor.
- İmza doğrulama akışı nonce + domain-binding + tek kullanımlık kontrolüyle çalışıyor ve bu akış otomatik testlerle (replay saldırısı senaryosu dahil) doğrulanmış.
- Telegram bot webhook'u imzasız/sahte isteklere kapalı.
- Kullanıcı tek tıkla cüzdan bağlantısını kesip verisini silebiliyor.

---

## FAZ 3 — Outbreak Map (Canlı Salgın Haritası)

**Amaç:** PR/viral büyüme motoru. Kimsenin yapmadığı, "kamu yararı aracı" olarak konumlanan, haber sitelerinin/diğer projelerin embed edeceği canlı görselleştirme.

**Veri kaynağı kararı:** Yalnızca halka açık on-chain veri + GL1TCH'in kendi scanner sonuçları kullanılacak (3. parti API bağımlılığı yok — bu hem maliyet hem güvenilirlik açısından daha sağlam, "kendi verimiz" hikâyesi de markaya güç katıyor).

### Görevler
- [ ] Faz 0-2'de taranan/işlenen her token'ın sonucunu zaman damgalı bir olay akışına (event stream) yaz: `{token, timestamp, risk_score, trust_level, event_type: "yeni_tarama"|"durum_kötüleşti"|"rug_onaylandı"}`. Her olay, Faz 1'deki Kanıt Zinciri arayüzüne doğrudan bağlanan bir referans taşımalı — haritadaki her "rug_onaylandı" etiketi tıklandığında kullanıcı doğrudan destekleyici on-chain kanıta ulaşabilmeli, salt bir iddia olarak kalmamalı.
- [ ] Canlı bir görselleştirme: zaman içinde akan "vaka sayısı" grafiği + son taranan/riskli tokenların akan listesi (canlı log tarzı, mevcut sitenin "Live Security Scan" bölümündeki estetiğe uygun).
- [ ] Ağırlıklı bir "salgın yoğunluğu" metriği: son 24 saatte tespit edilen yüksek riskli/rug token sayısı, önceki döneme göre artış/azalış.
- [ ] **Embed widget mimarisi — güvenli by design:** Dış sitelere gömülecek widget, çalıştırılabilir kod enjekte eden ham bir `<script>` yerine, **sandboxed `<iframe>`** olarak sunulmalı (`sandbox` özniteliği ile scriptin ana sayfa DOM'una erişimi engellenir). Eğer script tabanlı bir embed de sunulacaksa, versiyonlanmış/pinlenmiş bir dosya + Subresource Integrity (SRI) hash'i kullanılmalı — böylece GL1TCH altyapısı bir gün ele geçirilse bile, embed eden yüzlerce sitede otomatik kod çalıştırma riski minimize edilir. Her gömme GL1TCH'e geri link üretir.
- [ ] Paylaşılabilir "günlük/haftalık rapor" kartı (otomatik üretilen, sosyal medyada paylaşılabilir görsel — "Bu hafta X token, Y risk deseni tespit edildi"). **Otomatik X/Twitter paylaşımı:** Bu rapor kartı, GL1TCH'in kendi hesabından otomatik olarak paylaşılabilir hale getirilmeli (haftalık kadans, insan onayı ile — tam otomatik değil, Faz 5'teki "otomatik yanıt doğrulama" prensibiyle tutarlı).
- [ ] **Manipülasyon/kötüye kullanım riski:** Canlı bir "rug/risk" haritası, kötü niyetli aktörlerce pump-dump sinyali veya rakip projeleri karalama aracı olarak istismar edilebilir. `rug_onaylandı` gibi kesin etiketler yalnızca yüksek güven eşiğinde ve mümkünse çoklu doğrulama sonrası atanmalı; Faz 1'deki itiraz mekanizması bu akışa bağlanmalı.
- [ ] **Gecikme/SLA netliği:** "Gerçek zamanlıya yakın" ifadesinin somut karşılığı (ör. ortalama X saniye gecikme) ölçülüp harita üzerinde şeffaf şekilde gösterilmeli — kullanıcı beklentisini yönetmek için.
- [ ] **Public endpoint koruması:** Event stream'i besleyen API, Faz -1'deki rate-limit/WAF standardına tabi olmalı; tek bir kaynaktan gelen anormal sorgu hacmi otomatik olarak kısıtlanmalı (maliyet ve veri kazıma/scraping riskine karşı).
- [ ] **Partner site performans bütçesi:** Embed widget'ının dosya boyutu ve yüklenme süresi için üst sınır (ör. X KB, Y ms) tanımlanmalı ve lazy-load edilmeli (widget yalnızca görünür alana geldiğinde yüklensin) — ağır bir widget partner sitenin hızını düşürürse embed'ler kaldırılır, bu da tüm fazın viral büyüme amacını boşa çıkarır.
- [ ] **SEO/backlink değeri:** Her embed, GL1TCH'e geri link ürettiği için doğal bir backlink stratejisidir — bu, "SEO ve Topluluk Büyüme Kanalları" bölümündeki içerik stratejisiyle birlikte planlanmalı (ör. her `rug_onaylandı` vakası için otomatik, indexlenebilir bir statik sayfa üretimi düşünülebilir).

### Kabul Kriterleri
- Harita/akış gerçek zamanlıya yakın güncelleniyor (mevcut tarama hacmine bağlı, gecikme kabul edilebilir seviyede belirtilmeli).
- Embed kodu çalışır durumda ve dış bir test sayfasında doğrulanmış; script tabanlı embed kullanılıyorsa SRI hash'i doğrulanmış, iframe tabanlı embed sandbox özniteliğiyle sınırlandırılmış.

---

## FAZ 4 — Dağıtım Katmanı: Chrome/Tarayıcı Uzantısı

**Amaç:** Scanner'ı GL1TCH sitesinden bağımsız olarak kullanıcının her gün gördüğü bir araca çevirmek — en güçlü organik büyüme kanalı.

### Görevler
- [ ] Manifest V3 tabanlı uzantı: sayfada/panoda bir Solana kontrat adresi tespit edildiğinde otomatik popup ile Faz 0+1 skorlarını göster.
- [ ] DexScreener, Pump.fun, Birdeye gibi popüler sitelerde otomatik "GL1TCH Verified" rozeti enjekte et (bu sitelerin token sayfalarına içerik script'i ile overlay).
- [ ] Uzantı üzerinden tek tıkla "Portföyüme ekle" (Faz 2 ile entegrasyon).
- [ ] Chrome Web Store yayını + store sayfası ASO (arama optimizasyonu — "solana scam checker", "rug checker" gibi terimler).
- [ ] **En az yetki (least-privilege) izin modeli:** Manifest'te yalnızca gerçekten gerekli `host_permissions` istensin (ör. tüm siteler yerine yalnızca hedef borsa/tarayıcı siteleri); geniş kapsamlı `<all_urls>` izni kaçınılmaz değilse istenmemeli — bu hem kullanıcı güvenini hem Chrome Web Store onay sürecini kolaylaştırır.
- [ ] **Pano (clipboard) verisi gizliliği:** Panodan kontrat adresi tespiti yapılırken, panonun tam içeriği **asla loglanmamalı veya sunucuya gönderilmemeli** — yalnızca yerel olarak (cihaz üzerinde) bilinen adres formatına (regex) uyup uymadığı kontrol edilmeli, uymuyorsa içerik anında atılmalı. Kullanıcı, pano okuma özelliğinin ne yaptığını açıkça gösteren bir onay/bilgilendirme ekranı görmeli (kullanıcılar yanlışlıkla seed phrase/private key kopyalayabilir — bu veri hiçbir koşulda işlenmemeli/saklanmamalı).
- [ ] **Üçüncü parti site riski:** DexScreener/Pump.fun/Birdeye gibi sitelere içerik enjeksiyonu bu sitelerin kullanım şartlarını ihlal edebilir ve uzantı bu sitelerce engellenebilir (DOM değişikliklerine karşı kırılganlık dahil). Alternatif/yedek olarak sadece kendi popup'ında adres tespiti yapan "güvenli mod" tasarlanmalı.
- [ ] **Extension tedarik zinciri güvenliği:** Uzantının build/yayın pipeline'ı (CI → Chrome Web Store) korunmalı; yayın erişimi sınırlı kişilerde olmalı ve mümkünse 2FA zorunlu kılınmalı — çünkü bir extension güncelleme kanalının ele geçirilmesi, tüm kullanıcı tabanına kötü amaçlı kod dağıtımı anlamına gelir (kripto alanında sık görülen bir saldırı vektörü).
- [ ] **Performans notu:** Sayfa/pano taraması sürekli DOM izleme gerektirdiğinden tarayıcı performansına etkisi test edilmeli (özellikle düşük güçlü cihazlarda).
- [ ] **Tarayıcı kapsamı kararı:** Chrome dışında Firefox ve Brave (kripto kullanıcıları arasında yaygın, Brave özellikle kripto-native bir kitleye sahip) desteğinin bu fazda mı yoksa ayrı bir alt fazda mı yapılacağı bilinçli olarak kararlaştırılıp dokümante edilmeli — sessizce kapsam dışı bırakılmamalı. Manifest V3 büyük ölçüde paylaşılabilir olduğundan ek maliyet görece düşüktür.

### Kabul Kriterleri
- Uzantı Chrome Web Store'da yayında, temel akış (adres tespiti → skor gösterimi) çalışıyor.
- En az 3 popüler üçüncü parti sitede overlay doğrulanmış.
- Manifest izinleri gözden geçirilmiş, gereksiz geniş izin yok.
- Pano içeriği hiçbir noktada ağ üzerinden gönderilmiyor/loglanmıyor — bu bir kod incelemesiyle doğrulanmış.

---

## FAZ 5 — Aktif Koruma Ajanı (Dikkatli/Kademeli Uygulama)

**Amaç:** Marka lore'unu ("sinyal internete yayılır, izin istemez") literal bir koruma mekanizmasına çevirmek — pasif araçtan aktif "saha ajanına" geçiş.

> ⚠️ **Önemli not:** Bu faz platform kullanım şartları (X/Telegram spam politikaları) ve topluluk algısı açısından dikkatli tasarlanmalı. Otomatik/istenmeyen mesaj atma riski marka itibarına zarar verebilir. Aşamalı ve opt-in ağırlıklı ilerlenmeli.

### Görevler (kademeli)
- [ ] **Aşama 1 (düşük risk):** Yalnızca GL1TCH'in kendi Telegram grubunda, birisi bir kontrat adresi paylaştığında bot otomatik olarak risk özetiyle yanıt versin (kendi mecramız, izin sorunu yok).
- [ ] **Aşama 2 (orta risk):** X'te GL1TCH'i etiketleyen/mention eden kullanıcıların paylaştığı kontrat adreslerine yanıt ver (opt-in, kullanıcı zaten markayı çağırmış).
- [ ] **Aşama 3 (yüksek risk, opsiyonel/ileri tarih):** Açık, yüksek hacimli scam thread'lerine proaktif yanıt — yalnızca net kanıt eşiği çok yüksekse ve platform kurallarına uygunsa değerlendirilmeli. Bu aşama hukuki/marka riski nedeniyle plana "değerlendirilecek" olarak eklenir, otomatik başlatılmaz.
- [ ] **Bot hesap güvenliği:** Telegram/X bot kimlik bilgileri Faz -1 secret standardına tabi; bot hesabına erişim en az kişiyle sınırlı ve mümkünse 2FA ile korunmalı — bir bot hesabının ele geçirilmesi markanın kendi kanalından phishing/scam yayılmasına yol açabilir (itibar açısından telafisi en zor senaryolardan biri).
- [ ] **Otomatik yanıt içeriği doğrulama:** Bot yanıtı üretimi bir dil modeli kullanıyorsa, yanıt metni (özellikle link içeriyorsa) yayınlanmadan önce temel bir doğrulama/allowlist kontrolünden geçmeli — kullanıcıdan gelen metin içine gizlenmiş talimatların (prompt injection) botu yanlış bir link paylaşmaya veya yanıltıcı bir "güvenli" etiketi vermeye yönlendirmesi engellenmeli.
- [ ] **Platform hız sınırı koruması:** Bot, X/Telegram'ın kendi rate-limit ve spam tespit eşiklerini aşmayacak şekilde bir üst gönderim hızı ile sınırlandırılmalı — hesabın geçici/kalıcı olarak kısıtlanması, fazın tamamını durma noktasına getirebilir.

### Kabul Kriterleri
- Aşama 1 ve 2 çalışır durumda, spam şikayeti/ban riski olmadan en az 2 hafta stabil çalışıyor.
- Aşama 3 için ayrı bir risk değerlendirmesi dokümante edilmiş (uygulanmadan önce onay gerektirir).
- Bot kimlik bilgileri güvenli şekilde saklanıyor ve erişim sınırlı.

---

## FAZ 6 — Altyapı Oyunu: "Powered by GL1TCH" API & Proof-of-Signal Tamamlanması

**Amaç:** GL1TCH'i "meme coin" kategorisinden çıkarıp "güvenlik altyapısı sağlayıcısı" kategorisine taşımak. En yüksek uzun vadeli kredibilite getirisi. Bu faz aynı zamanda Faz 0'da başlatılan Proof-of-Signal mekaniğinin tam ürünleşmesidir.

### Görevler
- [ ] Faz 0+1'deki skorlama motorunu genel bir public API olarak paketle (rate-limit'li ücretsiz tier + partner/ücretli tier).
- [ ] **Gerçek premium değer önerisi (ücretsiz gerçeği satmadan neyin satılacağının somut listesi):** Ücretli tier'ın karşılığı, skorun kendisi değil **derinlik, hız ve otomasyon** olmalı — Faz 0'da tanımlanan Scout/Sentinel/Operative/Ghost Node eşikleriyle tam tutarlı, somut bir liste: (1) düşük gecikmeli push bildirim SLA'sı (ücretsizde birkaç dakika, Sentinel ve üstünde saniyeler içinde — Faz 2'deki koordineli çıkış fast-path'i buna bağlanır), (2) bir cüzdan/deployer için indirilebilir tam "dosya" (Operative ve üstü — Faz 1'deki kanıt zincirinin genişletilmiş, geçmişe dönük tam raporu), (3) programatik watchlist + webhook entegrasyonu (Operative ve üstü, kendi trading botunu bağlamak isteyen ileri kullanıcılar için), (4) Faz 6 API'sinin kendisi (Ghost Node — geliştiriciler için yüksek hacim/SLA). Hiçbiri "skoru gör" karşılığında para almaz, hepsi zaten ücretsiz görünen gerçeğin üstüne hız/derinlik/otomasyon katar.
- [ ] **Proof-of-Signal leaderboard'ının tamamlanması:** `/proof` sayfası, Faz 0'da başlatılan itibar puanlama sistemini tam bir herkese açık leaderboard'a dönüştürür — en yüksek doğruluk oranına sahip kullanıcılar, toplam tahmin sayısı, doğruluk yüzdesi ve rozet/unvan (ör. "Kıdemli Sinyalci") ile listelenir. Bu sayfa aynı zamanda GL1TCH'in "topluluk destekli doğrulama" hikâyesinin somut kanıtı olur.
- [ ] Gömülebilir "Scanned by GL1TCH" trust badge — tek satır script, herhangi bir proje kendi sitesine ekleyebilsin (Faz 3'teki SRI/sandbox prensipleriyle aynı şekilde güvenli dağıtılmalı).
- [ ] API dokümantasyonu (basit, geliştirici dostu — `docs.gl1tch` benzeri bir alt sayfa).
- [ ] İlk entegrasyon partnerleri için outreach listesi (küçük/orta ölçekli Solana projeleri, cüzdan uygulamaları).
- [ ] **Kimlik doğrulama ve kötüye kullanım önleme:** API key bazlı kimlik doğrulama (key'ler asla URL query string'inde değil, header'da taşınmalı), key başına rate-limit/kota, anormal trafik tespiti (ör. bir rakip projenin toplu sorgularla maliyet/kapasite tüketmesi) baştan tasarlanmalı. Key rotasyonu ve iptal (revoke) mekanizması partner'lara sunulmalı.
- [ ] **Fiyatlandırma/SLA taslağı:** Ücretsiz tier limitleri, ücretli tier fiyat aralığı ve uptime/yanıt süresi taahhüdü (SLA) partner outreach'ten önce netleştirilmeli — kredibilite vaadi somut olmalı.
- [ ] **Skor bütünlüğü garantisi (çıkar çatışması engeli):** Ücretli/partner tier, hiçbir koşulda bir projenin risk skorunu iyileştirmez, gizlemez veya erteleyemez — API'nin ticari koşulları ile skorlama motoru (Faz 1'deki "duvar" ilkesi) arasında kesin ayrım, hem teknik olarak (ayrı servis/ayrı erişim yetkileri) hem de kamuya açık bir taahhüt metniyle (`/whitepaper` veya API dokümanında) garanti altına alınmalı. Bu, "pay to hide your rug score" algısının oluşmasını en baştan engeller ve markanın temel güven vaadini korur.
- [ ] **Ücretli API katmanı ile son kullanıcı tarafındaki ücretsizlik ilkesinin karıştırılmaması:** Faz 0'daki "temel koruma token'dan bağımsızdır" kuralı, GL1TCH.com üzerindeki son kullanıcı deneyimi içindir. Faz 6'daki ücretli API tier'ı ise **partner geliştiricilere yüksek hacim/SLA satmakla** ilgilidir, son kullanıcıdan tarama için ücret almakla karıştırılmamalı — bu ayrım API dokümantasyonunda ve pazarlama materyallerinde açıkça belirtilmeli ki "GL1TCH parayla çalışıyor" yanlış algısı oluşmasın.

### Kabul Kriterleri
- API dokümante edilmiş, en az bir dış test entegrasyonu ile doğrulanmış.
- Badge gömme kodu çalışır durumda ve güvenli dağıtım standardına (SRI/sandbox) uygun.
- API key auth, rate-limit ve key iptal mekanizması çalışıyor.
- "Skor bütünlüğü" taahhüdü kamuya açık bir sayfada yayınlanmış.
- `/proof` sayfası tam leaderboard olarak yayında; en az bir gerçek kullanıcı verisiyle doğruluk hesaplaması test edilmiş.

---

## Rakip Farklılaştırma Matrisi

Bu tablo, plan boyunca dağınık geçen "rakiplerden farkımız ne" iddialarını tek bir yerde somutlaştırır. Pazarlama materyali için de doğrudan kaynak olabilir.

| Yetenek | RugCheck / SolSniffer (tipik) | GL1TCH (bu plan sonunda) |
|---|---|---|
| Statik kontrat bayrakları (mint/freeze/tax) | ✅ Var | ✅ Var (Faz 0 temel katman) |
| Honeypot simülasyonu (gerçek al-sat denemesi) | ⚠️ Sınırlı/yok | ✅ Faz 1 |
| Sahte "renounce" tespiti | ❌ Yok | ✅ Faz 1 |
| Fonlama kaynağı bazlı sniper kümesi tespiti | ❌ Yok | ✅ Faz 1 (Signal Graph) |
| Öngörücü risk skoru (rug'dan önce) | ❌ Reaktif | ✅ Immunity Score (Faz 1) |
| Sürekli portföy izleme + push uyarı | ⚠️ Kısmi | ✅ Faz 2 |
| Canlı, embed edilebilir kamu haritası | ❌ Yok | ✅ Outbreak Map (Faz 3) |
| Tarayıcı uzantısı, üçüncü parti site overlay | ⚠️ Bazı rakiplerde var | ✅ Faz 4 |
| İtibar tabanlı topluluk doğrulama (finansal bahis değil) | ❌ Yok | ✅ Proof-of-Signal (Faz 0+6) |
| Temel koruma token bakiyesinden tamamen bağımsız | ⚠️ Değişken | ✅ Mimari zorunluluk (Faz 0) |
| Açık backtest/false-positive oranı yayını | ❌ Nadiren | ✅ Faz 1 |

**Not:** Bu tablo periyodik olarak (ör. her 2 fazda bir) gerçek rakip ürünler yeniden incelenerek güncellenmeli — rakipler de statik kalmaz, iddialar zamanla eskiyebilir.

---

## Önerilen Teknik Yığın (Başlangıç Noktası, Zorunlu Değil)

Bu bölüm bir mimari kısıtlama değil, Claude Code'un sıfırdan araştırmadan başlayabileceği makul bir varsayılan settir. Mevcut altyapıyla çelişen bir öneri varsa mevcut altyapı kazanır.

- **RPC/veri sağlayıcı:** Helius veya QuickNode (Solana'ya özel, transaction simulation ve webhook/log subscription desteği olan sağlayıcılar tercih edilmeli — Faz 1 honeypot simülasyonu ve Faz 2 fast-path bu yeteneğe bağımlı).
- **Kuyruk/iş planlayıcı:** Periyodik yeniden tarama (Faz 2) ve honeypot simülasyonu gibi ağır işler için BullMQ (Redis tabanlı) veya benzeri bir job queue — senkron/istek-yanıt döngüsünde çalıştırılmamalı.
- **Cache/rate-limit katmanı:** Redis — hem honeypot simülasyon sonuçlarının cache'lenmesi hem de IP/cüzdan bazlı rate-limit sayaçları için.
- **Veritabanı:** Mevcut ilişkisel veritabanı (Postgres varsayılan) Signal Graph'in ilk sürümü için yeterli; recursive CTE ile kümeleme sorguları desteklenir. Ölçek eşiği aşıldığında (bkz. "Çekirdek Mimari" bölümü) graph-özel bir çözüme geçiş değerlendirilir.
- **Hata izleme/gözlemlenebilirlik:** Sentry (veya benzeri) — Faz -1'de kurulmalı.
- **Edge/WAF:** Cloudflare — rate limiting, DDoS koruması ve embed widget'ları için CDN.
- **Secret yönetimi:** Vercel Environment Variables (küçük ölçek) veya bir bulut secret manager (ölçek büyüdükçe).
- **CI/CD:** GitHub Actions — SCA taraması (Dependabot/Snyk), gitleaks, test paketi ve staging→prod deploy akışı burada birleşir.

---

## Test Stratejisi

Faz -1'de "otomatik test paketi olmadan kritik akışlara dokunan PR merge edilemez" kuralı konuyor; bu bölüm o kuralın somut karşılığıdır.

- **Birim testleri:** Skorlama kural motoru (her kural bağımsız test edilebilir olmalı — "bu girdi verildiğinde bu bulgu üretilmeli"), girdi doğrulama katmanı, imza doğrulama mantığı.
- **Entegrasyon testleri:** RPC/indexer çağrılarını mock'layarak tam scan akışı (adres girildi → sonuç döndü), Signal Graph sorguları (deployer kümeleme, fonlama kaynağı takibi).
- **Uçtan uca (e2e) testler:** Cüzdan bağlama akışı (nonce üretimi → imza → doğrulama → oturum), itiraz formu gönderimi, bildirim tetiklenmesi (mock webhook ile).
- **Güvenlik-odaklı testler:** Replay saldırısı senaryosu (aynı imza iki kez kullanılmaya çalışılıyor — reddedilmeli), SSRF denemesi (scan endpoint'ine beklenmedik bir URL/format verilmesi — reddedilmeli), rate-limit aşımı senaryosu.
- **Backtesting (Faz 1'e özel):** Bilinen rug/temiz token setleriyle skorlama motorunun geriye dönük doğruluğu — bu bir "unit test" değil, ayrı bir değerlendirme pipeline'ıdır ve düzenli olarak (yeni veri geldikçe) yeniden çalıştırılmalı.
- **Kapsam hedefi (öneri, katı kural değil):** Kritik akışlarda (imza doğrulama, scoring motoru, ödeme/tier mantığı) yüksek satır kapsamı hedeflenmeli; kozmetik UI bileşenlerinde aynı titizlik gerekmez — test efor bütçesi riske göre önceliklendirilmeli.

---

## Risk Kaydı (Yaşayan Doküman)

Claude Code Talimatları'ndaki 10. kural gereği, riskli/geri dönüşü zor kararlar burada kısaca not düşülür. Aşağıdaki satırlar başlangıç örnekleridir — plan ilerledikçe güncellenmeli.

| Risk | Olasılık | Etki | Azaltma | İlgili Faz |
|---|---|---|---|---|
| Honeypot simülasyonu maliyeti trafik arttıkça öngörülemez şekilde büyür | Orta | Yüksek | Cache + yalnızca ilk/derin taramada tetikleme | Faz 1 |
| Yanlış pozitif bir projeye "rug" etiketi yapıştırır, hukuki itiraz gelir | Orta | Yüksek | İtiraz mekanizması + muhafazakâr eşik + olasılık dili | Faz 1, 3 |
| Cüzdan bağlama akışı bir güvenlik açığı içerir, kullanıcı güveni kalıcı zedelenir | Düşük (önlemlerle) | Çok Yüksek | Denetlenmiş kütüphane + bağımsız güvenlik taraması + threat model | Faz -1, 2 |
| Extension güncelleme kanalı ele geçirilir, kötü amaçlı kod dağıtılır | Düşük | Çok Yüksek | Sınırlı yayın erişimi + 2FA + tedarik zinciri güvenliği | Faz 4 |
| Bot hesabı ele geçirilir, markanın kendi kanalından phishing yayılır | Düşük | Yüksek | Secret standardı + 2FA + erişim sınırlama | Faz 5 |
| Proof-of-Signal sistemi sybil hesaplarla manipüle edilir, leaderboard anlamsızlaşır | Orta | Orta | Anti-gaming kuralı + Signal Graph tabanlı sybil tespiti | Faz 0, 6 |
| Signal Graph veri hacmi büyür, SQL sorguları yavaşlar, kullanıcı deneyimi bozulur | Orta | Orta | Ölçüm tetikli graph-DB geçiş kararı (erken taahhüt yok) | Faz 1-3 |
| Tier hesaplaması istemci tarafında yapılır/güvenilir, kullanıcı sahte tier iddia eder | Düşük (önlemlerle) | Orta | Sunucu tarafı hesaplama zorunluluğu + imza doğrulama ön koşulu | Faz 0, 2 |
| Sahte/kopya GL1TCH sitesi kullanıcıyı "sadece imzala" diyerek fon transferi imzalatır | Düşük | Çok Yüksek | Kullanıcı eğitimi + resmi wallet-adapter + imza içeriği şeffaflığı | Faz 0, 2 |

---

## Çok Zincirli Genişleme Yol Haritası (Uzak Gelecek, Bu Planın Kapsamı Dışında)

Bu plan bilinçli olarak yalnızca Solana'ya odaklanıyor — kapsam genişlemesi şu an için erken ve dikkat dağıtıcı olur. Ancak ürün olgunlaştıkça (muhtemelen Faz 6 sonrası) gündeme gelebilecek bir genişleme yönü olarak kısaca not düşülüyor, hiçbir görev bu fazın parçası değil:

- Base/Ethereum L2'lerde benzer bir memecoin scam furyasının varlığı, GL1TCH'in Signal Graph ve Immunity Score mantığını EVM zincirlerine taşımasını uzun vadede mantıklı kılabilir.
- Bu genişleme, Solana'daki ürün-pazar uyumu netleşmeden ve Faz 6'daki API/altyapı katmanı olgunlaşmadan **başlatılmamalı** — çok erken çok zincirli olmak, hiçbir zincirde derin olmama riskini taşır.
- Karar verildiğinde ayrı bir plan dokümanı olarak ele alınmalı, bu dosyaya sonradan bir "Faz 7" olarak eklenmemeli (kapsam kirliliğini önlemek için).

---

## Öncelik/Bağımlılık Özeti

```
Faz -1 (güvenlik temeli — ZORUNLU İLK ADIM)
        ↓
Faz 0 (temel + Signal Graph v0 + Proof-of-Signal v0) → Faz 1 (Immunity Score, Signal Graph genişler) → Faz 3 (Outbreak Map)
                                              ↓
                                         Faz 2 (Portföy İzleme)
                                              ↓
                                Faz 4 (Extension) ← dağıtım katmanı, Faz 0+1+2 verisini tüketir

Faz 5 (Aktif Ajan) — Faz 0+1 tamamlandıktan sonra, kademeli ve dikkatli
Faz 6 (API/Altyapı + Proof-of-Signal tamamlanması) — Faz 0+1 stabilize olduktan sonra, en son (monetizasyon/kredibilite katmanı)
```

**Önerilen uygulama sırası (güvenlik önce, sonra büyüme önceliğine göre pazarlama etkisi/efor dengesi):**
1. Faz -1 — hiçbir kod yazılmadan önce (güvenlik/güven temeli)
2. Faz 0 — hemen (temel + hızlı görünür fark + Signal Graph/Proof-of-Signal temelleri)
3. Faz 1 — teknik omurga (Immunity Score)
4. Faz 3 — PR/viral patlama (Outbreak Map, Faz 1 verisiyle beslenir)
5. Faz 2 — retention (Portföy İzleme) — cüzdan bağlama içerdiği için Faz -1'deki imza mimarisi burada aktif devrede olmalı
6. Faz 4 — dağıtım (Extension)
7. Faz 6 — kredibilite/monetizasyon (API + Proof-of-Signal tamamlanması)
8. Faz 5 — en son, en dikkatli (Aktif Ajan)

---

## Güvenlik, Gizlilik, Hukuki Uyum ve Kullanıcı Yararı İlkeleri (Tüm Fazları Kapsar)

Bu bölüm önceki fazlarda dağınık olarak geçen riskleri ve ilkeleri tek bir referans haline getirir; Claude Code her fazı uygularken buna göz atmalı ve her yeni özellik bu ilkelerin hiçbirini ihlal etmemeli.

### Güvenlik
- **Fon/yetki isteme yasağı:** Hiçbir bileşen kullanıcıdan transaction imzası, token approval veya fon transferi yetkisi istemez — yalnızca sahiplik doğrulayan mesaj imzası (bkz. Faz -1, Faz 2).
- **Secrets asla kodda değil**, her zaman ortam değişkeni/secret manager üzerinden.
- **Girdi doğrulama** her public endpoint'te merkezi ve zorunlu.
- **Rate limiting ve WAF** her yeni public endpoint için varsayılan, sonradan eklenen bir şey değil.
- **Bağımlılık güvenlik taraması** CI'da sürekli aktif.
- **Denetlenebilirlik:** Bir güvenlik olayı sonrası "ne, ne zaman, kim tarafından" sorularına cevap verebilecek asgari loglama her serviste bulunmalı.
- **Bağımsız güvenlik incelemesi:** Faz 2 (cüzdan bağlama) öncesi en az bir tarama, Faz 6 (public API) öncesi kapsamlı bir pentest hedeflenir. Kaynaklar elverdiğinde bir bug bounty programı (örn. Immunefi tarzı, Solana ekosisteminde yaygın) değerlendirilmeli — bu hem güvenliği hem de markanın "güvenlik öncelikli" hikâyesini güçlendirir.

### Kullanıcı Yararı (Her Özelliğin Geçmesi Gereken Test)
Yeni bir özellik tasarlanırken şu soru sorulmalı: **"Bu özellik kullanıcıyı gerçekten daha güvende mi hissettiriyor/kılıyor, yoksa sadece etkileşim/büyüme metriğini mi büyütüyor?"** İkisi çelişirse kullanıcı yararı kazanır. Somut kurallar:
- **Temel koruma asla token/bakiyeye bağlanmaz (en üst kural):** Tarama, sade dil açıklaması ve Immunity Score her zaman ücretsiz ve herkese açık kalır (bkz. Faz 0). Bakiye/rank sistemi yalnızca kozmetik/konfor katmanıdır. Bu kural ihlal edilirse marka, kendi engellemeye çalıştığı "güven karşılığında para iste" modeline döner.
- **Karanlık desen (dark pattern) yasağı:** Önceden işaretli onay kutusu yok, yanıltıcı "hayır" butonu yok, sahte aciliyet ("son 3 dakika!") kullanılmaz.
- **Skor bütünlüğü:** Ücretli hiçbir tier, hiçbir partnerlik, risk skorunu etkileyemez, geciktiremez veya gizleyemez (bkz. Faz 6).
- **Gamification sınırı (Faz 0/6 Proof-of-Signal sistemi):** Puan sistemi aşırı/bağımlılık yapıcı taramaya teşvik etmemeli; makul günlük üst limit tasarlanmalı.
- **Bildirimlerde açık rıza:** Varsayılan kapalı, kolay opt-out (Faz 2).
- **Veri minimizasyonu:** Gerekmeyen veri toplanmaz; toplanan veri kullanıcı talebiyle silinebilir (Faz -1, Faz 2).
- **Dil her zaman olasılıksal, asla suçlayıcı:** "Bu bir dolandırıcılıktır" değil, "bu desen geçmişte dolandırıcılık olan projelerle %X benzerlik taşıyor" (bkz. aşağıdaki Hukuki bölüm).

### Hukuki ve İtibar Riski
- **Karalama/itibar riski:** Bir token'a "rug" veya yüksek risk etiketi hatalı şekilde yapıştırılırsa, proje ekibinden hukuki itiraz gelebilir. Faz 1'de tanımlanan kimlik doğrulamalı itiraz mekanizması ve muhafazakâr eşik ilkesi tüm fazlarda (özellikle Faz 3 Outbreak Map) tutarlı uygulanmalı; skorlar her zaman "olasılık/desen benzerliği" dili ile sunulmalı, kesin suçlama dili kullanılmamalı.
- **Yatırım tavsiyesi değildir uyarısı:** Immunity Score ve tüm risk skorları, sitenin görünür bir yerinde (özellikle scan sonucu ve Outbreak Map sayfalarında) net bir "finansal tavsiye değildir" ibaresiyle sunulmalı.
- **Kullanıcı verisi:** Cüzdan bağlama (Faz 2), bildirim tercihleri ve API kullanıcı verileri için asgari bir gizlilik politikası ve saklama/silme süreci olmalı (bkz. Faz -1, Faz 2 notları).
- **Kriz senaryosu:** Yanlış pozitif nedeniyle bir proje/topluluk tepki gösterirse hızlı yanıt akışı (düzeltme + kamuya açıklama şablonu) önceden hazırlanmalı — bu bir "marka güveni" ürünü için standart bir kabul kriteri gibi ele alınmalı, olay çıktığında değil. Aynı şekilde bir güvenlik olayı (veri sızıntısı, bot hesabı ele geçirilmesi) için de önceden hazırlanmış bir kamuya açıklama şablonu bulunmalı.

### Erişilebilirlik ve Uluslararasılaşma
- **Erişilebilirlik (a11y):** Skor, risk etiketleri ve uyarılar yalnızca renkle (kırmızı/yeşil) değil, ikon/metinle de ifade edilmeli (renk körlüğü); temel akışlar (tarama sonucu görüntüleme, itiraz formu) klavye ile kullanılabilir olmalı ve ekran okuyucu için anlamlı etiketler taşımalı. Bu, "kamu yararı aracı" konumlamasıyla (Faz 3) tutarlıdır — kamu yararı aracı, erişilemeyen bir kitle bırakmamalıdır.
- **Uluslararasılaşma (i18n):** Site şu an TR/EN karışık bir dille mi yoksa tek dille mi sunuluyor, uluslararası büyüme (özellikle Faz 3 Outbreak Map'in haber sitelerince embed edilmesi ve Faz 6 API'nin global partnerlere açılması) hedefleniyorsa metin katmanının baştan çeviri-dostu (i18n key'leri ile, hardcoded string olmadan) yazılması ileride çok daha ucuza mal olur. Bu bir "ne zaman" kararıdır, en geç Faz 3 öncesi bilinçli şekilde verilmeli.

### SEO ve Topluluk Büyüme Kanalları
- **İçerik/SEO stratejisi:** Faz 3'teki her `rug_onaylandı` vakası, potansiyel olarak indexlenebilir, kalıcı bir link üretebilir (ör. `/reports/[token-slug]`) — bu hem organik arama trafiği hem de "kanıta dayalı gazetecilik" konumlaması sağlar. Faz 3 ile birlikte planlanmalı, sonradan eklenmemeli.
- **Topluluk döngüsü:** Discord/Telegram topluluğu, Proof-of-Signal leaderboard'unun (Faz 6) doğal genişleme alanıdır — yüksek doğruluk oranına sahip kullanıcılar topluluk içinde organik olarak öne çıkar, bu da hem retention hem de kalite kontrolü (deneyimli kullanıcıların yeni kullanıcıya yardım etmesi) sağlar. Ayrı bir görev olarak taahhüt edilmiyor, ama Faz 6 planlanırken gözden kaçırılmamalı.

---

## Terimler Sözlüğü

- **Signal Graph:** Deployer, cüzdan, fonlama kaynağı ve tarama verisini birbirine bağlayan, fazlar boyunca birikimli olarak büyüyen veri omurgası.
- **Proof-of-Signal:** Kullanıcıların rank/itibar ağırlıklı, finansal bahis içermeyen risk tahmini yaptığı mekanik; `/proof` sayfasındaki leaderboard'ın temeli.
- **Immunity Score:** Faz 1'de tanıtılan, geçmiş rug desenleriyle benzerliğe dayanan 0-100 arası öngörücü risk skoru.
- **Güven Seviyesi (Trust Level):** `Doğrulanmadı → Temel Kontrol Geçti → Derin Doğrulama Geçti → Kritik Uyarı` — bir token'ın hangi derinlikte kontrol edildiğini gösteren katman.
- **Bağışıklık Tepki Etiketleri:** `İzleniyor → Yükseltilmiş Uyarı → Karantina Önerilir → Salgın Doğrulandı` — skoru aksiyon diline çeviren etiketleme.
- **Kanıt Zinciri:** Her risk iddiasının tıklanabilir, doğrulanabilir on-chain kanıta bağlandığı arayüz prensibi.

---

## Büyüme/Başarı Metrikleri (Faz Bazlı Öneri)

Her fazın "kabul kriteri" teknik tamamlanmayı gösteriyor ama büyüme hedefine ve güvenlik sağlığına katkısını ölçmüyor. Faz kapanışlarında aşağıdaki gibi basit metrikler takip edilmesi önerilir:

| Faz | Önerilen temel metrik(ler) |
|---|---|
| Faz -1 | CI'da açık kritik güvenlik açığı sayısı (hedef: 0); ortalama açık kapatma süresi (MTTR); yedekten geri yükleme testinin başarı durumu |
| Faz 0 | Sade dil açıklamasının scan sayfası bounce rate'ine etkisi; Proof-of-Signal katılım oranı |
| Faz 1 | Immunity Score görüntülenen scan başına paylaşım oranı; itiraz sürecine gelen başvuru/çözülme oranı; ortalama itiraz yanıt süresi (SLA'ya uyum); honeypot simülasyonunun bilinen test vakalarını yakalama oranı |
| Faz 2 | Cüzdan bağlama dönüşüm oranı; bildirim sonrası geri dönüş (retention) oranı; "cüzdanı ayır/verimi sil" kullanım oranı (sağlıklı bir güven sinyali olarak izlenmeli, kaygı değil); **kurtarılan kullanıcı sayısı** (bildirim sonrası riskli token'dan çıkan kullanıcı — en güçlü etki metriği) |
| Faz 3 | Embed edilen dış site sayısı; haritadan gelen referral trafiği; rapor sayfalarından gelen organik arama trafiği |
| Faz 4 | Uzantı kurulum sayısı; günlük aktif uzantı kullanıcısı; store'da güvenlik/gizlilik şikâyeti sayısı (hedef: 0) |
| Faz 5 | Bot yanıtlarının tıklama/dönüşüm oranı; spam şikayeti sayısı (0 olmalı) |
| Faz 6 | Aktif API partner sayısı; API üzerinden gelen scan hacmi; SLA ihlali sayısı; Proof-of-Signal leaderboard'a aktif katılan kullanıcı sayısı ve ortalama tahmin doğruluğu |

---

## Genel Uygulama İlkeleri

- Her fazın kodu mevcut site mimarisine (mevcut sayfa yapısı, tasarım dili, "verify yourself" / "don't trust, verify" marka tonu) sadık kalarak yazılmalı.
- Yeni her özellik, mevcut Trust Wall / Proof sayfası mantığına uygun şekilde **kanıtlanabilir/doğrulanabilir** olmalı — bu markanın temel güven vaadi, hiçbir yeni özellik bunu zayıflatmamalı.
- Yanlış pozitif (masum projeyi riskli göstermek) ve yanlış negatif (rug'ı kaçırmak) dengesi her fazda açıkça test edilmeli; skorlama mantığı her zaman açıklanabilir kalmalı.
- Faz 5 hariç tüm fazlar bağımsız olarak "bitmiş ürün" olarak sunulabilir — birbirine sıkı bağımlı bir monolitik teslimat değil, her faz kendi başına deploy edilebilir artım.
- Herhangi bir faz "risk/rug" etiketi üreten bir arayüz eklediğinde, yukarıdaki **Güvenlik, Gizlilik, Hukuki Uyum ve Kullanıcı Yararı İlkeleri** bölümündeki dil ve itiraz kuralları o özelliğin kabul kriterine dahil sayılmalı.
- **Her fazın başında Claude Code, o fazı uygulamaya geçmeden önce ilgili "Zorunlu Kabul Kriterleri" veya "Kabul Kriterleri" listesini okumalı ve varsa önceki fazdan eksik kalan bir güvenlik/gizlilik maddesi olup olmadığını kontrol etmeli — geriye dönük bir açık, yeni özelliğin önüne geçer.**
- **Signal Graph şeması ve skorlama değişiklik günlüğü, kod ile senkron tutulan yaşayan dokümanlardır** — bir fazın "kabul edilmiş" sayılması için bu dosyaların güncel olması da kabul kriterinin doğal bir parçasıdır.
- **Risk Kaydı** her önemli mimari karardan sonra güncellenmeli — bu, gelecekte "neden böyle karar verdik" sorusuna cevap verebilmek için ucuz bir sigorta.
