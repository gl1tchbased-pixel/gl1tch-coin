# GL1TCH Auto-Video Plan — every 8h, all platforms, explain a feature

**Goal:** attract customers by explaining what GL1TCH actually does. Every 8 hours,
build ONE fresh, original feature-explainer video (never reuse a previous clip or
composition) and publish to Telegram + X + YouTube + Instagram.

**Rules**
- Each video must be visually distinct from all prior ones (new Remotion composition,
  original motion graphics — no recycled AI clips).
- It must clearly EXPLAIN one feature/update so a newcomer gets why GL1TCH is useful.
- Brand palette only (green #7CFF4F, purple #7A3CFF, ink #050505, paper #F5F7F8).
- 9:16, ~20-28s. Render to pump-pack/videos/branded/. Verify ≥1 still before posting.
- Caption/title must explain the feature + CTA (coin-three-mu.vercel.app/scan · t.me/gl1tch_infected).

**Pipeline per video**
1. Build + render the new composition (register in remotion/Root.tsx).
2. Add a preset to e2e/social/yt-upload.mjs, ig-upload.mjs, e2e/x/send-tg-video.mjs.
3. TG: `POST=<key> node e2e/x/send-tg-video.mjs` · YT/IG: `POST=<key> node e2e/social/{yt,ig}-upload.mjs` · X: x-autopost (≤280 chars, verify length).
4. Mark the concept DONE below.

## Concept queue (do in order, then invent fresh ones)
1. [DONE 2026-06-27] **Multichain** — "6 Chains, 1 Scanner" (MultiChain.tsx, posted all 4)
2. [ ] **Telegram auto-scan** — paste any contract in the group → instant verdict
3. [ ] **Non-custodial** — other bots want your keys; we never touch them
4. [ ] **Search by name** — no contract? type the token name, any chain
5. [ ] **Holder utility** — hold $GL1TCH → unlimited scans + Watchtower slots
6. [ ] **Plain-English** — we don't say "the AI decided"; we show you the why
7. [ ] **AI verdict** — the rogue AI reads the chain & writes the verdict in its own words (V3)
8. [ ] **Degen intel** — insiders, bundled wallets, snipers, fake-liquidity exposed (V3)
9. [ ] **Verified blue-chips** — real token vs clone; correct price every chain (V3)
10. [ ] **Shareable badge/card** — flex your verdict; embed "Scanned by GL1TCH" (V3)
11. [ ] (then: new features as they ship + fresh angles, always unique)

## Posted log
- 2026-06-27 — Multichain "6 Chains, 1 Scanner" → Telegram(#325), YouTube(shorts/HEHIPWUFEQc), Instagram, X. ✅ all 4
