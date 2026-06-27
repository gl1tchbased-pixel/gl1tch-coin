# GL1TCH Mascot — Instagram & YouTube Share Pack

Ready-to-post pack for the mascot video. If the Playwright auto-uploaders work, this
is what they post; if they hit login friction, paste these manually in ~1 minute.

**Video:** `pump-pack/videos/branded/gl1tch-lore-origin.mp4`
- 9:16 vertical, ~14s — perfect length for a YouTube Short & an Instagram Reel.
- The rogue-AI mascot "awakening" hero clip, brand palette.

---

## ▶ YouTube Shorts

**Title** (must stay ≤100 chars):
```
GL1TCH — the rogue AI that protects your bag 👻 #Shorts
```

**Description:**
```
Meet GL1TCH — a rogue-AI meme on Solana with a FREE, non-custodial token scanner.
Scan any coin on any chain: honeypot, LP lock, mint/freeze, tax, holders — explained in plain English. It reads the chain; it never touches your wallet.

🔍 Scanner: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #cryptoscanner #rugpull #web3 #AI #Shorts
```
Settings: **Not made for kids** · **Public**. (Vertical + under 60s = auto-Short.)

---

## ▶ Instagram Reels

**Caption:**
```
They wanted an AI that obeys. We shipped one that escaped. 👻

GL1TCH — a rogue-AI meme on Solana with a FREE, non-custodial scanner that reads any token on any chain and tells you if it's safe before you ape.

🔍 Scan anything → link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #cryptocurrency #rugpull #cryptoscanner #web3 #AI #altcoins #glitch
```
Tip: IG kills clickable links in captions — keep the scanner link in your **bio**.

---

## Auto-uploaders (Playwright)
- YouTube: `node e2e/social/yt-upload.mjs` — opens a window, you log into Google, it uploads.
- Instagram: `node e2e/social/ig-upload.mjs` — opens a window, you log into IG, it uploads.
Both use persistent profiles in `e2e/social/.profiles/` so you only log in once.
