# Glitchy v3 — Prompt Kit (Chrome + Shadow)

> **Türkçe özet:** Bu dosya, Glitchy'yi başka AI araçlarında (Higgsfield, Midjourney, Kling, Hailuo, Veo, Runway, GPT Image, Flux) **aynı karakter olarak** üretmek için hazır promptlar içerir. En tutarlı sonuç için her zaman **image-to-video** kullan: ilk kare olarak bizim resmi render'larımızı (`public/brand/glitchy-v3/*.png`) ver, sadece hareketi tarif et. Sıfırdan üretim (text-to-image/video) gerekiyorsa, Bölüm 1'deki karakter tanımını promptun en başına aynen yapıştır ve Bölüm 2'deki negatif promptu ekle. Promptlar İngilizce, çünkü modeller İngilizceyi en iyi anlıyor.

---

## 0. Official reference assets (use these first)

Transparent PNG renders from the real-time 3D engine. Attach them as **first frame** (image-to-video) or **character/omni reference** (image models).

| File | Use |
|---|---|
| `public/brand/glitchy-v3/glitchy-chrome-hero.png` | Chrome, front, smiling (master reference) |
| `public/brand/glitchy-v3/glitchy-chrome-34.png` | Chrome, three-quarter view (shape reference) |
| `public/brand/glitchy-v3/glitchy-chrome-laugh.png` / `-wave` / `-wink` | Chrome expressions |
| `public/brand/glitchy-v3/glitchy-shadow-hero.png` | Shadow, front, smiling (master reference) |
| `public/brand/glitchy-v3/glitchy-shadow-34.png` | Shadow, three-quarter view |
| `public/brand/glitchy-v3/glitchy-shadow-laugh.png` / `-wave` / `-wink` | Shadow expressions |
| `public/brand/glitchy-v3/glitchy-duo-hero.png` | Both editions together (3000×2000) |

Rendered videos (already finished, no AI needed): `pump-pack/videos/glitchy-v3/`.

---

## 1. Character bible — paste this first in every from-scratch prompt

**Core (both editions):**
```
Glitchy, an adorable chibi ghost mascot. One smooth gumdrop-shaped body: a big round dome head that is the whole body, widest at the middle, tapering into a short tail that curls slightly to the right. NO legs, NO feet — it floats in mid-air. Two small rounded stub arms on the sides, no fingers. The face sits low on the front of the dome: two big glossy oval black eyes, slightly apart — the LEFT eye has a glowing signal-green iris with a round black pupil and big white catchlights; the RIGHT eye is a pixelated "glitch" eye: a blocky iris split into green and violet halves with a square pixel pupil. Below the eyes, a small open "D"-shaped smile with two tiny white fangs and a violet tongue, soft violet blush on the cheeks. A neon green outlined numeral "1" glows on the forehead. The bottom of the tail dissolves into floating square voxel pixels — small cubes in the body material mixed with glowing green #7CFF4F and violet #7A3CFF cubes that trickle downward.
```

**Chrome edition (add after the core):**
```
CHROME EDITION: mirror-polished liquid chrome body with dark, high-contrast studio reflections (a softbox highlight on top of the head), a thin green rim light on the left edge and a violet rim light on the right edge, glowing green "1" glyph.
```

**Shadow edition (add after the core):**
```
SHADOW EDITION: deep violet-black glossy vinyl body (#2B2140) with a satin violet sheen and crisp white softbox highlights, neon green "1" glyph, glowing green eye-lines when the eyes close, lavender blush.
```

**Render style (add last):**
```
Premium designer-toy 3D render, collectible vinyl-figure quality, Octane/Redshift look, soft studio lighting, subtle rim lights, shallow depth of field, dark near-black background #050505 with faint green and violet bokeh, centered, crisp, 8k, cute and happy, friendly expression.
```

**Palette rule:** only signal green `#7CFF4F`, glitch violet `#7A3CFF`, static white `#F5F7F8`, near-black `#050505` (+ chrome/violet-black body). Never pink, magenta, cyan, red or orange.

---

## 2. Universal negative prompt

```
legs, feet, toes, hands with fingers, human body, realistic animal, horror, scary, creepy, blood, rows of sharp teeth, angry eyebrows, multiple tails, extra eyes, extra arms, asymmetrical body, deformed face, melted, pink, magenta, cyan, red, orange, rainbow, iridescent, holographic rainbow, text, letters other than "1", watermark, logo, signature, frame, sticker border, flat 2D, cel shading, outline drawing, low poly, blurry, noisy, jpeg artifacts, white background, busy background
```
(Image models without a negative field: append `Avoid: …` with the most important 8–10 items: legs, feet, fingers, pink, cyan, text, watermark, scary.)

---

## 3. Still images (text-to-image / image edit)

Structure = **Core + Edition + Pose line + Render style**. Below are the pose lines; swap `CHROME EDITION` ↔ `SHADOW EDITION` as needed.

Midjourney: end with `--ar 1:1 --stylize 250 --oref <hero png url> --ow 120` (omni reference keeps the face).
GPT Image / Nano Banana / Flux Kontext: upload the hero PNG and write "Keep this exact character, change only: …" + pose line.

| Shot | Pose line |
|---|---|
| Hero | `Front view, floating, gentle happy smile, eyes looking at the camera, arms relaxed at the sides.` |
| Laugh | `Laughing with joy: both eyes closed into upward "^ ^" arcs, mouth wide open showing the fangs and tongue, both stub arms raised, tiny pixel hearts (violet and green) popping around the head.` |
| Wave | `Waving hello: the right stub arm raised high and tilted, big smile, slight head tilt, two small white sparkles near the hand.` |
| Wink | `Playful wink: the left (green) eye closed into a curved line, the right glitch eye open, cheeky smile, head tilted.` |
| Hop | `Mid-hop: the body stretched upward a little, arms up, excited open mouth, a burst of voxel pixels falling below, small motion lines.` |
| Spin | `Spinning on the spot: three-quarter view turning away, arms out, motion blur on the voxel trail, sparkles orbiting.` |
| Look around | `Curious: eyes and head turned to the left, looking at something off-screen, small smile.` |
| Duo | `Two Glitchy figures side by side: CHROME EDITION on the left, SHADOW EDITION on the right, turned slightly toward each other, both smiling; the chrome one waves, the shadow one laughs with "^ ^" eyes.` |
| PFP (1:1) | `Close-up portrait of the face filling the frame, big glossy eyes, small fanged smile, the glowing "1" on the forehead at the top edge.` |
| X banner (3:1) | `Wide banner, the mascot small on the right third, lots of dark negative space on the left, faint green grid floor, bokeh.` (`--ar 3:1`) |
| Sticker | `Isolated on a pure transparent/flat black background, no shadow, clean silhouette, sticker-ready.` |

---

## 4. Image-to-video (first frame = our official PNG) — the most reliable path

Settings that work across Kling / Hailuo / Veo / Runway / Higgsfield: 5 s, 16:9 or 9:16, **camera locked** unless stated, motion strength medium, prompt optimizer OFF (Hailuo), "professional" / high quality mode. Keep each prompt about ONE action. Always append: `Same character, same materials and colors, no legs or feet appear, no new limbs, the background stays dark.`

**Wave**
```
The cute ghost mascot raises its small right arm and waves three times toward the camera, its smile grows wider and the eyes squint happily; it keeps floating with a gentle bob while voxel pixels trickle from its tail. Camera locked, studio lighting unchanged.
```
**Laugh**
```
The ghost mascot bursts into a happy laugh: both eyes close into upward arcs, the mouth opens wide, it bounces up and down three times with both little arms raised, and small pixel hearts float up and fade around its head. Camera locked.
```
**Hop**
```
The ghost mascot crouches (squashes slightly), then hops upward with a springy stretch, hangs in the air for a moment with arms up, and lands softly with a small squash; a puff of glowing voxel pixels scatters on landing. Camera locked.
```
**Spin**
```
The ghost mascot does a full 360-degree spin on the spot with its arms out, smiling, its voxel tail swirling around it, then faces the camera again and sparkles twinkle around it. Camera locked.
```
**Wink**
```
The ghost mascot looks at the camera, tilts its head and winks its left eye while the pixel glitch eye stays open, then smiles. Subtle floating motion. Camera locked.
```
**Look around**
```
The ghost mascot floats in place and curiously looks left, then right, then up, then back at the camera with a small smile; only the eyes and a slight head turn move. Camera locked.
```
**Materialize (reveal)**
```
The ghost mascot materializes from the top down: square pixel columns assemble into its body from the head to the tail, glowing green and violet voxels raining down into place, then its eyes light up and it smiles. Slow camera push-in.
```
**Glitch**
```
A brief digital glitch: horizontal slices of the mascot shift sideways for a split second in green and violet, a few voxels burst outward, then it snaps back to normal and smiles. Camera locked.
```
**Duo (first frame = glitchy-duo-hero.png)**
```
The chrome ghost on the left waves at the shadow ghost on the right; the shadow ghost laughs with its eyes closed into arcs; both bounce happily and then turn to the camera together. Pixel hearts float up between them. Camera locked.
```

---

## 5. Text-to-video from scratch (when no reference can be attached)

Prefix every prompt with **Core + Edition + Render style** from Section 1.

**Cinematic reveal (8 s, 9:16)**
```
Dark void. A green terminal line types "incoming signal". A digital glitch flash, then the chrome ghost mascot materializes from the top down out of falling green and violet voxel pixels, floating above a soft green glowing floor. It opens its glossy eyes, looks left and right, then waves at the camera with a big fanged smile. Slow push-in, shallow depth of field, studio softbox reflections on chrome.
```
**Shadow joy loop (6 s, 1:1)**
```
The violet-black shadow ghost mascot floats in a dark studio, laughs with its eyes closed into glowing green arcs, bounces three times, and tiny pixel hearts pop around its head; voxel pixels trickle from its tail onto a green glowing floor. Locked camera, seamless loop.
```
**Duo hype (8 s, 16:9)**
```
Two floating ghost mascots side by side in a dark studio: mirror-chrome on the left, violet-black vinyl on the right. They look at each other, the chrome one winks, the shadow one laughs, then both hop at the same time and spin once, landing in sync and smiling at the camera. Green and violet rim lights, bokeh, slow dolly.
```

---

## 6. Voice, music and SFX prompts

**Voice (ElevenLabs / any TTS, 0.9× speed):** `Small, cheerful, slightly digital character voice; playful and warm, never creepy; light bit-crush on the tail of words.` Spell the name as "Glitch" in scripts so it is pronounced right.

**Music (Suno / Udio):** `Dark synthwave lo-fi, 120 BPM, A minor, warm analog pad, soft kick on every beat, airy closed hats, playful arpeggio, no vocals, clean ending.`

**SFX list:** `digital materialize riser`, `cute giggle blips`, `soft pop`, `springy boing`, `airy whoosh spin`, `bright bell ting (wink)`, `bit-crushed glitch stutter`, `deep sub impact with shimmer (logo)`.

---

## 7. Quality checklist before posting AI output

- No legs/feet/fingers appeared; still exactly two stub arms.
- Left eye round green, right eye pixel glitch (not swapped).
- The "1" is on the forehead and readable; fangs are tiny, not scary.
- Only brand colors; no pink/cyan creeping into rim lights.
- Tail ends in voxel pixels, not a solid point.
- If any of these fail, regenerate from the official PNG instead of editing the bad frame.
