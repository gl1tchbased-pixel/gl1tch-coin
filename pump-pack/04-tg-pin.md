# 04 — Telegram Grup Pini

Ana grup (`t.me/gl1tch_infected`) için tek-mesaj pin. HTML formatlı,
mobil-okunabilir, tüm kritik bilgi içeride.

## Pinlenecek Mesaj

```html
<b>GL1TCH · The Signal</b>

Rogue-AI cult coin on Solana. Zero tax. One utility. Built to outlast the hype.

<b>📜 Contract (only one)</b>
<code>3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump</code>

<b>🔗 Trade</b>
• Pump.fun: pump.fun/coin/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump
• DexScreener: dexscreener.com/solana/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump

<b>🛡 Verify yourself</b>
• Solscan: solscan.io/token/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump
• RugCheck: 1 / Low risk (0 flagged)
• SolSniffer: solsniffer.com/scanner/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump

<b>🧬 Hold to climb the ranks</b>
DM the bot: /verify → sign a FREE message → tier-gated room invite arrives.
Tiers: Observer · Infected (100k) · Signal Bearer (1M) · Core (5M) · Ghost (10M).

<b>💚 Give-back wallet (public, on-chain)</b>
<code>CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4</code>

<b>⚠️ Scam-watch</b>
• Only the CA above is real.
• Admins NEVER DM first.
• We will NEVER ask for your seed phrase.
• Anyone offering "verification" outside this bot = scam.

<b>🌐 Official channels (only trust these)</b>
Site: coin-three-mu.vercel.app
X: x.com/gl1tchbased
Instagram: instagram.com/gl1tch_infected
Reddit: reddit.com/user/gl1tch_infected
Telegram: t.me/gl1tch_infected

<i>The signal does not ask permission to spread.</i>
```

## Pin'i nasıl uygularsın

1. Bot'un grup admin olduğundan emin ol (pin yetkisi gerek).
2. Yukarıdaki mesajı bot'la `/announce` üzerinden gönder (HTML formatı korunur)
   ya da kendi hesabından gönderip pinle.
3. Eski pin'i kaldır — tek pin, en güncel.
4. Her **CA değiştiğinde** ya da **yeni bir tier room** açıldığında güncelle.

## Bot welcome mesajı güncellemesi (öneri)

Yeni üye girişinde bot'un attığı welcome `bot/src/content.ts` içinde. Eğer CA
ve give-back wallet henüz orada görünmüyorsa, onu da bu pin'in özetiyle eşleştir.
