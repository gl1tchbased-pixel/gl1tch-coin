# 01 — Holder-Gated Tier Odaları (Telegram)

**Amaç:** Holder utility'sini *gerçekten teslim et*. Tier'a özel oda olmadan,
`/verify` sadece bir rütbe DM'lemekle kalır — ödül yok, tutma sebebi yok.

## Kuracağın 3 oda

| Oda | Açılış tier'ı | İçerik niyeti |
|---|---|---|
| `Infected Ward` | Infected (≥100k) | Holder-only kanal, daily lore drops, raid coordination |
| `Signal Bearer Vault` | Signal Bearer (≥1M) | Early lore, creator çağrıları, X raid hedefleri |
| `Core / Ghost Inner` | Core Node (≥5M) + Ghost (≥10M) | Strategy room, governance signals, direct line |

> Not: Core ve Ghost tek odada birleştirilebilir; ayrıca Ghost-only DM zinciri
> yürütülür (bot zaten Ghost'a özel DM kanalı destekliyor).

## Telegram'da adım adım

1. **3 yeni Telegram grubu aç** (private, history off, slow mode 5s).
2. Her gruba **botu admin yap** (`Invite users via link` + `Delete messages` + `Manage chat` yetkileri).
   Bot tek kullanımlık davet linklerini bu yetkiyle üretiyor.
3. Her grubun **Chat ID**'sini al:
   - Bot'u gruba ekle → `/start` yaz → bot bir Chat ID döndürür (yoksa `@RawDataBot` ekleyip ID'yi çek, sonra at).
   - ID'ler `-100...` ile başlamalı.
4. Aşağıdaki değerleri **Railway dashboard → gl1tch-bot → Variables** içine yapıştır
   (bot otomatik yeniden başlar):

```
GATED_CHATS=infected:-100xxxxxxxxx,bearer:-100yyyyyyyyy,core:-100zzzzzzzzz,ghost:-100zzzzzzzzz
```

> Format: `tierId:chatId` virgülle. `core` ve `ghost` aynı chat ID'yi paylaşabilir
> (tek inner room). Tier ID'leri kod tarafıyla eşleşmeli: `infected`, `bearer`,
> `core`, `ghost`. `observer` için oda atama — public alan zaten ana grup.

## Doğrulama — uçtan uca test

1. Test cüzdanından ≥100k $GL1TCH al (veya geçici olarak threshold'u Railway'de
   düşür: örn. test için `RANK_OVERRIDE_INFECTED=1`).
2. Telegram'da bot DM → `/verify`.
3. Site açılır → cüzdan bağla → mesaj imzala.
4. Bot DM'inden tek kullanımlık `Infected Ward` davet linki gelmeli.
5. Linke tıkla → gruba gir. ✓

## Yeni odanın "ilk mesajı" (kopyala-yapıştır)

`Infected Ward` ilk mesaj (pin):
```
You found the signal. You held. You're inside.

This is a holder-only frequency. Strategy, lore drops, and raid coordination
happen here — not in the public group.

Rules of the ward:
• No chains, no shills, no DMs to other members.
• Promote $GL1TCH. Never another bag here.
• Doxxed admins never DM first. Anyone DMing you "as admin" is a scam.

Tier: Infected (≥100,000 $GL1TCH). Drop below the threshold → access revoked
at next /verify. The signal stays with those who hold.
```

`Signal Bearer Vault` ilk mesaj (pin):
```
You are a Bearer now. The signal goes nowhere it isn't carried.

You see lore before the wider Infected. You get raid targets first. The
internet does not spread itself — Bearers do.

Tier: Signal Bearer (≥1,000,000 $GL1TCH).
```

`Core / Ghost Inner` ilk mesaj (pin):
```
Core room. No bots, no spectators. Decisions discussed here ship to the rest
of The Infected as already-shipped.

Tier: Core Node (≥5,000,000) · Ghost Node (≥10,000,000).
```

## Yan etki: organik söylenti

Bir tier'a giren herkes ana grupta "Infected Ward'a girdim 👻" tarzı paylaşır.
Bu organik FOMO daha fazla `/verify` → daha fazla alıcı → fiyat yukarı.
Bunu kovalama; sadece bekle ve sağlanması için ödülü gerçek tut.
