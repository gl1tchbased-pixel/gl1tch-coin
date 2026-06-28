# GL1TCH — Trust Roadmap (free · anonymous · on-chain proof)

**Constraint:** zero budget, fully anonymous. So trust = **verifiable on-chain proof +
open code + radical transparency + consistency over time.** Not "trust us" — "go check
yourself, here's the link." This fits the brand 1:1 (rogue AI, code is truth) AND we own
the one thing no other meme coin has: **we ARE a scanner, so we can publicly pass our own
audit, live.**

## Where we stand today (our own scanner, real data 2026-06-28)
Verdict: **LOW RISK · 78/100.** Everything that actually rugs people is already neutralized:

| Check | Status | Proof |
|---|---|---|
| Mint authority | ✅ REVOKED | Solscan |
| Freeze authority | ✅ REVOKED | Solscan |
| Transfer tax | ✅ 0.00% | Token-2022 ext |
| LP locked / burned | ✅ 100% | RugCheck / Solscan |
| Metadata | ✅ IMMUTABLE | Solscan |
| Insiders / bundled | ✅ 0.0% | RugCheck |
| RugCheck score | ✅ 1 (cleanest band) | rugcheck.xyz |
| Liquidity | ⚠️ ~$1.8k thin | DexScreener/GeckoTerminal |
| Top holder | ⚠️ 95.9% (= locked LP/curve, not a person) | Solscan |

The two ⚠️ are **smallness, not malice** — and we will address them in the open, not hide them.

---

## PILLAR 1 — Proof-of-Rugproof (THE centerpiece, free)
Make every rug vector *self-evidently impossible*, in one shareable place.

- **1A. `/proof` page** — a single premium URL that is the one link you send any skeptic.
  Live self-scan verdict of $GL1TCH (calls our own `/api/scan`), every guarantee with a
  **"verify on Solscan / RugCheck / GeckoTerminal" button** next to it. Nobody takes our
  word — they click an independent site. *Buildable now.*
- **1B. Self-scan badge on the homepage + pinned everywhere.** Embed `$GL1TCH`'s own live
  `/api/badge` verdict ("LOW RISK · 78, scanned by GL1TCH") on the site, X pin, TG pin.
  Auto-updates. The flex: *"the rug-scanner passes its own scan — re-run it yourself."*
- **1C. Honest yellow-flag section.** Don't bury liquidity/concentration — explain them:
  "LP is THIN but **locked/burned — we physically cannot pull it** (here's the tx). The 95.9%
  'top holder' is the locked liquidity pool, not a wallet (here's the address)." Owning the
  weakness reads as more honest than a fake-perfect 100/100.

## PILLAR 2 — Open everything (free, anonymity-proof)
Anonymous teams earn trust by being *auditable*, not by being known.

- **2A. Open source, loud.** Repo is already PUBLIC (github.com/gl1tchbased-pixel/gl1tch-coin).
  Link it from `/proof` + footer: "our scanner, bot and site are open — read the code."
- **2B. Public wallet map.** Label every wallet so there are no hidden bags:
  deployer `H5qb…aFb4`, founder hold (~3.57%), give-back `CSxe…C6g4`, locked LP. Each links
  to Solscan. "No secret team wallets — here they all are."
- **2C. Seed + show the give-back wallet.** Founder sends a small symbolic amount so Solscan
  shows real activity (currently empty = looks dormant). Turns a claim into a visible fact.

## PILLAR 3 — Third-party verification (free checkmarks)
Trust borrowed from neutral sources we don't control.

- **3A. RugCheck "Good" + verify socials** (score already 1 — add the verified-links step, free).
- **3B. GeckoTerminal info** (logo live; add website/socials — free form).
- **3C. CoinGecko / SolSniffer submissions** (free, slow, eligibility-gated — submit & wait).
- **3D. DexScreener** — re-list when volume recovers (the pair was dropped for low volume;
  free path back is volume, not payment).

## PILLAR 4 — Consistency = the trust that compounds (free)
A coin that ships every day for weeks is, by itself, proof it isn't a quick rug.

- **4A. Public changelog** (`/news` exists) — log every scanner feature + date. A visible
  build history is an anonymous team's reputation.
- **4B. The 8h auto-video cadence** (already running) doubles as a trust signal: relentless,
  dated, public output. "Rugs disappear; we post every 8 hours."
- **4C. GitHub commit history** as a live "still-building" proof, linked from `/proof`.
- **4D. Pinned trust thread + a `/faq` "is this a rug?" answer** that walks through each proof.

## PILLAR 5 — Liquidity trust without spending (free / organic)
The honest weak point. With no budget we can't inject LP, so we build trust *around* it:

- **5A. Public "we will never remove LP" commitment** — easy, because it's already locked/burned.
  Show the lock/burn so the promise is already enforced by the chain, not by our word.
- **5B. Reframe thin-but-locked** in all messaging: a $1.8k pool you CAN'T pull is safer than
  a $1M pool the dev can yank. Make that the talking point.
- **5C. Grow liquidity organically** via holders/volume (the real lever is distribution — see
  the X-agent + content plans), not paid injection.

---

## Build order (what gets shipped, in priority)
1. **`/proof` page + live self-scan + verify-yourself links** (Pillar 1A/1C) — highest impact, buildable now.
2. **Self-scan badge on homepage + pin copy** (1B) — the daily flex.
3. **Wallet map + open-source callout on `/proof`** (2A/2B).
4. **Trust explainer video** (8h cadence slot) — "Don't trust us. Verify us." walking the proof page.
5. **Founder actions (free, ~10 min):** seed give-back wallet; verify RugCheck/GeckoTerminal socials; pin the trust thread.
6. **Ongoing:** changelog discipline + organic liquidity/holder growth.

## The positioning line
> **GL1TCH doesn't ask for your trust — it hands you the receipts. Mint revoked, freeze
> revoked, zero tax, liquidity locked, code open. Don't believe us: scan us. We built the
> scanner; we pass it live.**

## STATUS (updated 2026-06-28)
- [x] **1A `/proof` page LIVE** — coin-three-mu.vercel.app/proof (live self-scan LOW RISK 78, verify-yourself links, wallet map, open-source, honest yellow-flags). In nav/footer/sitemap.
- [x] **1C honest yellow-flags** (thin-but-locked liquidity + "95.9% = locked LP, not a person") — on /proof.
- [x] **2A open-source callout** + [x] **2B wallet map** (deployer/give-back/contract → Solscan) — on /proof.
- [x] **5A LP commitment** — "100% locked, we can't pull it" messaging shipped on /proof + video.
- [x] **Bot `/proof` command** — live self-scan + receipts + verify links (RugCheck/Solscan/GitHub).
- [x] **Trust video** "Don't trust us. Verify us." (VerifyUs.tsx) → posted Telegram/X/YouTube/Instagram.
- [ ] 1B homepage self-scan badge (embed on `/`) · [ ] 2C seed give-back (FOUNDER, ~10min)
- [x] **3B GeckoTerminal token-info update SUBMITTED** (2026-06-28, ticket GTIU2806260008 → gl1tchbased@gmail.com, free path, ~5 biz-day review) — name/website/socials/desc + Solana pool.
- [ ] 3A RugCheck verify (FOUNDER: connect creator wallet H5qb…aFb4 → sign → add socials) · [ ] 4A changelog discipline
