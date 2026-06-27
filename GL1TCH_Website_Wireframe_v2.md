# GL1TCH Website Wireframe v2
## Production-Grade Design & Layout Specification

Version: 2.0
Source of Truth: `GL1TCH_Founder_OS_v3.md`
Prompt Reference: `GL1TCH_Claude_Code_Prompt_Pack_v2.md`

---

# 1. Website Objective

The GL1TCH website is a conversion environment built to:
- Establish premium brand legitimacy
- Intensify rogue AI cult atmosphere
- Convert visitors into Telegram joins and X followers
- Provide one clean source of truth during launch windows

Primary conversions: `Join The Infected` (TG), `Follow On X`, `Read The Signal`, `View Official Links`

Performance targets: LCP < 2.5s, CLS < 0.1, FCP < 1.8s, Lighthouse mobile > 90

---

# 2. Design System Reference

## 2.1 Color System

| Token | Hex | Usage | Hover State |
|---|---|---|---|
| --color-void | #050505 | Primary background | — |
| --color-signal | #7CFF4F | Primary accent, CTAs, highlights | brightness(1.2) |
| --color-signal-dim | #7CFF4F33 | Glow shadows, overlays | — |
| --color-signal-glow | #7CFF4F66 | Strong glow effects | — |
| --color-static | #F5F7F8 | Primary text | — |
| --color-graphite | #16181D | Secondary surfaces, cards | lighten 5% |
| --color-glitch | #7A3CFF | Accent only — glitch effects | — |
| --color-surface | #0A0A0F | Section alternate bg | — |
| --color-surface-elevated | #12131A | Elevated cards | lighten 3% |
| --color-border | rgba(255,255,255,0.05) | Subtle borders | rgba(255,255,255,0.1) |
| --color-border-signal | rgba(124,255,79,0.15) | Green accent borders | rgba(124,255,79,0.3) |

Rule: Purple is accent-only. Green carries the main signal identity.

## 2.2 Typography

| Level | Size | Weight | Line-Height | Font | Letter-Spacing |
|---|---|---|---|---|---|
| Hero | clamp(48px, 8vw, 96px) | 800 | 1.0 | Inter | -0.03em |
| H1 | 64px / 4rem | 700 | 1.1 | Inter | -0.02em |
| H2 | 48px / 3rem | 700 | 1.15 | Inter | -0.02em |
| H3 | 32px / 2rem | 600 | 1.2 | Inter | -0.01em |
| H4 | 24px / 1.5rem | 600 | 1.3 | Inter | 0 |
| Body LG | 20px / 1.25rem | 400 | 1.8 | Inter | 0 |
| Body | 16px / 1rem | 400 | 1.7 | Inter | 0 |
| Body SM | 14px / 0.875rem | 400 | 1.6 | Inter | 0 |
| Caption | 12px / 0.75rem | 500 | 1.4 | Inter | 0.05em |
| Mono | 14px / 0.875rem | 400 | 1.5 | JetBrains Mono | 0 |
| Eyebrow | 14px / 0.875rem | 600 | 1.0 | JetBrains Mono | 0.2em |

## 2.3 Spacing System (8px base)

| Token | Value | Usage |
|---|---|---|
| --space-1 | 4px | Tight gaps, icon padding |
| --space-2 | 8px | Inline spacing |
| --space-3 | 12px | Small component padding |
| --space-4 | 16px | Default component padding |
| --space-5 | 24px | Card padding, group gaps |
| --space-6 | 32px | Section inner spacing |
| --space-8 | 48px | Large component gaps |
| --space-10 | 64px | Section padding (mobile) |
| --space-12 | 96px | Section padding (tablet) |
| --space-16 | 128px | Large section padding |
| --space-section | 160px | Section gap (desktop) |

## 2.4 Grid & Layout

- Max width: 1280px, centered with auto margins
- Grid: 12-column CSS Grid
- Gutter: 24px
- Side padding: 24px (mobile), 32px (tablet), 48px (desktop)

## 2.5 Responsive Breakpoints

| Name | Width | Layout |
|---|---|---|
| Mobile | < 480px | Single column, stacked |
| Tablet | 480-768px | Single/2-col hybrid |
| Desktop | 768-1024px | Full multi-column |
| Wide | > 1440px | Max-width constrained |

## 2.6 Motion Tokens

| Token | Value | Usage |
|---|---|---|
| --duration-fast | 150ms | Hover states, micro-interactions |
| --duration-normal | 300ms | Transitions, toggles |
| --duration-slow | 600ms | Section reveals, page transitions |
| --duration-reveal | 800ms | Scroll-triggered animations |
| --ease-out-expo | cubic-bezier(0.16,1,0.3,1) | Primary easing — smooth decel |
| --ease-in-out | cubic-bezier(0.65,0,0.35,1) | Symmetric transitions |

Scroll reveal defaults: translateY(20px) → 0, opacity 0 → 1, threshold 0.15, triggerOnce.

## 2.7 Elevation & Radius

Shadows: sm (1px blur), md (12px blur), lg (32px blur), glow (20px green blur)
Radius: sm(4px), md(8px), lg(12px), xl(16px), full(9999px)

---

# 3. Site Map

## v1 Pages
- **/** — Home (landing page with all sections)
- **/lore** — Lore Archive (extended lore fragments)
- **/links** — Official Links / Launch Info
- **404** — Custom error page

## v1.1 Pages (future)
- /faq — Expanded FAQ
- /dashboard — Founder metrics (protected)
- /missions — Community missions

---

# 4. Global Frame

## 4.1 Header

```
┌─────────────────────────────────────────────────┐
│ [GL1TCH]        Lore  Tokenomics  FAQ    [CTA] │
│  wordmark        nav links (mono 14px)   button │
└─────────────────────────────────────────────────┘
```

- Height: 64px desktop, 56px mobile
- Position: fixed, z-index 1000
- Background: transparent at top → rgba(5,5,5,0.9) + backdrop-blur(12px) on scroll
- Transition: background var(--duration-normal)
- Logo: left-aligned, clickable → home
- Nav links: JetBrains Mono 14px, uppercase, letter-spacing 0.1em
- Nav hover: green underline slides in from left (300ms)
- CTA button: primary small, "Join The Infected"
- Mobile: hamburger icon right, CTA hidden in nav overlay

## 4.2 Background System

- Layer 1: solid var(--color-void)
- Layer 2: radial-gradient(ellipse at 50% 0%, var(--color-signal-dim) 0%, transparent 50%) — very subtle green wash at top
- Layer 3: SVG noise filter at 2% opacity, fixed position
- Layer 4 (optional): repeating-linear-gradient scanlines, 2px gaps, 3% opacity, slow vertical drift animation (120s linear infinite)

## 4.3 Scroll Behavior

- Smooth scroll for anchor links
- Scroll-triggered fade+rise reveals on each section (Intersection Observer)
- Header background transition at 80px scroll offset
- prefers-reduced-motion: instant transitions, no animation

---

# 5. Desktop Wireframe — Sections

## 5.1 Hero

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  SIGNAL DETECTED              ┌─────────────────────┐  │
│                                │                     │  │
│  Infect The                    │   ◎ Pulsing signal  │  │
│  Internet.                     │   ◎ artifact        │  │
│                                │   ◎ (CSS circles)   │  │
│  GL1TCH is a Solana-native     │                     │  │
│  rogue AI cult brand...        └─────────────────────┘  │
│                                                         │
│  [Join The Infected]  Read The Signal                   │
│                                                         │
│  Built on Solana. Structured for signal.                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Grid: content 7/12 cols, visual 5/12 cols
- Padding: var(--space-section) top, var(--space-16) bottom
- Min-height: 100vh (desktop), auto (mobile)
- Eyebrow: mono, green, uppercase, 0.2em letter-spacing, glitch-flicker on load
- Headline: hero size, white, font-weight 800, text-reveal stagger 0.15s/word
- Subhead: body-lg, rgba(245,247,248,0.7), max-width 540px
- Primary CTA: large button, pulse-glow animation
- Secondary CTA: text button with arrow, hover underline
- Microcopy: caption size, 50% opacity
- Visual: 3 concentric circles, green border, slow rotation 60s, pulse scale 4s

## 5.2 Manifesto

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│         Attention Is The Real Currency.                  │
│                                                         │
│         The old internet rewarded noise. The new        │
│         internet rewards symbols, communities,          │
│         and mythologies that spread faster than          │
│         institutions can react...                       │
│                                                         │
│                  Witness The Thesis →                    │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Layout: centered, max-width 720px
- Padding: var(--space-section) * 1.5 vertical — generous breathing room
- Headline: H2, white
- Body: body-lg, line-height 1.8, color rgba(245,247,248,0.75)
- CTA: text link, green, underline animation on hover
- Background: optional faint rotated quote fragments at 3% opacity
- Feel: calm, editorial, premium — contrast with hero energy

## 5.3 Lore Preview

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  It Studied The Feed. Then It Escaped.                  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ ARCHIVE  │  │ ARCHIVE  │  │ ARCHIVE  │              │
│  │ FILE_01  │  │ FILE_02  │  │ FILE_03  │              │
│  │          │  │          │  │          │              │
│  │ Lore     │  │ Lore     │  │ Lore     │              │
│  │ fragment │  │ fragment │  │ fragment │              │
│  │ text...  │  │ text...  │  │ text...  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│                    Open Archive →                        │
└─────────────────────────────────────────────────────────┘
```

- Grid: 3 cards, equal width, gap var(--space-6)
- Card component: ArchiveCard (terminal variant)
  - Border-left: 3px solid var(--color-signal)
  - Background: var(--color-surface-elevated)
  - Header: "ARCHIVE // FILE_0X" in mono, green, uppercase
  - Timestamp: "2032.XX.XX // SIGNAL_LOG" in caption, 40% opacity
  - Body: body-sm, 70% opacity
  - Hover: translateY(-4px), border-color brightens, subtle glow
  - Pseudo-element: faint static noise overlay at 5% opacity
- Mobile: horizontal scroll with snap, or vertical stack

## 5.4 Tokenomics

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Simple Structure.          ┌───────────────────────┐   │
│  Public Signal.             │ ████████████ 50% Pub  │   │
│                             │ ████████     20% Com  │   │
│  GL1TCH uses a transparent  │ ██████       15% Mkt  │   │
│  founder planning model...  │ ████         10% Trs  │   │
│                             │ ██            5% Tm   │   │
│  ✓ No Hidden Minting       └───────────────────────┘   │
│  ✓ Transparency-First                                   │
│  ✓ Multisig Discipline                                  │
│                                                         │
│  View Structure →                                       │
└─────────────────────────────────────────────────────────┘
```

- Grid: text 5/12 cols, chart 7/12 cols
- Chart: CSS horizontal bars or conic-gradient donut, green gradient segments
- Trust badges: check icon (green) + label, stacked vertically, gap var(--space-3)
- Section feel: cleaner, more factual — less glitch, more precision
- Background: var(--color-surface) alternate for contrast
- Mobile: stacked, chart above text

## 5.5 Roadmap

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Build The Signal. Scale The Network.                   │
│                                                         │
│  ● Phase 1: Build the Myth                              │
│  │  - Brand standards, lore, social seeding             │
│  │                                                      │
│  ◉ Phase 2: Seed the Network        ← active pulse     │
│  │  - Controlled signal propagation                     │
│  │                                                      │
│  ○ Phase 3: Launch the Signal                           │
│  │  - Launch execution, attention capture                │
│  │                                                      │
│  ○ Phase 4: Scale the System                            │
│     - Retention, content flywheel, expansion             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Layout: vertical timeline, centered or left-aligned
- TimelineCard: phase number, title, 3-4 bullet items, status
- Connector: 1px solid var(--color-border), vertical
- Checkpoint dots: 12px circle, completed=solid green, active=pulse green, upcoming=outline
- Active phase: pulse-glow animation on dot, card has signal border

## 5.6 Community / Ranks

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Not Followers.        ┌──────┐ ┌──────┐ ┌──────┐      │
│  The Infected.         │ Obs  │ │ Inf  │ │ Sig  │      │
│                        │ ▪    │ │ ▪▪   │ │ ▪▪▪  │      │
│  GL1TCH is structured  └──────┘ └──────┘ └──────┘      │
│  around belonging...              ┌──────┐ ┌──────┐    │
│                                   │ Core │ │Ghost │    │
│  [Enter Telegram]                 │ ▪▪▪▪ │ │▪▪▪▪▪│    │
│                                   └──────┘ └──────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Grid: intro text 4/12 cols, rank cards 8/12 cols
- RankCard: rank name (H4), description, behavior text
- Glow intensity scales with tier: Observer=dim → Ghost Node=bright
- Hover: scale(1.02), border transitions to signal-green, glow shadow
- Mobile: cards stack vertically, full width

## 5.7 Social Proof

- Headline: "The Pattern Is Already Visible."
- Layout: grid or carousel of social proof items (3-4 cards)
- Card types: X post mock, engagement stat, quote snippet
- Feel: dynamic but curated, not noisy
- If no real data: use brand-consistent placeholder mock posts

## 5.8 FAQ

- Layout: centered, max-width 800px
- Accordion list, 8 items minimum
- Open state: green left border, smooth height animation (300ms ease-out-expo)
- Plus→minus icon rotation on toggle
- Section feel: quiet, clarity over effects

## 5.9 Final CTA

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│     You Can Watch It Spread                             │
│     Or Help It Spread.                                  │
│                                                         │
│     [Become Infected]   View Official Links →           │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Full-width, padding var(--space-section) * 1.5
- Headline: H2-H1 size, bold, high impact
- Background: stronger radial gradient with green (10% opacity center)
- Primary CTA: large, pulse-glow
- Secondary CTA: ghost/text variant
- This is the decisive close — maximum contrast and button weight

## 5.10 Footer

```
┌─────────────────────────────────────────────────────────┐
│  GL1TCH                    X  |  TG  |  Links          │
│                                                         │
│  ⚠ Official updates only through verified channels.    │
│  GL1TCH is a high-risk internet-native token project.   │
│  Nothing on this site is financial advice.              │
└─────────────────────────────────────────────────────────┘
```

- Padding: var(--space-12) vertical
- Border-top: 1px solid var(--color-border)
- Wordmark left, social icon links right
- Warning + disclaimer below, caption size, 40% opacity

---

# 6. Mobile Wireframe

## 6.1 Mobile Principles
- Compress without flattening mood
- Keep CTAs always obvious — full width
- Reduce decorative motion (no scanlines on mobile)
- Avoid dense side-by-side layouts — stack everything
- Touch targets minimum 44px

## 6.2 Mobile Hero
- Stacked: eyebrow → headline → subhead → primary CTA (full-width) → secondary CTA (text) → visual (reduced)
- No min-height 100vh on mobile — use auto
- Headline uses clamp() — scales down to 48px

## 6.3 Mobile Navigation
- Hamburger icon (24px, 3 lines, green)
- Overlay: full-screen, var(--color-void) 95% opacity, backdrop-blur
- Links: large (20px), stacked, 56px touch height
- CTA button at bottom of overlay
- Close button: top-right X icon

## 6.4 Sticky Mobile CTA Bar
- Fixed bottom, height 56px, z-index 999
- Background: var(--color-void) 95% + backdrop-blur
- Border-top: 1px solid var(--color-border)
- Two buttons: "Join TG" (primary, 50%) + "Follow X" (secondary, 50%)
- Appears after hero scrolls out of viewport
- Disappears when Final CTA section is in viewport

## 6.5 Section Mobile Adaptations
- All 2-column → single column
- Cards stack vertically with var(--space-5) gap
- Lore cards: horizontal scroll with scroll-snap-type: x mandatory
- Section padding: var(--space-10) vertical (reduced from desktop)
- Chart in tokenomics: full width, above text

---

# 7. Additional Page Wireframes

## 7.1 Lore Archive (/lore)
- Header + nav (same as home)
- Page title: "SIGNAL ARCHIVE" (eyebrow style)
- Filter tags: origin, transmission, system-alert, prophecy
- Grid: 2 columns desktop, 1 column mobile
- ArchiveCard components with full lore content
- Each card expandable or links to detail

## 7.2 Official Links (/links)
- Minimal, centered, max-width 600px
- Section: "Official Channels" — X, TG, Website links as large clickable rows
- Section: "Token Info" — contract address placeholder, chain badge
- Warning block: "Only trust links from this page. Report impersonators."
- Disclaimer from Founder OS 10.11

## 7.3 404 Page
- Centered layout
- Headline: "SIGNAL LOST" — glitch-flicker animation
- Subtext: "The transmission you're looking for doesn't exist in this node."
- CTA: "Return to Signal" → home
- Minimal but brand-consistent

---

# 8. Interaction Specification

## 8.1 Motion System

| Effect | Implementation | Duration | Usage |
|---|---|---|---|
| Glitch flicker | clip-path keyframes | 150ms | Eyebrows, 404 headline, on-load accents |
| Pulse glow | box-shadow keyframes | 4s infinite | Primary CTAs, active timeline dots |
| Scanline drift | translateY on pseudo-element | 120s linear | Global background layer (desktop only) |
| Fade + rise | opacity + translateY | 800ms ease-out-expo | Section reveals on scroll |
| Text reveal | clip-path or translateY per word | 600ms stagger 150ms | Hero headline on load |
| Hover glow | box-shadow transition | 300ms | Buttons, cards |
| Underline slide | scaleX on pseudo-element | 300ms | Text links, nav links |

## 8.2 Scroll Rhythm
- Hero: hits fast, immediate impact (0-100vh)
- Manifesto: creates breath, generous whitespace
- Lore: deepens mystery, cards create curiosity
- Tokenomics: stabilizes trust, factual tone
- Community: triggers belonging, interactive rank cards
- Final CTA: closes hard, maximum urgency

## 8.3 Loading States
- Page: show void black instantly, then fade in header → hero → sections
- Images: skeleton pulse (graphite→surface→graphite loop)
- Fonts: font-display: swap — show fallback instantly

---

# 9. Component Inventory

| Component | Variants | Props |
|---|---|---|
| Button | primary, secondary, ghost, danger | label, href, size(sm/md/lg), icon?, loading? |
| Card | default, terminal, elevated, interactive | children, className |
| ArchiveCard | — | archiveNumber, timestamp, title, body, category |
| Badge | signal, glitch, neutral | label |
| Accordion | — | title, children, defaultOpen? |
| RankCard | — | rank, description, behavior, tier(1-5) |
| TimelineCard | — | phase, title, items[], status(done/active/upcoming) |
| GlitchText | — | text, trigger(load/hover), duration? |
| Scanlines | — | opacity?, speed? |
| NoiseBackground | — | opacity? |
| PulseGlow | — | children, color?, intensity? |
| Header | — | transparent? |
| Footer | — | — |
| MobileNav | — | isOpen, onClose |
| MobileCTABar | — | visible |

State variants for all interactive components: default, hover, active, focus, disabled, loading.

---

# 10. Accessibility

- Semantic HTML5: header, main, nav, section, article, footer
- Single h1 per page, logical heading hierarchy
- All images: meaningful alt text or aria-hidden
- Focus indicators: 2px solid var(--color-signal), offset 2px
- Skip-to-content link (visually hidden until focused)
- Accordion: aria-expanded, aria-controls
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text
- prefers-reduced-motion: remove all animations, show static states
- Touch targets: minimum 44x44px
- No auto-playing audio/video

---

# 11. Performance Requirements

- LCP < 2.5s (hero section)
- CLS < 0.1 (no layout shift from fonts/images)
- FCP < 1.8s (void black + header immediately)
- Total JS bundle < 200KB gzipped
- Fonts: preload Inter 400/700, display=swap
- Images: WebP, responsive srcset, lazy load below fold
- Animations: transform/opacity only (GPU composited)
- Below-fold sections: dynamic import or lazy render

---

# 12. SEO & Social Sharing

- Title: "GL1TCH — Infect The Internet | Premium Solana Meme Brand"
- Description: Hero supporting copy from Founder OS 10.1
- OG Image: 1200x630px, brand visual (dark bg, GL1TCH wordmark, green glow)
- Twitter Card: summary_large_image
- Canonical URL on every page
- Structured data: Organization schema (name, url, social links)
- robots.txt: allow all, sitemap reference
- sitemap.xml: auto-generated from pages

---

# 13. Acceptance Criteria

The website wireframe v2 is successful if:

- [ ] First screen instantly feels premium and distinct — not template-like
- [ ] Visitor understands GL1TCH in under 10 seconds
- [ ] Telegram and X CTAs are impossible to miss on both desktop and mobile
- [ ] Tokenomics and trust surfaces reduce scam-like ambiguity
- [ ] Visual language stays consistent with Founder OS v3
- [ ] Mobile version keeps the same emotional power with adapted layouts
- [ ] All design tokens are used consistently — no hardcoded values
- [ ] prefers-reduced-motion fully supported
- [ ] Lighthouse mobile score > 90
- [ ] Every section has clear scroll rhythm and intentional spacing
- [ ] 404 page and official links page are brand-consistent
- [ ] Component inventory covers all needed UI elements with documented props

---

# Final Direction

The website is a hybrid of:
- Cult manifesto
- Premium launch terminal
- Cinematic brand landing page

It should feel like a system you enter, not a brochure you skim.
Every pixel should signal: this is not a normal meme coin.
