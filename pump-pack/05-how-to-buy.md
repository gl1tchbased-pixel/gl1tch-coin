# 05 — How To Buy $GL1TCH (60-Second Guide)

Bu metni iki yerde kullan:
1. **X uzun post** (alttaki "Long form" bölümü, thread yerine tek post).
2. **Site /links sayfası** alt kısmına ya da `public/whitepaper.md` içine.

## Kısa form (görsel / story / TG için)

```
Phantom → SOL → pump.fun → paste CA → Buy.
That's the whole thing.

CA: 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump
Slippage: 1-3%

Then: t.me/gl1tch_infected → /verify → enter your tier room.
```

## Long form (X / site)

### 1. Get a Solana wallet
Install **Phantom** (phantom.app) — desktop or mobile. Save your seed phrase
**offline**. Phantom never asks for it; anyone who does is stealing it.

### 2. Fund it with SOL
Buy SOL on any exchange (Coinbase, Binance, Kraken) and withdraw to your
Phantom address. Allow ~0.05 SOL for fees + slippage on top of what you want
to spend on $GL1TCH.

### 3. Open the official Pump.fun page
```
pump.fun/coin/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump
```
Confirm the CA matches the one on **coin-three-mu.vercel.app/links**.
There is only one real CA. Anything else is a scam.

### 4. Buy
- Connect Phantom.
- Set slippage to **1-3%** (Solana is fast — high slippage = MEV bots will eat you).
- Enter the SOL amount.
- Sign the transaction in Phantom.
- Wait ~5 seconds for confirmation.

### 5. Verify your tier
- Open Telegram: `t.me/gl1tch_infected`
- DM the bot: `/verify`
- Open the link, connect Phantom, sign the FREE message (no spend).
- Bot reads your balance, assigns your tier, and DMs you a single-use invite
  to your tier-gated room.

### Tier thresholds
| Tier | Min $GL1TCH | Unlocks |
|---|---|---|
| Observer | 0 | Public archive |
| Infected | 100,000 | Holder badge + holder-only channel |
| Signal Bearer | 1,000,000 | Creator channel, raid coordination |
| Core Node | 5,000,000 | Strategy room |
| Ghost Node | 10,000,000 | Top-tier room, direct line |

## Sık sorulan

**Tax var mı?** Yok. 0% buy, 0% sell — Token-2022 mint, transfer-fee extension
hiç etkinleştirilmedi. Solscan'da doğrula.

**Mint / freeze revoked mı?** Evet. Solscan → token detayları → her ikisi de
`null`. Yeni token bastırılamaz, hiçbir cüzdan dondurulamaz.

**Yeni cüzdana kaç SOL koymalıyım?** En az **0.1 SOL**: 0.05 işlem/slippage,
gerisi alım için. Daha fazla istersen daha fazla.

**`/verify` cüzdanı için para harcanacak mı?** Hayır. Tamamen **ücretsiz**
off-chain imza. Bot bakiyeni okur — harcama yetkisi istemez, asla.

**Slippage neden 1-3%?** Pump.fun bonding curve hızlı hareket eder; daha
yüksek slippage = MEV bot'ların seni ön-alması. Düşük tut.
