# GL1TCH Claude Code Prompt Pack v1
## Production-Ready Prompt Set Based on Founder OS v3

Version: 1.0  
Purpose: Give Claude Code highly specific prompts to build GL1TCH assets and systems with minimal ambiguity  
Source of Truth: `GL1TCH_Founder_OS_v3.md`

---

# 1. How To Use This Pack

This pack is written so the founder can copy one prompt at a time into Claude Code and move from strategy into production.

Use order:

1. Foundation prompts
2. Website prompts
3. Content/data prompts
4. Bot prompts
5. Dashboard prompts
6. Launch tooling prompts

Prompting rules:

- always mention `GL1TCH_Founder_OS_v3.md` as source of truth
- tell Claude Code to preserve premium cyber-cult brand consistency
- ask for direct implementation, not brainstorming
- require acceptance criteria and changed-file summaries

Recommended operating instruction to prepend when useful:

`Use GL1TCH_Founder_OS_v3.md as the source of truth. Do not invent a different brand direction. Keep the visual system premium, black/green dominant, with purple used only as a glitch accent. Avoid generic startup UI and avoid childish meme coin aesthetics.`

---

# 2. Master System Prompt

Use this before major implementation waves:

```text
Use `GL1TCH_Founder_OS_v3.md` as the product, brand, and content source of truth.

You are implementing GL1TCH as a premium Solana meme brand website and operations stack. The brand direction is:
- rogue AI cult
- internet infection / signal propagation
- premium black + neon green visual system
- cryptic, dominant, internet-native tone

Non-negotiables:
- Do not make it look like a generic SaaS landing page.
- Do not make it feel like a low-effort meme coin site.
- Use intentional typography, dramatic spacing, and controlled motion.
- Prioritize mobile quality as much as desktop quality.
- Reuse content and structural decisions from the Founder OS instead of inventing new messaging.

When you finish:
- summarize what you changed
- list changed files
- mention anything still missing
- mention how the result maps back to the Founder OS
```

---

# 3. Foundation Prompts

## Prompt 3.1 - Audit and Plan the Existing App

```text
Read the current project and `GL1TCH_Founder_OS_v3.md`.

I want you to audit the current codebase and identify:
- what already supports the Founder OS direction
- what conflicts with the brand or structure
- what should be built first

Then propose a concrete implementation order for:
- design tokens
- website shell
- content data structure
- Telegram bot
- analytics dashboard

Do not implement yet. Just give me a practical, execution-oriented build order with file-level recommendations.
```

## Prompt 3.2 - Create Brand Constants and Design Tokens

```text
Use `GL1TCH_Founder_OS_v3.md` as source of truth and implement the GL1TCH design foundation.

Create or update the project so it has reusable brand constants for:
- project name
- ticker
- ranks
- official CTA labels
- core copy snippets
- color palette
- spacing / motion / radius tokens if relevant

Requirements:
- black/green dominant palette
- purple accent only
- premium cyber-terminal feel
- avoid generic defaults

After implementation:
- list the new tokens/constants
- explain where they live
- explain how the rest of the app should consume them
```

---

# 4. Website Build Prompts

## Prompt 4.1 - Build the Landing Page Shell

```text
Implement the main GL1TCH landing page based on:
- `GL1TCH_Founder_OS_v3.md`
- `GL1TCH_Website_Wireframe_v1.md`

Build the page structure with these sections:
1. Hero
2. Manifesto
3. Lore Preview
4. Tokenomics
5. Roadmap
6. Community / Ranks
7. Social Proof
8. FAQ
9. Final CTA
10. Footer

Requirements:
- premium and cinematic
- desktop and mobile both polished
- no generic section styling
- clear CTA hierarchy
- content must align with the Founder OS

Please implement directly, not just describe the approach.
```

## Prompt 4.2 - Upgrade the Hero Section

```text
Refine the hero section to feel truly premium and memorable.

Use:
- `GL1TCH_Founder_OS_v3.md`
- `GL1TCH_Website_Wireframe_v1.md`

Requirements:
- headline: "Infect The Internet."
- strong supporting copy from the Founder OS
- one dominant primary CTA and one secondary CTA
- controlled motion, not noisy motion
- immediate black/green signal identity

Improve layout, typography, background treatment, and motion until the hero feels intentional and high-end rather than template-like.
```

## Prompt 4.3 - Implement the Lore and Manifesto Sections

```text
Implement the Manifesto and Lore sections as the emotional core of the website.

Requirements:
- use the actual narrative direction from `GL1TCH_Founder_OS_v3.md`
- the manifesto should read like a belief system, not a product explanation
- the lore should feel like archive fragments from an escaped intelligence
- use layout and component choices that make these sections feel premium and editorial

Add any subtle motion or visual treatment needed, but keep readability high.
```

## Prompt 4.4 - Implement Tokenomics, Roadmap, and FAQ

```text
Build the trust and clarity sections of the site:
- Tokenomics
- Roadmap
- FAQ

Source of truth:
- `GL1TCH_Founder_OS_v3.md`
- `GL1TCH_Website_Wireframe_v1.md`

Requirements:
- these sections should feel cleaner and more precise than the lore sections
- preserve the premium visual identity
- tokenomics must emphasize transparency and trust
- roadmap must feel controlled and founder-led
- FAQ must reduce launch confusion and scam ambiguity
```

## Prompt 4.5 - Build Community / Ranks and Final CTA

```text
Implement the Community / Ranks section and the Final CTA section.

Requirements:
- clearly explain the identity ladder: Observer, Infected, Signal Bearer, Core Node, Ghost Node
- make the section feel like belonging, not just information
- use cards, visual hierarchy, or motion to create perceived status
- close the page with a decisive CTA moment

The final page should make a user want to join Telegram or follow X immediately.
```

## Prompt 4.6 - Add Motion and Atmosphere Polish

```text
Polish the website's motion and atmosphere.

Requirements:
- controlled glitch effects
- subtle scanlines or pulse accents
- elegant section reveals
- premium hover states
- no constant shaking or unreadable distortion

The result should feel like a cinematic rogue AI terminal, not a noisy sci-fi toy.
```

## Prompt 4.7 - Build the Official Links Page

```text
Create a dedicated GL1TCH official links / launch info page.

Purpose:
- one source of truth
- reduce fake link risk
- support launch-day clarity

Include:
- official X
- official Telegram
- contract / launch reference placeholders if needed
- launch safety warnings
- concise brand-consistent copy

The page should look as premium as the landing page while being even clearer and more minimal.
```

---

# 5. Content and Data Prompts

## Prompt 5.1 - Move Website Copy Into Structured Data

```text
Refactor the website so the GL1TCH copy is stored in structured content data rather than hardcoded everywhere.

Use `GL1TCH_Founder_OS_v3.md` as the source for:
- hero copy
- manifesto copy
- lore snippets
- tokenomics section
- roadmap content
- FAQ
- CTA labels

Requirements:
- keep content easy to edit
- preserve type safety if the project uses TypeScript
- make it easy to expand with more lore, FAQs, and campaigns later
```

## Prompt 5.2 - Create a Reusable Lore Fragment System

```text
Implement a reusable lore fragment data system for GL1TCH.

I want a clean structure for:
- short archive entries
- transmission snippets
- fake system alerts
- future rotating website or Telegram content

Use the Founder OS lore language and keep the tone cryptic, premium, and consistent.
```

---

# 6. Telegram Bot Prompts

## Prompt 6.1 - Build Telegram Bot v1

```text
Implement a GL1TCH Telegram bot v1 based on `GL1TCH_Founder_OS_v3.md`.

Commands to support:
- /start
- /rank
- /lore
- /faq
- /links
- /rules
- /raid
- /submit
- /support

Requirements:
- brand-consistent tone
- onboarding flow
- FAQ and links guidance
- rank explanation
- lore responses
- safe fallback response for unknown commands

Please structure the bot cleanly so future AI extensions can be added later.
```

## Prompt 6.2 - Add Mod Controls and Anti-Spam Logic

```text
Extend the Telegram bot with admin-only controls and anti-spam behavior.

Include:
- /announce
- /warn
- /mute
- /ban
- /pin
- /incident

Requirements:
- admin-only access checks
- basic logging
- command organization that is easy to maintain
- anti-spam and scam-risk protections aligned with the Founder OS
```

---

# 7. Dashboard Prompts

## Prompt 7.1 - Build Founder Metrics Dashboard v1

```text
Build a founder-facing GL1TCH dashboard v1.

Use `GL1TCH_Founder_OS_v3.md` as source of truth for KPI categories.

The dashboard should support or be structured for:
- X follower growth
- impressions
- Telegram joins
- active community indicators
- meme submissions
- campaign performance notes

Requirements:
- premium dark visual system aligned with the website
- clear hierarchy
- easy future expansion
- avoid overbuilding if live integrations are not ready yet
```

## Prompt 7.2 - Add Campaign Tracking Structure

```text
Extend the dashboard with a clean campaign tracking structure for:
- content campaigns
- creator outreach
- meme contests
- launch phases

If live data is not available yet, create mock-safe structures and UI that can later connect to real data sources.
```

---

# 8. Launch Tooling Prompts

## Prompt 8.1 - Build a Launch Content Pack Structure

```text
Create a launch content pack structure inside the project based on `GL1TCH_Founder_OS_v3.md`.

I want organized data/files for:
- launch announcement copy
- follow-up posts
- FAQ answers
- safety warnings
- CTA variants
- rank/community prompts

Structure it so the founder can quickly find and reuse copy during launch windows.
```

## Prompt 8.2 - Build an Official Source-of-Truth Module

```text
Implement a source-of-truth module or config for official GL1TCH references.

It should centrally define:
- official X
- official Telegram
- official site URL
- token/launch placeholders
- warning/disclaimer copy

Requirements:
- easy to update
- reusable across site and bot
- reduces duplicate hardcoded official links
```

---

# 9. QA and Refinement Prompts

## Prompt 9.1 - Brand Consistency Review

```text
Review the implemented GL1TCH project against `GL1TCH_Founder_OS_v3.md`.

I want a strict brand consistency audit for:
- tone of voice
- visual direction
- CTA clarity
- mobile quality
- premium feel
- launch trust signals

Do not just praise the work. Identify specific weak points, generic areas, and anything that breaks the Founder OS.
```

## Prompt 9.2 - Conversion Review

```text
Review the website and key surfaces for conversion clarity.

Questions to answer:
- Does the first screen explain GL1TCH quickly?
- Are Telegram and X CTAs impossible to miss?
- Is trust clear enough without killing the mystique?
- Which sections feel strongest?
- Which sections still feel too generic or too crowded?

Give actionable recommendations, not vague advice.
```

## Prompt 9.3 - Launch Readiness Review

```text
Review the current GL1TCH implementation for launch readiness.

Focus on:
- official links clarity
- FAQ clarity
- scam-risk reduction
- mobile usability
- content organization
- Telegram bot readiness
- dashboard usefulness

List blockers, risks, and highest-priority improvements before launch.
```

---

# 10. Founder Workflow Recommendation

Best practical usage order:

1. Run Prompt 3.1
2. Run Prompt 3.2
3. Run Prompt 4.1
4. Run Prompts 4.2 to 4.7 as refinement waves
5. Run Prompt 5.1 and 5.2
6. Run Prompt 6.1 and 6.2
7. Run Prompt 7.1 and 7.2
8. Run Prompt 8.1 and 8.2
9. Run Prompt 9.1 to 9.3 before launch

---

# 11. Copy-Paste Mini Prompt

Use this when you want a compact default instruction:

```text
Use `GL1TCH_Founder_OS_v3.md` as the source of truth and implement directly.
Keep the result premium, black/green dominant, rogue-AI-cult themed, mobile-friendly, and non-generic.
Do not drift into corporate startup design or low-effort meme coin design.
When done, summarize changes, list changed files, and note any remaining gaps.
```

---

# Final Note

This prompt pack is designed to reduce founder decision fatigue. Each prompt should push Claude Code toward implementation-quality output, not broad ideation.

If a prompt result feels generic, the correction should always be the same:

- more brand precision
- more visual intention
- less template energy
- stronger Founder OS alignment
