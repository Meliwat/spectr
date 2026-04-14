# SPECTR — 6-SECOND PROMOTIONAL ANIMATION SPEC
### Version 1.0 · 360 frames · 60fps · 1920×1080

> **One-line brief:** A developer sees an app they want to build. Spectr tears it apart.
> The SPECTR wordmark emerges from the destruction — white neon on black — as a promise.

---

## TABLE OF CONTENTS

1. [Creative Brief](#1-creative-brief)
2. [Technical Specifications](#2-technical-specifications)
3. [Scene-by-Scene Breakdown](#3-scene-by-scene-breakdown)
4. [Always-On Layers](#4-always-on-layers)
5. [Component Specifications](#5-component-specifications)
6. [Motion Principles](#6-motion-principles)
7. [Complete Layer Order](#7-complete-layer-order)
8. [Performance Notes](#8-performance-notes)
9. [Implementation Notes](#9-implementation-notes)
10. [Frame-by-Frame Critical Moments](#10-frame-by-frame-critical-moments)

---

## 1. CREATIVE BRIEF

### 1.1 Product Overview

Spectr is a developer tool. You upload an MP4 screen recording of any mobile app — one you admire, want to clone, or use as creative inspiration — and Spectr's pipeline (frame extraction → Claude Vision analysis → spec generation) outputs a `spec.md` that documents every screen, every component, every design token, and every navigation flow with enough precision that a developer with no prior knowledge of the original app could reconstruct it faithfully using Claude Code or any AI coding agent.

The product removes the most painful friction point in building mobile apps from inspiration: the translation layer between "I want something that looks and works like this" and "here is the exact specification a developer can act on."

### 1.2 Target Audience

- **Primary**: Solo developers and small teams building mobile apps with Expo/React Native
- **Secondary**: Product designers who want to communicate UI intent to engineers precisely
- **Tertiary**: Technical founders validating app concepts fast

They are time-constrained, quality-conscious, and already comfortable with AI-assisted development. They have seen a competitor's app, a viral TikTok, or a Dribbble shot and thought: *I want to build something like that.*

### 1.3 Emotional Arc

The animation runs through three emotional states, each corresponding to a visual act:

| Act | Emotion | Color | Duration |
|-----|---------|-------|----------|
| I — Desire | Aspiration, longing, the frustration of seeing beauty you can't replicate | Amber `#f59e0b` | f0–f110 (0s–1.83s) |
| II — Analysis | Tension, precision, the machine doing what humans can't | Cyan `#00e5ff` | f95–f265 (1.58s–4.42s) |
| III — Revelation | Confidence, clarity, power | Violet `#7170ff` + White `#ffffff` | f258–f360 (4.3s–6.0s) |

The emotional transition is not a hard cut — it is an overlap. The scan beam at f95 begins the color shift while the amber warmth of the phone is still present. By f175, amber is gone. By f258, cyan is gone. The outro lives entirely in white neon on black with a violet undertone.

### 1.4 Tone

**Not**: corporate explainer, SaaS demo, product walkthrough.  
**Is**: cinematic, technical, quiet confidence. The aesthetic of medical imaging crossed with military precision crossed with a high-end consumer tech launch. Think WWDC trailer energy with the color restraint of a Linear ad.

No bouncy easing. No cartoon timing. No emoji. No loud color transitions. Every beat is earned.

### 1.5 The Hero Frame

**Frame 340** — 5.667 seconds into the animation.

This is the single most important frame in the composition. At f340:
- All six characters of SPECTR are fully assembled in Orbitron 900 at 168px
- The neon bloom has reached its first peak of intensity (before the breathing animation settles)
- The wordmark occupies the exact vertical and horizontal center of the 1920×1080 canvas
- Six layers of white/blue-white text-shadow produce a photographic bloom effect
- The divider line has begun drawing itself below the wordmark
- The background is pure `#000508` — no competing visual elements

Every prior second of animation exists to make this frame feel earned. The warm phone (desire), the cold scan (tension), the violent collapse (destruction), the dark silence after the flash (anticipation) — all of it is a setup for the moment the wordmark locks into place.

The cinematographer's equivalent: the reveal shot after a long approach.

### 1.6 Color Psychology

#### Amber `#f59e0b` / `rgba(245,158,11,1)`
Amber is the color of warmth, of analog things, of something desirable and slightly out of reach. It reads as "the app you love" — organic, crafted, human. Used exclusively in Act I to establish the emotional state of "seeing something beautiful you can't replicate." It disappears completely during the scan, representing desire being transformed into data.

#### Cyan `#00e5ff` / `rgba(0,229,255,1)`
Cyan is the color of precision instruments — oscilloscopes, MRI scanners, radar displays, circuit board traces. It reads as "the machine." Cold, exact, inhuman in the best sense. Used in Act II to represent Spectr's pipeline analyzing the app. It is not a comfortable color — it creates productive tension. It disappears after the flash, having served its purpose: extraction is complete.

#### Violet `#7170ff` / `rgba(113,112,255,1)` (brand)
Violet is Spectr's brand color. It appears only in Act III — first in the document icon glow, then as the undertone in the wordmark bloom. It represents the product itself: the synthesis of desire and analysis. It is the "answer" color. Its appearance signals that Spectr has taken over — the human emotional experience and the machine's cold analysis have been unified into a deliverable.

#### White `#ffffff`
White is used for the wordmark itself and the flash. In the context of a near-black canvas, white carries maximum visual weight. The wordmark is pure white letterforms — the neon glow is layered on top, not part of the letterforms. This separation is intentional: the letters are precise and clean at their core, with light spilling outward from them.

### 1.7 Reference Aesthetics

- **Medical imaging (MRI/CT scan)**: The scan beam, the wireframe reveal, the clinical cyan palette
- **Military/aerospace HUD**: Corner bracket accents, monospaced readout text, grid overlay
- **Film noir / cinematic darkness**: Heavy vignette, near-black backgrounds, single light source logic
- **Circuit board trace animation**: The SVG stroke-dashoffset drawing technique on the doc icon
- **Neon signage photography**: Long-exposure bloom effect on the wordmark, atmospheric scatter
- **Linear.app / Vercel brand videos**: Restraint, precision, dark background, single accent color
- **Apple product reveals**: Hold duration, the quiet moment before the logo appears

---

## 2. TECHNICAL SPECIFICATIONS

### 2.1 Canvas

| Property | Value |
|----------|-------|
| Width | 1920px |
| Height | 1080px |
| Frame rate | 60fps |
| Total frames | 360 |
| Duration | 6.000 seconds |
| Color space | sRGB |
| Output codec | H.264 (libx264) |
| Output container | MP4 |
| CRF | 18 (near-lossless) |
| Pixel format | yuv420p |
| Render engine | Remotion 4.x |

### 2.2 Cinematic Letterbox

| Property | Value |
|----------|-------|
| Top bar height | 64px |
| Bottom bar height | 64px |
| Visible content area | 1920 × 952px (y: 64–1016) |
| Bar color | `#000508` (exact match to background) |
| Bar z-index | 200 |

The letterbox bars sit above every other layer. Nothing bleeds into them. This is enforced by z-index, not clip.

### 2.3 Timing Constants

All timings specified as [frame, seconds]:

```
GRID_IN_START:        [  0,  0.000 ]
GRID_IN_END:          [ 35,  0.583 ]
PHONE_IN_START:       [  0,  0.000 ]
PHONE_IN_END:         [ 50,  0.833 ]
APP_UI_IN_START:      [ 25,  0.417 ]
APP_UI_IN_END:        [ 70,  1.167 ]
TEXT1_IN_START:       [ 35,  0.583 ]
TEXT1_IN_END:         [ 65,  1.083 ]
TEXT1_OUT_START:      [ 85,  1.417 ]
TEXT1_OUT_END:        [105,  1.750 ]
SCAN_START:           [ 95,  1.583 ]
SCAN_END:             [170,  2.833 ]
LABELS_IN_START:      [160,  2.667 ]
LABELS_IN_END:        [195,  3.250 ]
TEXT2_IN_START:       [140,  2.333 ]
TEXT2_IN_END:         [168,  2.800 ]
TEXT2_OUT_START:      [198,  3.300 ]
TEXT2_OUT_END:        [215,  3.583 ]
COLLAPSE_START:       [215,  3.583 ]
COLLAPSE_END:         [265,  4.417 ]
FLASH_IN_START:       [258,  4.300 ]
FLASH_IN_END:         [264,  4.400 ]
FLASH_OUT_START:      [264,  4.400 ]
FLASH_OUT_END:        [275,  4.583 ]
DOC_DRAW_START:       [268,  4.467 ]
DOC_DRAW_END:         [318,  5.300 ]
VIOLET_BLOOM_START:   [272,  4.533 ]
VIOLET_BLOOM_END:     [318,  5.300 ]
CHARS_START:          [312,  5.200 ]
CHARS_STAGGER:        [  9,  0.150 ]
BLOOM_IN_START:       [355,  5.917 ]
BLOOM_IN_END:         [360,  6.000 ] (end of clip)
DIVIDER_IN_START:     [330,  5.500 ]
DIVIDER_IN_END:       [355,  5.917 ]
TAG_IN_START:         [340,  5.667 ]
TAG_IN_END:           [360,  6.000 ]
URL_IN_START:         [350,  5.833 ]
URL_IN_END:           [360,  6.000 ]
FADE_START:           [348,  5.800 ]
FADE_END:             [360,  6.000 ]
CORNERS_IN_START:     [ 15,  0.250 ]
CORNERS_IN_END:       [ 45,  0.750 ]
CORNERS_OUT_START:    [280,  4.667 ]
CORNERS_OUT_END:      [315,  5.250 ]
```

### 2.4 Font Stack

#### Wordmark
- **Family**: Orbitron
- **Weight**: 900 (Black)
- **Source**: `@remotion/google-fonts/Orbitron`
- **Load call**: `loadFont('normal', { weights: ['900'] })`
- **Size**: 168px
- **Letter spacing**: 0.10em (= 16.8px between character bodies)
- **Line height**: 1.0 (168px)
- **Color**: `#ffffff`
- **Transform**: none (no uppercase transform needed — already caps)
- **Text rendering**: auto (browser default)

#### Readout / Tagline
- **Family**: Share Tech Mono
- **Weight**: 400 (Regular)
- **Source**: `@remotion/google-fonts/ShareTechMono`
- **Load call**: `loadFont('normal', { weights: ['400'] })`
- **Size (readout)**: 13px
- **Size (tagline)**: 20px
- **Letter spacing (readout)**: 0.12em
- **Letter spacing (tagline)**: 0.28em
- **Line height**: 1.0
- **Color (readout)**: `rgba(255, 255, 255, 0.45)`
- **Color (tagline)**: `rgba(255, 255, 255, 0.50)`
- **Transform**: uppercase

### 2.5 Complete Color Palette

```
BACKGROUND:          #000508   rgb(0, 5, 8)
AMBER:               #f59e0b   rgb(245, 158, 11)
AMBER_DIM:           rgba(245, 158, 11, 0.18)
AMBER_GLOW_INNER:    rgba(245, 158, 11, 0.55)
AMBER_GLOW_OUTER:    rgba(245, 158, 11, 0.25)
CYAN:                #00e5ff   rgb(0, 229, 255)
CYAN_BEAM:           rgba(0, 229, 255, 0.85)
CYAN_BAND:           rgba(0, 229, 255, 0.05)
CYAN_TINT:           rgba(0, 229, 255, 0.008)
CYAN_WIRE_STROKE:    rgba(0, 229, 255, 0.35)
CYAN_WIRE_FILL:      rgba(0, 229, 255, 0.02)
CYAN_LABEL_TEXT:     rgba(0, 229, 255, 0.75)
CYAN_LABEL_BORDER:   rgba(0, 229, 255, 0.20)
CYAN_LABEL_BG:       rgba(0, 229, 255, 0.04)
CYAN_CONNECTOR:      rgba(0, 229, 255, 0.35)
CYAN_EDGE_DOT:       rgba(0, 229, 255, 0.90)
CYAN_PARTICLE:       rgba(0, 229, 255, 0.70)
VIOLET:              #7170ff   rgb(113, 112, 255)
VIOLET_DIM:          rgba(113, 112, 255, 0.60)
VIOLET_DOC_STROKE:   rgba(113, 112, 255, 0.60)
VIOLET_DOC_FILL:     rgba(113, 112, 255, 0.06)
VIOLET_DOC_LINE:     rgba(113, 112, 255, 0.50)
WHITE:               #ffffff   rgb(255, 255, 255)
WHITE_PARTICLE:      rgba(255, 255, 255, 0.50)
GRID_LINE:           rgba(255, 255, 255, 0.028)
PHONE_BODY_FILL:     rgba(8, 10, 16, 0.92)
PHONE_BODY_STROKE:   rgba(255, 255, 255, 0.12)
PHONE_WIRE_STROKE:   rgba(0, 229, 255, 0.50)
UI_CARD_GRAD_TOP:    rgba(245, 158, 11, 0.55)
UI_CARD_GRAD_BOT:    rgba(249, 115, 22, 0.25)
UI_TEXT_BRIGHT:      rgba(255, 255, 255, 0.65)
UI_TEXT_MID:         rgba(255, 255, 255, 0.35)
UI_TEXT_DIM:         rgba(255, 255, 255, 0.15)
UI_TEXT_FAINT:       rgba(255, 255, 255, 0.10)
UI_SURFACE:          rgba(255, 255, 255, 0.04)
UI_BORDER:           rgba(255, 255, 255, 0.07)
SUCCESS_GREEN:       #10b981   rgb(16, 185, 129)
SUCCESS_GLOW:        rgba(16, 185, 129, 0.90)
FLASH_WHITE:         #ffffff   rgb(255, 255, 255)
GRAIN_BLEND:         overlay   (mix-blend-mode)
GRAIN_OPACITY:       0.07
VIGNETTE_INNER:      transparent (at 38%)
VIGNETTE_OUTER:      rgba(0, 5, 8, 0.72)
```

### 2.6 Easing Functions

All `spring()` calls use Remotion's spring implementation. All `interpolate()` calls use the default linear easing unless an extrapolation config is specified.

#### Spring Configs by Category

```
// Phone entrance — slow, weighty, cinematic
SPRING_PHONE: { damping: 20, stiffness: 60, mass: 1.2 }

// UI elements inside phone — slightly snappier
SPRING_UI: { damping: 22, stiffness: 80, mass: 0.9 }

// Floating labels — organic, slight overshoot
SPRING_LABELS: { damping: 20, stiffness: 80, mass: 0.9 }

// Doc icon — controlled, intentional
SPRING_DOC: { damping: 18, stiffness: 90, mass: 1.0 }

// Wordmark characters — crisp, confident
SPRING_CHARS: { damping: 24, stiffness: 130, mass: 0.7 }

// URL badge — lively pop
SPRING_URL: { damping: 16, stiffness: 85, mass: 1.0 }

// Collapse particles — driven by interpolate, not spring
```

#### Interpolate Extrapolation

All `interpolate()` calls use:
```js
{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
```
Unless stated otherwise. This prevents values from going below 0 or above 1.

### 2.7 SVG Filter Specifications

#### Phone Glow Filter (`#phone-glow`)
```xml
<filter id="phone-glow" x="-30%" y="-20%" width="160%" height="140%">
  <feGaussianBlur stdDeviation="3" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```
- Applied to: Phone body SVG group
- Effect: Soft halo around phone edges
- colorInterpolationFilters: default (sRGB)

#### Doc Icon Glow Filter (`#doc-glow`)
```xml
<filter id="doc-glow"
  x="-40%" y="-30%" width="180%" height="160%"
  color-interpolation-filters="linearRGB">
  <feGaussianBlur stdDeviation="[4 + violetBloom * 12]" result="b"/>
  <feMerge>
    <feMergeNode in="b"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```
- `stdDeviation` at violetBloom=0: **4px**
- `stdDeviation` at violetBloom=1: **16px**
- `colorInterpolationFilters`: **linearRGB** (critical — produces physically accurate light falloff)
- Applied to: Entire doc icon SVG group

#### Film Grain Filter (`#gr`)
```xml
<filter id="gr">
  <feTurbulence
    type="fractalNoise"
    baseFrequency="0.68"
    numOctaves="4"
    stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
```
- `baseFrequency`: 0.68 (grain size — lower = coarser, higher = finer)
- `numOctaves`: 4 (complexity — more = richer texture)
- `stitchTiles`: stitch (prevents visible tile seams)
- `feColorMatrix saturate 0`: desaturates grain to true gray (no color bleed)
- Applied to: Full 1920×1080 rect
- Mix-blend-mode: overlay
- Opacity: 0.07

---

## 3. SCENE-BY-SCENE BREAKDOWN

### Scene 1 — Desire (f0–f110 · 0.000s–1.833s)

**Narrative intent**: Establish the emotional state. A developer has found an app they love. It's warm, beautiful, alive. They want to build something like it but don't know how.

**Active layers (bottom to top)**:
1. Background `#000508` — full canvas
2. Grid (fading in, opacity 0→0.85)
3. Film grain (always, opacity 0.07, blend overlay)
4. Amber glow bloom (radial gradient behind phone)
5. Phone body (SVG, fading in)
6. Phone warm UI (SVG group, clipped to screen area)
7. Vignette (always)
8. Corner accents (fading in)
9. "You see an app." text (fades in f35–f65)
10. Bars (always, z-index 200)

**Element entry animations**:

| Element | Start | End | Easing | Property |
|---------|-------|-----|--------|----------|
| Grid | f0 | f35 | linear | opacity 0→0.85 |
| Phone body | f0 | f50 | spring PHONE | opacity 0→1, scale implied |
| Amber bloom | f0 | f50 | linear | opacity 0→1 |
| App UI content | f25 | f70 | linear | opacity 0→1 |
| Corner accents | f15 | f45 | linear | opacity 0→1 |
| Text "You see an app." | f35 | f65 | linear | opacity 0→1, translateY 10→0 |

**Element exit animations**:

| Element | Start | End | Property |
|---------|-------|-----|----------|
| Text "You see an app." | f85 | f105 | opacity 1→0 |
| Amber bloom | via collapseProgress | via collapseProgress | opacity driven by collapse |

**Typography — "You see an app."**:
- Family: Share Tech Mono
- Weight: 400
- Size: 13px
- Color: `rgba(255, 255, 255, 0.45)`
- Letter spacing: 0.12em
- Transform: uppercase
- Position: absolute, top 128px (64px bar + 40px offset), left 80px
- Entry: opacity 0→1 over f35–f65, translateY 10px→0px

**Phone dimensions in canvas space**:
- SVG viewBox: `0 0 200 420`
- Scale factor: 1.55×
- Rendered phone width: 310px
- Rendered phone height: 651px
- Center: 960px, 540px
- Phone top in canvas: 540 - 325.5 = 214.5px
- Phone bottom in canvas: 540 + 325.5 = 865.5px

---

### Scene 2 — Analysis (f95–f215 · 1.583s–3.583s)

**Narrative intent**: The scan begins. The machine takes over. The warm, human aesthetic drains away and is replaced by cold precision. Every element of the app is being catalogued.

**Active layers (bottom to top)**:
1. Background
2. Grid (at full opacity 0.85)
3. Film grain
4. Amber bloom (fading as scan progresses)
5. Phone body (warm stroke transitioning to cyan)
6. Phone warm UI (clipped: visible only below beam)
7. Phone wireframe UI (clipped: visible only above beam)
8. Scan beam (y-position driven by interpolate)
9. Floating component labels (appearing after scan passes)
10. Vignette
11. Corner accents (at full opacity)
12. "You want to build it." text (f140–f215)
13. Bars

**Scan beam mechanics**:
- `scanProgress = interpolate(frame, [95, 170], [0, 1])`
- `beamY = interpolate(scanProgress, [0, 1], [64, 1016])`
- Speed: 75 frames to traverse 952px = 12.69px/frame
- At 60fps: 1.25 seconds total sweep duration

**Clip path logic**:
- `below-beam` clipPath: `<rect x="0" y="[clipY + 50]" width="200" height="420"/>` — shows warm UI
- `above-beam` clipPath: `<rect x="0" y="0" width="200" height="[clipY + 50]"/>` — shows wireframe UI
- `clipY` is the scan position mapped to phone's internal coordinate system (0–316 in viewBox units)

**Phone border color transition**:
- Below scan: `rgba(255, 255, 255, 0.12)` (warm, dim white)
- Above scan: `rgba(0, 229, 255, 0.50)` (cold cyan)
- This is a hard switch at the clip boundary, not a gradient

**Floating labels appearance**:
- All 6 labels begin their spring animation starting at f160 (10 frames before SCAN_END)
- Each label has an additional stagger delay (see Component 5.3)
- Labels reach full extension by approximately f200
- They exist in world space (not phone space) — positioned relative to canvas center 960, 540

**"You want to build it." typography**:
- Same spec as "You see an app." (Share Tech Mono 13px, rgba white 0.45)
- Entry: f140–f168, opacity + translateY
- Exit: f198–f215, opacity 1→0

---

### Scene 3 — Extraction (f215–f280 · 3.583s–4.667s)

**Narrative intent**: Violent transformation. The app is destroyed to create the spec. This is the most kinetic moment in the animation — particles scatter, the phone implodes, white light floods the screen.

**Active layers (bottom to top)**:
1. Background
2. Grid (still visible, opacity 0.85)
3. Film grain
4. Collapse particles (56 particles, bursting outward)
5. Phone body (rapidly shrinking to zero via collapseProgress)
6. Flash (white overlay, peaks at f264)
7. Doc icon (begins drawing at f268)
8. Violet bloom glow (builds behind doc icon)
9. Vignette
10. Corner accents (fading out f280–f315)
11. Bars

**Collapse mechanics**:
- `collapseProgress = interpolate(frame, [215, 265], [0, 1])`
- Phone scale: `1.55 * (1 - collapseProgress * 0.98)` → phone shrinks from 1.55× to 0.031×
- Phone opacity: `phoneOpacity * (1 - collapseProgress)` → fades to zero as it shrinks
- Amber bloom: fades when `collapseProgress > 0.4`, fully gone at 1.0

**Flash envelope**:
- Ramp in: f258–f264 (6 frames = 0.1 seconds)
- Peak: f264, opacity 1.0
- Ramp out: f264–f275 (11 frames = 0.183 seconds)
- Color: `#ffffff`
- Z-index: 50 (above all content, below bars)

**Particle system**:
- Count: 56 particles
- Origin: canvas center (960, 540)
- Max radius: `280 * particle.speed`  
- Position formula: `x = 960 + cos(angle) * progress * maxRadius`
- Position formula: `y = 540 + sin(angle) * progress * maxRadius`
- Opacity: `max(0, 1 - progress / particle.life)` where life ∈ [0.5, 1.0]
- Size at t: `particle.size * (1 - progress * 0.5)` (particles shrink as they travel)
- Color: 75% cyan `rgba(0,229,255,0.70)`, 25% white `rgba(255,255,255,0.50)`

---

### Scene 4 — Doc Materialization (f268–f318 · 4.467s–5.300s)

**Narrative intent**: From the destruction comes the deliverable. The spec.md draws itself out of nothing, glowing violet. This is the promise being made visible.

**Active layers**:
1. Background
2. Grid (opacity 0.85, fading to 0 by f318)
3. Film grain
4. Doc icon (center canvas, spring entrance + stroke draw)
5. Violet bloom (radial glow behind/around doc icon)
6. Vignette
7. Bars

**Doc icon dimensions**:
- SVG viewBox: `0 0 180 220`
- Spring scale: spring({ frame: frame - 268, fps, SPRING_DOC }) — drives scale from 0→1
- Canvas position: absolute center, 960×540
- React div wrapper: `display:flex, alignItems:center, justifyContent:center`

**Stroke draw animation**:
- Perimeter constant: `PERIM = 560` (estimated path length for doc body)
- `dashArray = PERIM`
- `dashOffset = interpolate(docProgress, [0, 1], [PERIM, 0])`
- `docProgress = interpolate(frame, [268, 318], [0, 1])`
- Full doc outline visible at f318

**Doc fade-out** (transitions into wordmark):
- `fadeOp = docProgress * fade(frame, [302, 322])`
- Doc is gone by f322 as wordmark appears

---

### Scene 5 — Revelation (f312–f360 · 5.200s–6.000s)

**Narrative intent**: The hero sequence. SPECTR assembles. The wordmark glows. The tagline confirms. This is the answer to every second that preceded it.

**Active layers**:
1. Background
2. Film grain
3. Wordmark (center canvas, character by character)
4. Divider line (below wordmark)
5. Tagline (below divider)
6. URL badge (bottom right)
7. Vignette
8. Bars

**Character assembly order**: S → P → E → C → T → R  
**Character timing**: f312, f321, f330, f339, f348, f357  
**Last character fully in (spring settled)**: approximately f390 (but 6s clip ends at f360)

Note: The animation clips at f360. At that frame, R is at frame 3 of its spring (f357+3=f360), which means it is partially animated. This is intentional — the animation ends mid-assembly on the last character for a sense of momentum, as though Spectr keeps running beyond the ad.

**Wordmark glow bloom build**:
- Begins at f355 (BLOOM_IN_START)
- At f360 (clip end), bloom is at 100% of its maximum value
- The 5-frame build is subtle — the bloom is at ~83% at f355 entry, 100% at f360

**Tagline timing**:
- Entry: f340–f360, opacity 0→1, translateY 18px→0px
- Fully visible at f360

**URL badge timing**:
- Spring entry at f350
- At f360 (clip end), spring at frame 10, approximately 80% of full scale

---

### Scene 6 — Fade (f348–f360 · 5.800s–6.000s)

The global fade is applied as an opacity envelope on the root AbsoluteFill:
- `globalOpacity = fade(frame, [348, 360])`
- At f348: opacity 1.0
- At f360: opacity ~0 (interpolate from 1→0 over 12 frames)

This is a very short fade — 0.2 seconds. It is not a cinematic fade-to-black. It is a clip-end fade, consistent with how the animation would loop or transition in a social media context.

---

## 4. ALWAYS-ON LAYERS

These layers are present in every frame of the animation. They do not have entrance or exit animations (with minor exceptions noted).

### 4.1 Background

```jsx
<AbsoluteFill style={{ background: '#000508' }} />
```

- Color: `#000508` — this is NOT pure black. It is a very dark blue-green-black. Pure black `#000000` is too flat; `#000508` gives a slight depth that reads as "deep space" or "dark water."
- This is always the bottommost layer (z-index effectively 0).
- No gradient, no texture. The depth comes from the grain and vignette layers above it.

### 4.2 Film Grain

```jsx
<svg width={1920} height={1080}
  style={{
    position: 'absolute',
    inset: 0,
    mixBlendMode: 'overlay',
    pointerEvents: 'none',
    opacity: 0.07
  }}>
  <filter id="gr">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.68"
      numOctaves="4"
      stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#gr)" opacity="1"/>
</svg>
```

- `baseFrequency: 0.68` — approximately 1.47px average grain feature size
- `numOctaves: 4` — 4 levels of fractal detail, producing complex texture
- `type: fractalNoise` vs `turbulence`: fractalNoise produces smoother, more film-like grain. `turbulence` produces sharper, more digital noise.
- `stitchTiles: stitch` — prevents visible repetition artifacts at tile boundaries
- `feColorMatrix saturate 0` — removes any color tinting from the noise function
- `mixBlendMode: overlay` — grain brightens bright areas, darkens dark areas, creating the silver-halide film look
- Opacity: 0.07 — subtle enough not to be consciously noticed, present enough to add texture depth

**Important**: Because the grain SVG uses `feTurbulence` which is statically computed (not frame-dependent), the grain does NOT animate. Every frame has identical grain. This is intentional — animated grain (re-computed each frame) would feel like digital noise rather than film grain. Real film grain also does not change between frames at 60fps — it changes between 24fps frames.

### 4.3 Cinematic Letterbox Bars

```jsx
<>
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 64, background: '#000508', zIndex: 200
  }} />
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 64, background: '#000508', zIndex: 200
  }} />
</>
```

- Height: 64px each
- Color: `#000508` (exactly matches background — they are invisible when background shows through but mask content absolutely)
- Z-index: 200 — this MUST be above every content layer
- The bars are not a visual effect — they are a mask. No element should ever be designed to appear in the bar area.
- Effective aspect ratio of content: 1920:952 = 2.016:1 (slightly wider than 2:1)

### 4.4 Vignette

```jsx
<AbsoluteFill style={{
  background: 'radial-gradient(ellipse 105% 90% at 50% 50%, transparent 38%, rgba(0,5,8,0.72) 100%)',
  pointerEvents: 'none',
  zIndex: 10,
}} />
```

- Shape: ellipse, wider than tall (105% horizontal, 90% vertical)
- Center: 50% 50% (canvas center)
- Inner edge: transparent at 38% radius
- Outer edge: `rgba(0,5,8,0.72)` at 100% radius
- The outer color matches the background — the vignette does not go to pure black, it goes to the background color, creating a seamless edge fade
- Opacity at corners: approximately 0.72 (not full black — corners remain subtly dark, not crushed)
- This vignette is on top of all content layers (z-index 10) but below bars (z-index 200)

### 4.5 Corner Bracket Accents

Four L-shaped brackets, one at each corner of the content area (inset from bar edges).

```jsx
// Corner positions (x1,y1 = corner point, extending to x2,y2 for horizontal, x1b,y1b to x2b,y2b for vertical)
const corners = [
  // Top-left
  { hx1:60, hy1:76, hx2:102, hy2:76,  vx1:60, vy1:76, vx2:60,  vy2:118 },
  // Top-right
  { hx1:1860, hy1:76, hx2:1818, hy2:76, vx1:1860, vy1:76, vx2:1860, vy2:118 },
  // Bottom-left
  { hx1:60, hy1:1004, hx2:102, hy2:1004, vx1:60, vy1:1004, vx2:60, vy2:962 },
  // Bottom-right
  { hx1:1860, hy1:1004, hx2:1818, hy2:1004, vx1:1860, vy1:1004, vx2:1860, vy2:962 },
]
```

- L-arm length: 42px
- Stroke width: 1.5px
- Color: `rgba(255, 255, 255, 0.22)` × opacity multiplier
- Opacity animation:
  - Entry: f15–f45, linear, 0→1
  - Hold: f45–f280, opacity 1
  - Exit: f280–f315, linear, 1→0
- z-index: 8 (below vignette, above content)

---

## 5. COMPONENT SPECIFICATIONS

### 5.1 PhoneHero Component

The PhoneHero is the most complex component in the animation. It renders in two visual states simultaneously — warm (the original app) and wireframe (the scanned/analyzed version) — separated by a dynamic clip path that follows the scan beam.

#### 5.1.1 Container

```jsx
<div style={{
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: phoneOpacity * (1 - collapseProgress),
  pointerEvents: 'none',
}} />
```

- PhoneOpacity: `interpolate(frame, [0, 50], [0, 1], clamped)`
- CollapseProgress: `interpolate(frame, [215, 265], [0, 1], clamped)`
- Effective visible range: f0–f265

#### 5.1.2 Amber Bloom

```jsx
<div style={{
  position: 'absolute',
  width: 380,
  height: 580,
  borderRadius: '50%',
  background: `radial-gradient(ellipse 70% 60% at 50% 50%,
    rgba(245,158,11,${0.18 * amberOp}) 0%,
    rgba(245,158,11,${0.06 * amberOp}) 50%,
    transparent 75%)`,
  filter: 'blur(40px)',
  transform: `scale(${phoneScale})`,
}} />
```

- `amberOp = appUIIn * (1 - clamp(interpolate(collapseProgress, [0, 0.4], [0, 1])))`
- `phoneScale = 1.55`
- At collapseProgress=0: amberOp = appUIIn (1.0 when fully loaded)
- At collapseProgress=0.4: amberOp = 0.0 (amber is gone before collapse completes)
- The blur(40px) is a CSS filter on a div, not an SVG filter — intentional, for performance
- Dimensions (380×580) are in pre-scale units; rendered at 1.55× = 589×899px

#### 5.1.3 Phone SVG

```jsx
<svg width={200} height={420} viewBox="0 0 200 420"
  style={{ transform: `scale(${scale})`, overflow: 'visible' }} />
```

- ViewBox: `0 0 200 420`
- Scale: `1.55 * (1 - collapseProgress * 0.98)`
- At collapseProgress=0: scale = 1.55
- At collapseProgress=1: scale = 0.031 (essentially invisible)
- `overflow: visible` allows the glow filter to bleed beyond the SVG bounds

#### 5.1.4 Phone Body Rectangle

```jsx
<rect
  x={5} y={5}
  width={190} height={410}
  rx={26} ry={26}
  fill="rgba(8, 10, 16, 0.92)"
  stroke="rgba(255, 255, 255, 0.12)"
  strokeWidth={1.5}
  filter="url(#phone-glow)"
/>
```

- X, Y: 5, 5 (4px inset from viewBox edge — leaves room for glow)
- Width × Height: 190 × 410
- Border radius: 26px (matches modern smartphone proportions)
- Fill: `rgba(8,10,16,0.92)` — near-opaque very dark blue-black (matching bg but with a tiny amount of transparency for depth)
- Stroke: `rgba(255,255,255,0.12)` — barely visible white edge
- StrokeWidth: 1.5px
- Filter: phone-glow (3px blur)

#### 5.1.5 Screen Inset Rectangle (notch area excluded)

Defined implicitly by the clip paths. The screen area is:
- X: 15, Y: 50
- Width: 170, Height: 316
- No explicit rect — the clip paths define this region

#### 5.1.6 Notch

```jsx
<rect x={72} y={12} width={56} height={8} rx={4}
  fill="rgba(0, 5, 8, 0.95)" />
```

- Position: x=72, y=12 (horizontally centered in 200px viewBox)
- Width: 56px, Height: 8px
- Border radius: 4px (pill shape)
- Fill: nearly opaque background color — masks the phone body behind it to simulate the notch cutout

#### 5.1.7 Warm UI — Status Bar

```jsx
<rect x={15} y={50} width={170} height={10}
  fill="rgba(255,255,255,0.04)" />
<rect x={22} y={54} width={28} height={3} rx={1.5}
  fill="rgba(255,255,255,0.25)" />
<circle cx={172} cy={55} r={3}
  fill="rgba(245,158,11,0.7)" />
```

- Status bar background: full-width, 10px tall, barely visible fill
- Time indicator (left): 22,54 — 28×3px pill, 25% white
- Status dot (right): amber circle, r=3, cx=172 (near right edge)

#### 5.1.8 Warm UI — Hero Card

```jsx
// Gradient card
<rect x={15} y={68} width={170} height={90} rx={8}
  fill="url(#card-grad)"
  stroke="rgba(245,158,11,0.18)"
  strokeWidth={1} />

// Gradient definition:
// linearGradient id="card-grad" x1=0 y1=0 x2=1 y2=1
//   stop 0%  stopColor="#f59e0b" stopOpacity="0.55"
//   stop 100% stopColor="#f97316" stopOpacity="0.25"

// Title text bar
<rect x={25} y={80} width={80} height={7} rx={3.5}
  fill="rgba(255,255,255,0.65)" />

// Subtitle bar
<rect x={25} y={93} width={55} height={5} rx={2.5}
  fill="rgba(255,255,255,0.35)" />

// Body text line 1
<rect x={25} y={105} width={120} height={3} rx={1.5}
  fill="rgba(255,255,255,0.15)" />

// Body text line 2
<rect x={25} y={112} width={95} height={3} rx={1.5}
  fill="rgba(255,255,255,0.10)" />

// CTA button
<rect x={140} y={130} width={32} height={16} rx={8}
  fill="rgba(245,158,11,0.55)"
  stroke="rgba(245,158,11,0.4)"
  strokeWidth={1} />
```

- Card bounds: x=15, y=68, w=170, h=90
- Border radius: 8px
- Border: 1px amber at 18% opacity
- Gradient: amber-to-orange, top-left to bottom-right, 55%→25% opacity

#### 5.1.9 Warm UI — Content Cards (×2)

**Card 1** (left): x=15, y=168, w=80, h=60, rx=6  
**Card 2** (right): x=105, y=168, w=80, h=60, rx=6

Both cards share:
- Fill: `rgba(255,255,255,0.04)`
- Stroke: `rgba(255,255,255,0.07)`, width 1px
- Child elements (title bar, subtitle bar, color dot):

```
Card 1:
  title:    x=23, y=178, w=40, h=5, rx=2.5, fill rgba(255,255,255,0.30)
  subtitle: x=23, y=188, w=55, h=3, rx=1.5, fill rgba(255,255,255,0.15)
  dot:      cx=30, cy=210, r=8, fill rgba(245,158,11,0.20), stroke rgba(245,158,11,0.40) 1px

Card 2:
  title:    x=113, y=178, w=35, h=5, rx=2.5, fill rgba(255,255,255,0.30)
  subtitle: x=113, y=188, w=50, h=3, rx=1.5, fill rgba(255,255,255,0.15)
  dot:      cx=120, cy=210, r=8, fill rgba(113,112,255,0.20), stroke rgba(113,112,255,0.40) 1px
```

Note: Card 2 uses violet for its dot — this is the only place violet appears before Act III, functioning as a subliminal priming element.

#### 5.1.10 Warm UI — List Items (×3)

Three identical list rows, vertically stacked with 26px spacing:

```
Row 0: x=15, y=240, w=170, h=20, rx=4
Row 1: x=15, y=266, w=170, h=20, rx=4
Row 2: x=15, y=292, w=170, h=20, rx=4

Each row:
  fill: rgba(255,255,255,0.03)
  stroke: rgba(255,255,255,0.06), width 1px

  Left dot: cx=28, cy=(row_y+10), r=4
    Row 0 dot fill: rgba(245,158,11,0.35)  [amber — selected item]
    Row 1 dot fill: rgba(255,255,255,0.10) [inactive]
    Row 2 dot fill: rgba(255,255,255,0.10) [inactive]

  Label bar: x=38, y=(row_y+7), h=4, rx=2
    Widths (seeded): Row 0: 60+sr(0)*30, Row 1: 60+sr(5)*30, Row 2: 60+sr(10)*30
    fill: rgba(255,255,255,0.20)
```

`sr(seed)` is the seeded random function: `x = Math.sin(seed+1)*43758.5453; return x - Math.floor(x)`

#### 5.1.11 Warm UI — Bottom Navigation

```jsx
// Nav bar background
<rect x={15} y={340} width={170} height={26} rx={0}
  fill="rgba(0,0,0,0.40)" />

// Separator line
<line x1={15} y1={340} x2={185} y2={340}
  stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

// Four nav icons
// i=0: x=28+0*40=28, active (amber)
// i=1: x=28+1*40=68, inactive
// i=2: x=28+2*40=108, inactive
// i=3: x=28+3*40=148, inactive
<rect x={28+i*40} y={346} width={12} height={10} rx={2}
  fill={i===0 ? "rgba(245,158,11,0.50)" : "rgba(255,255,255,0.15)"} />
```

#### 5.1.12 Warm UI — Home Indicator

```jsx
<rect x={75} y={372} width={50} height={4} rx={2}
  fill="rgba(255,255,255,0.18)" />
```

Centered in 200px viewBox (75 + 50/2 = 100 = center). Standard iOS-style home indicator.

#### 5.1.13 Wireframe State (all elements)

When the scan beam has passed an area, the warm colors are replaced with a wireframe aesthetic. Every element that was colored amber or white becomes a cyan stroke outline with no fill (or near-zero fill).

**Wireframe color mappings**:
```
Warm fill rgba(255,255,255,0.04)  → fill none, stroke rgba(0,229,255,0.30) 0.8px
Warm fill rgba(245,158,11,0.55)   → fill none, stroke rgba(0,229,255,0.35) 0.8px
Warm fill rgba(255,255,255,0.65)  → fill rgba(0,229,255,0.20)
Warm fill rgba(255,255,255,0.25)  → fill rgba(0,229,255,0.12)
All card borders                  → stroke rgba(0,229,255,0.30) 0.8px
Phone border                      → stroke rgba(0,229,255,0.50) 1.5px
Screen background                 → fill rgba(0,229,255,0.02)
```

A faint vertical grid overlay is added to the wireframe screen:
```jsx
{[0,1,2,3].map(i => (
  <line key={i}
    x1={15 + i*42} y1={68}
    x2={15 + i*42} y2={366}
    stroke="rgba(0,229,255,0.06)"
    strokeWidth={0.5} />
))}
```

---

### 5.2 ScanBeam Component

The scan beam is a horizontal band of cyan light that traverses the full canvas height over 75 frames.

#### 5.2.1 Y Position Formula

```js
const scanProgress = clamp(interpolate(frame, [SCAN_START, SCAN_END], [0, 1]))
const beamY = interpolate(scanProgress, [0, 1], [64, 1016])
// f95:  beamY = 64px  (top of content area)
// f170: beamY = 1016px (bottom of content area)
```

Speed: (1016-64)/(170-95) = 952/75 = 12.693px per frame = 761.6px per second

#### 5.2.2 Opacity Envelope

```js
const op = scanProgress < 0.04
  ? scanProgress / 0.04
  : scanProgress > 0.88
    ? (1 - scanProgress) / 0.12
    : 1
```

- Ramps up to full opacity over first 3 frames
- Holds at 1.0 for the middle 63 frames
- Ramps down to 0 over final 9 frames

#### 5.2.3 Visual Elements

```jsx
<svg width={1920} height={1080}
  style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:5 }}>

  {/* Main beam line */}
  <line x1={0} y1={beamY} x2={1920} y2={beamY}
    stroke="#00e5ff"
    strokeWidth={1.5}
    opacity={0.85 * op} />

  {/* Soft glow band — 100px tall centered on beam */}
  <rect x={0} y={beamY - 50} width={1920} height={100}
    fill={`rgba(0,229,255,${0.05 * op})`} />

  {/* Revealed area tint — everything above beam gets slight cyan wash */}
  <rect x={0} y={64} width={1920} height={beamY - 64}
    fill={`rgba(0,229,255,${0.008 * op})`} />

  {/* Left edge dot */}
  <circle cx={6} cy={beamY} r={3}
    fill="#00e5ff"
    opacity={0.9 * op} />

  {/* Right edge dot */}
  <circle cx={1914} cy={beamY} r={3}
    fill="#00e5ff"
    opacity={0.9 * op} />
</svg>
```

- Beam line: 1.5px stroke, 85% of envelope opacity
- Glow band: 100px tall, 5% fill opacity
- Area tint: fills from bar to beam, 0.8% fill opacity (barely perceptible — creates a very subtle "scanned" look)
- Edge dots: 6px diameter (r=3), at horizontal extremes of beam

---

### 5.3 FloatingLabels Component

Six component labels float outward from the phone center as the scan completes, suggesting that Spectr has extracted and catalogued every aspect of the app.

#### 5.3.1 Label Data

```js
const LABEL_DATA = [
  { text: 'NAVIGATION',    dx: -340, dy: -140, delay:  0 },
  { text: 'TYPOGRAPHY',    dx:  280, dy:  -80, delay:  6 },
  { text: 'COLOR SYSTEM',  dx: -310, dy:   60, delay: 11 },
  { text: 'COMPONENTS',    dx:  260, dy:  130, delay: 16 },
  { text: 'DESIGN TOKENS', dx: -280, dy:  180, delay: 20 },
  { text: 'SCREENS · 12',  dx:  230, dy: -160, delay:  3 },
]
```

- `dx`, `dy`: target offset in pixels from canvas center (960, 540) at full spring extension
- `delay`: additional frame delay applied to spring start
- Labels on the left (dx < 0): NAVIGATION, COLOR SYSTEM, DESIGN TOKENS
- Labels on the right (dx > 0): TYPOGRAPHY, COMPONENTS, SCREENS · 12

#### 5.3.2 Label Position Formula

```js
const labelLocalFrame = frame - LABELS_IN_START - label.delay
const sp = spring({
  frame: labelLocalFrame,
  fps: 60,
  config: { damping: 20, stiffness: 80, mass: 0.9 }
})
const tx = 960 + label.dx * sp   // interpolated from center outward
const ty = 540 + label.dy * sp   // interpolated from center outward
```

At `sp=0`: all labels at canvas center (960, 540)  
At `sp=1`: labels at their target positions  
Spring settles at approximately f195+delay for each label

#### 5.3.3 Fade Envelope

```js
const fadeOp = ramp(frame, LABELS_IN_START, LABELS_IN_END)
             * fade(frame, COLLAPSE_START, COLLAPSE_END)
```

Labels fade in as they spring out (f160–f195) and fade out as the collapse begins (f215–f265).

#### 5.3.4 Label Visual Spec

```jsx
<div style={{
  position: 'absolute',
  left: tx,
  top: ty,
  transform: 'translate(-50%, -50%)',
  opacity: sp * fadeOp,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}}>
  {/* Connector stub */}
  <div style={{
    width: 24,
    height: 1,
    background: 'rgba(0,229,255,0.35)',
  }} />

  {/* Label box */}
  <div style={{
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(0,229,255,0.75)',
    letterSpacing: '0.10em',
    whiteSpace: 'nowrap',
    padding: '3px 8px',
    border: '1px solid rgba(0,229,255,0.20)',
    borderRadius: 2,
    background: 'rgba(0,229,255,0.04)',
  }} />
</div>
```

- Connector stub: 24×1px, cyan 35% opacity
- Label box padding: 3px top/bottom, 8px left/right
- Border radius: 2px (almost square — technical, not rounded-modern)
- The entire label element is centered at (tx, ty) via `translate(-50%, -50%)`

---

### 5.4 CollapseParticles Component

56 particles burst outward from canvas center during the phone collapse, representing the app data being scattered and then collected by Spectr.

#### 5.4.1 Seeded Random Function

```js
const sr = (seed: number): number => {
  const x = Math.sin(seed + 1) * 43758.5453
  return x - Math.floor(x)
}
```

This produces a deterministic pseudo-random value in [0, 1) for any integer seed. Because it uses `Math.sin` with a large multiplier, the fractional part appears uniformly distributed. This is computed at module scope for all 56 particles — never inside the render function.

#### 5.4.2 Pre-baked Particle Data

```js
const PARTICLES = Array.from({ length: 56 }, (_, i) => ({
  angle:  sr(i * 3)  * Math.PI * 2,  // direction: 0–2π radians
  speed:  0.35 + sr(i * 7)  * 0.65,  // radius multiplier: 0.35–1.00
  size:   1.2  + sr(i * 11) * 3.2,   // radius in px: 1.2–4.4
  life:   0.5  + sr(i * 13) * 0.5,   // fade-out point: 50%–100% of collapse
  isCyan: sr(i * 17) > 0.25,         // 75% cyan, 25% white
}))
```

- 56 particles provides dense coverage without performance issues
- Speed range [0.35, 1.00] ensures some particles stay near center, others travel far
- Size range [1.2, 4.4]px provides visual variety
- Life range [0.5, 1.0] means some particles fade out before collapse completes, others last until the end
- 75% cyan, 25% white: reflects the cyan-dominant scene palette

#### 5.4.3 Per-Frame Position Formula

```js
const collapseLocalFrame = frame - COLLAPSE_START
const progress = clamp(collapseLocalFrame / (COLLAPSE_END - COLLAPSE_START))
// progress: 0 at f215, 1 at f265

const maxRadius = 280 * particle.speed  // 98px–280px
const r = progress * maxRadius

const x = 960 + Math.cos(particle.angle) * r
const y = 540 + Math.sin(particle.angle) * r
```

#### 5.4.4 Per-Frame Opacity Formula

```js
const pOpacity = Math.max(0, 1 - progress / particle.life)
```

- If `particle.life = 0.5`: particle is fully faded at progress=0.5 (f240)
- If `particle.life = 1.0`: particle is fully faded at progress=1.0 (f265)

#### 5.4.5 Per-Frame Size Formula

```js
const pRadius = particle.size * (1 - progress * 0.5)
```

Particles shrink to 50% of their original size over the collapse duration, as they would if they were consuming energy to travel.

#### 5.4.6 Render

```jsx
<svg width={1920} height={1080}
  style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
  {PARTICLES.map(({ angle, speed, size, life, isCyan }, i) => {
    const maxR = 280 * speed
    const r = progress * maxR
    const pOp = Math.max(0, 1 - progress / life)
    const x = 960 + Math.cos(angle) * r
    const y = 540 + Math.sin(angle) * r
    const col = isCyan
      ? `rgba(0,229,255,${pOp * 0.7})`
      : `rgba(255,255,255,${pOp * 0.5})`
    return (
      <circle key={i}
        cx={x} cy={y}
        r={size * (1 - progress * 0.5)}
        fill={col} />
    )
  })}
</svg>
```

---

### 5.5 Flash Component

The flash is a single full-canvas white overlay that peaks at f264.

```jsx
const flashRampIn  = clamp(interpolate(frame, [258, 264], [0, 1]))
const flashRampOut = clamp(interpolate(frame, [264, 275], [1, 0]))
const flashOp = Math.min(flashRampIn, flashRampOut)

if (flashOp <= 0) return null
return (
  <AbsoluteFill style={{
    background: '#ffffff',
    opacity: flashOp,
    zIndex: 50,
  }} />
)
```

- Ramp in: 6 frames (0.1 seconds) — fast enough to feel like a flash, not a fade
- Hold: 0 frames (it's a triangular envelope — instant peak)
- Ramp out: 11 frames (0.183 seconds) — slightly slower ramp out for afterimage feel
- Color: pure `#ffffff`
- Z-index: 50 — above particles, phone, and doc (which begins drawing at f268), below bars

---

### 5.6 DocIcon Component

The spec.md document icon draws itself from nothing, appearing to be generated live as Spectr writes the file.

#### 5.6.1 Spring Entrance

```js
const docSpring = spring({
  frame: frame - DOC_DRAW_START,  // local frame from f268
  fps: 60,
  config: { damping: 18, stiffness: 90, mass: 1.0 }
})
```

- At f268: spring=0 (invisible)
- At f278: spring≈0.78 (80% to final scale)
- At f285: spring≈0.97 (nearly settled)
- At f298+: spring=1.0 (fully settled)

The spring drives the scale of the entire doc icon container via the opacity×spring formula.

#### 5.6.2 Draw Progress

```js
const docProgress = clamp(interpolate(frame, [DOC_DRAW_START, DOC_DRAW_END], [0, 1]))
// f268: 0.0
// f293: 0.5
// f318: 1.0
```

#### 5.6.3 Stroke Draw Animation

```js
const PERIM = 560  // estimated perimeter of doc path in viewBox units
const dashOffset = interpolate(docProgress, [0, 1], [PERIM, 0])
```

The path definition for the document body:
```
M 10,0 H 130 L 180,50 V 220 H 10 Z
```

- Total path: top-left → top-right (stopping before corner fold) → fold point → bottom-right → bottom-left → back to top-left
- Perimeter estimate breakdown:
  - `M 10,0 H 130`: 120 units (horizontal top)
  - `L 180,50`: 78.1 units (diagonal fold line)
  - `V 220`: 170 units (right edge)
  - `H 10`: 170 units (bottom edge)
  - `V 0`: 220 units (left edge — closed)
  - Estimated total: ~758 units, but PERIM=560 is used as the practical draw length

The path draws from the starting point clockwise. The corner fold line appears first (as part of the top-right corner), then the rest of the rectangle.

#### 5.6.4 Corner Fold

```jsx
<path d="M 130,0 L 130,50 L 180,50"
  fill="none"
  stroke="rgba(113,112,255,0.40)"
  strokeWidth={1.5}
  opacity={docProgress > 0.25 ? 1 : 0} />
```

- Appears at docProgress=0.25 (approximately f280)
- Two lines: vertical from (130,0) to (130,50), horizontal from (130,50) to (180,50)
- This creates the "folded corner" effect of a classic document icon

#### 5.6.5 Text Line Rects (×6)

Six horizontal bars appear sequentially inside the document, simulating spec content being written:

```
Line appearance timing (docProgress threshold):
  Line 0: threshold 0.30, y=72
  Line 1: threshold 0.42, y=94
  Line 2: threshold 0.54, y=116
  Line 3: threshold 0.62, y=138
  Line 4: threshold 0.70, y=160
  Line 5: threshold 0.78, y=182

Each line: x=24, height=3.5px, rx=1.75
Widths: [100, 130, 80, 120, 95, 110] (varied for realism)

Line opacity formula:
  lineOp = clamp(interpolate(docProgress, [threshold, threshold+0.12], [0, 1]))

Line fill:
  rgba(113,112,255, 0.50*lineOp + violetBloom*0.30)
```

As `violetBloom` increases, the lines become brighter, suggesting the document content is "energizing."

#### 5.6.6 Violet Bloom Filter

```js
const violetBloom = clamp(interpolate(frame, [VIOLET_BLOOM_START, VIOLET_BLOOM_END], [0, 1]))
// f272: 0.0
// f295: 0.5
// f318: 1.0
```

The SVG filter stdDeviation is animated:
```
stdDeviation = 4 + violetBloom * 12
// f272: stdDeviation = 4px
// f318: stdDeviation = 16px
```

This means the glow grows from a tight 4px halo to a wide 16px bloom as the document completes drawing.

#### 5.6.7 Doc Fade Out

```js
const docFadeOp = docProgress * clamp(interpolate(frame, [CHARS_START - 10, CHARS_START + 20], [1, 0]))
```

Doc fades as the wordmark appears:
- At f302: doc still at full opacity
- At f312: doc begins fading (CHARS_START)
- At f332: doc fully faded

---

### 5.7 Wordmark Component

The SPECTR wordmark is the emotional climax of the animation. It must be executed with precision.

#### 5.7.1 Character Configuration

| Index | Character | Start Frame | Spring Settled (~) |
|-------|-----------|-------------|---------------------|
| 0 | S | f312 | f330 |
| 1 | P | f321 | f339 |
| 2 | E | f330 | f348 |
| 3 | C | f339 | f357 |
| 4 | T | f348 | f360 (clipped) |
| 5 | R | f357 | f375 (after clip) |

#### 5.7.2 Per-Character Spring

```js
const charLocalFrame = frame - CHARS_START - (charIndex * CHARS_STAGGER)
const sp = spring({
  frame: charLocalFrame,
  fps: 60,
  config: { damping: 24, stiffness: 130, mass: 0.7 }
})
```

Spring config rationale:
- `damping: 24` — slightly overdamped. Characters do NOT bounce. They arrive firmly.
- `stiffness: 130` — fast spring, characters materialize quickly (~18 frames to settle)
- `mass: 0.7` — light, responsive. The characters feel like they have no inertia to overcome.

#### 5.7.3 Glitch Effect

```js
const GLITCH_WINDOW = 14  // frames

const inGlitch = charLocalFrame > 0 && charLocalFrame < GLITCH_WINDOW

const glitchX = inGlitch
  ? interpolate(charLocalFrame, [0, GLITCH_WINDOW], [10, 0])
    * (Math.sin(charLocalFrame * 8.7) > 0 ? 1 : -1)
  : 0

const glitchOpacity = inGlitch
  ? 0.4 + 0.6 * Math.abs(Math.sin(charLocalFrame * 11.3))
  : sp  // after glitch window, opacity = spring value
```

- Glitch X offset: starts at 10px, decays to 0 over 14 frames, direction flips every ~0.36 frames (high frequency)
- Glitch opacity: flickers between 0.4 and 1.0 at a slightly different frequency than X, creating an asynchronous interference pattern
- After 14 frames: character is at spring value (approaching 1.0), no more glitch

The combined effect: each character appears as if materializing from digital static — position jittering, opacity flickering — before locking into its final position with the confidence of a system completing a task.

#### 5.7.4 Character Layout

```jsx
<div style={{
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: 0,
}}>
  {CHARS.map((ch, i) => (
    <span style={{
      fontFamily: DISPLAY,       // Orbitron
      fontWeight: 900,
      fontSize: 168,             // px
      letterSpacing: '0.10em',  // = 16.8px
      color: '#ffffff',
      lineHeight: 1,
      display: 'inline-block',
      opacity: charGlitchOpacity[i],
      transform: `translateX(${glitchX[i]}px) translateY(${interpolate(sp[i],[0,1],[36,0])}px)`,
      textShadow: neonShadow,
    }}>
      {ch}
    </span>
  ))}
</div>
```

- Characters enter from 36px below their final position (`translateY: 36→0`)
- This Y movement is driven by the spring value, creating a smooth lift-in that decelerates naturally
- Letter spacing adds 16.8px between each character, producing the wide, authoritative wordmark spacing

#### 5.7.5 Total Wordmark Width

- 6 characters × (character width + letterSpacing)
- Orbitron 900 at 168px: approximate character width ~120px each
- Total: 6 × (120 + 16.8) ≈ 821px
- Plus trailing letterSpacing on last char: ~837px total
- Center at 960px, extends from ~541px to ~879px horizontally

#### 5.7.6 Neon Glow — Six Layer Shadow

```js
const bloomProgress = ramp(frame, BLOOM_IN_START, BLOOM_IN_END)
// f355: 0.0
// f360: 1.0

// Breathing frequency (for use after bloom settles, but clip ends at f360)
const breathe = Math.sin((frame - BLOOM_IN_END) * 0.035) * 0.5 + 0.5
// At f360: breathe = 0 (not yet oscillating)

// Blur radii at peak (bloomProgress=1, breathe=0)
// Layer 1: tight core
r1 = 3  + breathe * 3   // f360: 3px
// Layer 2: inner glow
r2 = 8  + breathe * 5   // f360: 8px
// Layer 3: mid glow
r3 = 18 + breathe * 10  // f360: 18px
// Layer 4: outer glow
r4 = 40 + breathe * 20  // f360: 40px
// Layer 5: wide bloom (slight color shift)
r5 = 80 + breathe * 35  // f360: 80px
// Layer 6: atmospheric haze
r6 = 140+ breathe * 50  // f360: 140px

const neonShadow = [
  `0 0 ${r1}px rgba(255,255,255,${0.95 * bloomProgress})`,
  `0 0 ${r2}px rgba(255,255,255,${0.80 * bloomProgress})`,
  `0 0 ${r3}px rgba(255,255,255,${0.55 * bloomProgress})`,
  `0 0 ${r4}px rgba(255,255,255,${0.30 * bloomProgress})`,
  `0 0 ${r5}px rgba(200,210,255,${0.18 * bloomProgress})`,
  `0 0 ${r6}px rgba(160,175,255,${0.10 * bloomProgress})`,
].join(', ')
```

**Layer breakdown at f360 (bloomProgress=1)**:
| Layer | Blur Radius | Color | Opacity | Function |
|-------|-------------|-------|---------|----------|
| 1 | 3px | White | 0.95 | Bright core — the "hot" center of the neon tube |
| 2 | 8px | White | 0.80 | Inner glow — primary emission |
| 3 | 18px | White | 0.55 | Mid glow — primary bloom |
| 4 | 40px | White | 0.30 | Outer glow — bloom spreading into air |
| 5 | 80px | `rgba(200,210,255)` | 0.18 | Wide bloom — color shift toward cool blue |
| 6 | 140px | `rgba(160,175,255)` | 0.10 | Atmospheric scatter — barely perceptible haze |

The color shift in layers 5–6 (white → cool blue) simulates the way neon light scatters through atmospheric moisture — the color temperature of the scattered light drops at distance from the source.

---

### 5.8 Divider Component

```jsx
<div style={{
  width: 420 * progress,   // animates from 0→420px
  height: 1,
  margin: '22px auto 0',  // 22px below wordmark baseline, centered
  opacity: progress,
  background: `linear-gradient(90deg,
    transparent,
    rgba(113,112,255,0.60) 20%,
    rgba(255,255,255,0.35) 50%,
    rgba(113,112,255,0.60) 80%,
    transparent)`,
}} />
```

- `progress = ramp(frame, DIVIDER_IN_START, DIVIDER_IN_END)` = ramp(frame, 330, 355)
- At f330: width=0px, opacity=0
- At f355: width=420px, opacity=1
- Draw speed: 420px over 25 frames = 16.8px/frame
- The gradient creates a soft glow effect centered on the midpoint of the line
- The line appears to "draw itself" from center outward because the gradient makes the edges fade to transparent while the growing width reveals them

---

### 5.9 Tagline Component

```jsx
const taglineOp = ramp(frame, TAG_IN_START, TAG_IN_END)  // f340–f360
const taglineY = interpolate(taglineOp, [0, 1], [18, 0])  // 18px→0px

<div style={{
  marginTop: 28,
  fontFamily: MONO,
  fontSize: 20,
  letterSpacing: '0.28em',
  color: 'rgba(255,255,255,0.50)',
  textTransform: 'uppercase',
  opacity: taglineOp,
  transform: `translateY(${taglineY}px)`,
  textAlign: 'center',
}}>
  See an app.&nbsp;&nbsp;&nbsp;Ship an app.
</div>
```

- Font: Share Tech Mono, 400, 20px
- Letter spacing: 0.28em — very wide, creates a measured, deliberate cadence
- Color: 50% white — tagline is intentionally subdued, not competing with the wordmark
- Entry: opacity + lift (18px → 0px) over f340–f360
- Three non-breaking spaces between the two sentences (`&nbsp;&nbsp;&nbsp;`) creates a visual pause mid-tagline, as if you're reading two separate thoughts

---

### 5.10 URLBadge Component

```jsx
const urlSpring = spring({ frame: frame - URL_IN_START, fps: 60,
  config: { damping: 16, stiffness: 85, mass: 1.0 }})
const urlOp = ramp(frame, URL_IN_START, URL_IN_END)  // f350–f360

<div style={{
  position: 'absolute',
  bottom: 88,    // 64px bar + 24px padding
  right: 100,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  opacity: urlOp * urlSpring,
  transform: `scale(${urlSpring})`,
  transformOrigin: 'bottom right',
}}>
  {/* Status dot */}
  <div style={{
    width: 8, height: 8, borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 10px rgba(16,185,129,0.90), 0 0 20px rgba(16,185,129,0.40)',
  }} />

  {/* URL text */}
  <div style={{
    fontFamily: MONO,
    fontSize: 17,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.18em',
  }}>
    spectr.to
  </div>
</div>
```

- Position: bottom-right corner, 88px from bottom (to clear bar), 100px from right
- Spring config: damping=16 (slight underdamp → tiny bounce), stiffness=85, mass=1.0
- The slight bounce on the URL badge provides a moment of levity and life at the end
- Green dot: 8×8px, `#10b981`, with double box-shadow (9px + 20px) for neon pulse
- URL text: Share Tech Mono, 17px, 45% white, 0.18em letter-spacing
- `transformOrigin: 'bottom right'` — badge scales from its anchor corner, not from center

---

## 6. MOTION PRINCIPLES

### 6.1 Why Spring Over Linear

Linear interpolation produces "mechanical" motion — the velocity is constant throughout, which means there's an abrupt start and an abrupt stop. Nothing in the physical world starts or stops instantaneously. Even the fastest physical processes (explosions, electrical discharges) have acceleration curves.

Spring animations mimic the behavior of physical springs: objects accelerate into their motion and decelerate as they approach their target. The three parameters control everything:

- **Stiffness**: How hard the spring pulls toward the target. Higher stiffness = faster motion, sharper acceleration.
- **Damping**: How much energy the system loses per oscillation. Under-damped springs overshoot and oscillate. Critically-damped springs reach the target without overshoot. Over-damped springs approach the target asymptotically.
- **Mass**: The inertia of the object. Higher mass = slower start, slower stop, more "weight."

### 6.2 Damping Rationale by Component

| Component | Damping | Rationale |
|-----------|---------|-----------|
| Phone entrance | 20 | Slight underdamp — phone settles with imperceptible wobble, feels physical |
| UI elements | 22 | Slightly more damped — UI items are lighter, settle faster |
| Floating labels | 20 | Slight underdamp — they feel like they're drifting and settling, not slamming |
| Doc icon | 18 | More underdamp — it pops into existence with energy |
| Wordmark chars | 24 | Nearly critical — characters arrive FIRMLY, no wavering |
| URL badge | 16 | Most underdamp — the playful final beat of the animation |

### 6.3 The Musical Beat Structure

The 6-second animation has an implied 4/4 time signature at approximately 80 BPM:
```
Beat 1: f0   (0.000s) — Animation begins, phone materializes
Beat 2: f45  (0.750s) — Grid and corners fully in, scene established
Beat 3: f90  (1.500s) — Scan begins (near f95)
Beat 4: f135 (2.250s) — Scan halfway through
Bar 2:
Beat 5: f180 (3.000s) — Scan complete, labels floating
Beat 6: f225 (3.750s) — Collapse begins
Beat 7: f270 (4.500s) — Flash complete, doc drawing
Beat 8: f315 (5.250s) — First character (S) appears at f312
Resolution:
f340 (5.667s) — Hero frame, C appears, bloom visible
f360 (6.000s) — Clip end
```

Every major transition lands close to a musical beat. This is not coincidental — the timing constants were tuned to create a composition that "breathes" rhythmically even without audio.

When paired with audio, the scan start at f95 should correspond to a musical hit or drum onset, and the wordmark assembly at f312 should correspond to a drop or hook.

### 6.4 Easing Emotional Meaning

- **Fast in, slow out** (high stiffness, high damping): Urgency, precision, authority. Used for wordmark characters — they arrive with purpose.
- **Slow in, fast out** (low stiffness): Not used. Would read as weak or uncertain.
- **Overshoot (low damping)**: Playfulness, surprise, life. Used sparingly for the URL badge — the one moment of warmth in the outro.
- **Linear** (grid, text overlays): Neutral, background. Used for elements that should not draw attention to themselves entering.

---

## 7. COMPLETE LAYER ORDER

From bottom (z-index 0) to top (z-index 200):

| Z-Index | Layer | Component | Always On | Notes |
|---------|-------|-----------|-----------|-------|
| 0 | Background | `<AbsoluteFill>` | Yes | `#000508` |
| 1 | Grid | Grid SVG | Yes (fades in) | 20×12 grid, opacity 0→0.85 |
| 2 | Amber bloom | Div + radial gradient | Phase 1–2 only | Behind phone, blur(40px) |
| 3 | Collapse particles | SVG circles | Phase 3 only | 56 particles |
| 4 | Phone body | SVG rect | Phase 1–3 | Includes all UI content |
| 5 | Scan beam | SVG line + rect | Phase 2 only | z-index:5 explicitly |
| 6 | Floating labels | Div system | Phase 2–3 | Absolute positioned |
| 7 | Doc icon | SVG group | Phase 4 | Center canvas |
| 8 | Corner accents | SVG lines | Phase 1–4 | Fades in/out |
| 9 | Wordmark container | Flex div | Phase 5 | Center, stacked |
| 10 | Vignette | `<AbsoluteFill>` radial | Always | Overlay on content |
| 50 | Flash | `<AbsoluteFill>` white | Phase 3 only | Peak at f264 |
| 200 | Letterbox bars | Divs | Always | Hard mask |

Note: The grain SVG uses `mixBlendMode: overlay` — its visual layer is effectively between layers 1 and 2 but it blends multiplicatively with whatever is below it. Its z-index position is irrelevant to its visual blending behavior.

---

## 8. PERFORMANCE NOTES

### 8.1 Pre-baked Module-Scope Data

All particle data (`PARTICLES` array) and label data (`LABEL_DATA` array) are computed once at module initialization, not inside any React component. In Remotion, every frame re-renders every component — any computation inside a component body executes 360 times. Complex seeded-random calculations at 56 iterations × 360 frames = 20,160 executions if inside the component. At module scope: 56 executions total.

Similarly, the seeded random function `sr()` is defined once at module scope.

### 8.2 Why No Canvas in This Composition

Canvas was considered for the particle system and the phone wireframe transition effect. Both were implemented in SVG instead, for the following reasons:

1. **Remotion frame accuracy**: SVG is rendered synchronously by React's DOM reconciler. Canvas `drawImage` operations are asynchronous and can produce inconsistent frame timing in Remotion's headless Puppeteer renderer. SVG elements are guaranteed to be correct at the moment Remotion captures the frame.

2. **Animation state**: SVG element positions and opacities are driven by React state (frame number), making them deterministic. Canvas requires imperative draw calls in `useEffect` — correctly timed `useEffect` + canvas in Remotion requires `delayRender`/`continueRender` patterns, adding complexity.

3. **This composition's complexity level**: 56 particles as SVG `<circle>` elements is well within browser performance limits for rendering. Canvas would be necessary at 500+ particles.

### 8.3 When to Use Canvas

Canvas (with `delayRender`/`continueRender`) is appropriate for:
- Particle counts above 300–500
- Per-pixel effects (blur, chromatic aberration, pixel sorting)
- Real-time audio waveform visualization
- Raymarched or shader-style effects
- Text-to-path conversions at runtime (using opentype.js)

### 8.4 SVG Filter Containment

All SVG filters use explicit `x`, `y`, `width`, `height` attributes on the `<filter>` element to define the filter region. Defaulting to the element's bounding box can clip glow effects that extend beyond element boundaries.

Pattern:
```xml
<filter id="glow" x="-40%" y="-30%" width="180%" height="160%">
```

Without these attributes, a glow that extends 50px beyond a 200px element would be clipped to the element bounds and invisible.

The `color-interpolation-filters="linearRGB"` attribute on the doc-glow filter is critical. Without it, blur operations use sRGB color math, which produces a "dirty" falloff in the midtones. LinearRGB produces clean, photographic bloom.

---

## 9. IMPLEMENTATION NOTES

### 9.1 Render Command

```bash
cd /path/to/promo
npx remotion render src/index.tsx SpectrePromo out/spectr-promo.mp4 \
  --codec=h264 \
  --crf=18 \
  --pixel-format=yuv420p \
  --frames=0-359
```

- `--crf=18`: Near-lossless quality. For final delivery increase to 23 for smaller file size.
- `--pixel-format=yuv420p`: Required for broad compatibility (QuickTime, social platforms)
- `--frames=0-359`: Explicit range prevents off-by-one errors (360 frames = 0–359)

### 9.2 Extending to 8 or 10 Seconds

To extend the animation without rebuilding it:

1. Update composition `durationInFrames` to 480 (8s) or 600 (10s)
2. Shift `FADE_START` and `FADE_END` constants to the new end frame range
3. The wordmark breathing animation (`Math.sin((frame - BLOOM_IN_END) * 0.035)`) will naturally extend — more breathing cycles become visible
4. Add a `<URLBadge>` hold section between current URL_IN_END and FADE_START
5. Consider adding a second CTA line below spectr.to (e.g., pricing, "Free for founding members")

### 9.3 Audio Synchronization

The composition has five "hit points" that should align to musical events:

| Frame | Time | Event | Recommended Audio |
|-------|------|-------|-------------------|
| f0 | 0.000s | Animation starts | Low ambient hum begins |
| f95 | 1.583s | Scan beam starts | Percussion hit or riser |
| f215 | 3.583s | Collapse begins | Tension swell |
| f264 | 4.400s | Flash peak | Cymbal crash or transient hit |
| f312 | 5.200s | First character | Drop / bass hit |
| f340 | 5.667s | Hero frame | Reverb tail / chord |

To add audio in Remotion:
```jsx
import { Audio } from 'remotion'
// Inside composition:
<Audio src={staticFile('audio/spectr-promo.wav')} startFrom={0} />
```

### 9.4 Using Real App Screenshots

The phone's warm UI (SVG-drawn rectangles) can be replaced with real app screenshots. To do so:

1. Add the screenshot PNG to `promo/public/screenshots/`
2. Replace the warm UI `<g>` group inside the phone SVG with:
```jsx
<image
  href={staticFile('screenshots/app-screen.png')}
  x={15} y={50}
  width={170} height={316}
  clipPath="url(#screen-clip)"
  preserveAspectRatio="xMidYMid slice"
/>
```
3. Define `<clipPath id="screen-clip"><rect x={15} y={50} width={170} height={316}/></clipPath>`
4. Add `delayRender`/`continueRender` to wait for the image to load before Remotion captures the frame

### 9.5 Exporting as GIF or WebM

For web use (no audio needed):
```bash
# WebM (smaller, good quality)
npx remotion render src/index.tsx SpectrePromo out/spectr-promo.webm --codec=vp8

# GIF (largest, universally compatible, no audio)
npx remotion render src/index.tsx SpectrePromo out/spectr-promo.gif --codec=gif --every-nth-frame=2
```

`--every-nth-frame=2` renders every other frame, halving file size with minimal quality loss for GIF.

---

## 10. FRAME-BY-FRAME CRITICAL MOMENTS

The following 24 frames are the key states of the animation. An engineer implementing this from scratch should be able to reconstruct the animation from these alone.

---

### f0 — 0.000s — Black Silence

**State**: Pure background only. Everything is at opacity 0 except the background color.

```
Background:           #000508, full canvas
Grid:                 opacity 0 (GRID_IN not started)
Phone:                opacity 0
Amber bloom:          opacity 0
Corners:              opacity 0
All text:             opacity 0
Bars:                 visible (always on), color #000508 (invisible against bg)
Grain:                visible, opacity 0.07, blend overlay
Vignette:             visible, no visible effect (no content beneath)
```

Canvas is effectively black.

---

### f10 — 0.167s — First Movement

```
Grid:                 opacity = ramp(10, 0, 35) = 10/35 = 0.286 → actual 0.243
Phone:                opacity = ramp(10, 0, 50) = 10/50 = 0.20
Amber bloom:          opacity 0 (appUIIn not started until f25)
Corners:              opacity = ramp(10, 15, 45) = 0 (not started)
Text "You see...":    opacity 0 (not started until f35)
```

The grid is slightly visible. The phone body is 20% opaque — barely perceptible but present. The amber bloom has not yet appeared. The frame reads as "something is emerging from darkness."

---

### f25 — 0.417s — App UI Begins

```
Grid:                 opacity 0.714 (25/35)
Phone body:           opacity 0.50
App UI:               opacity = ramp(25, 25, 70) = 0/45 = 0 (just starting)
Amber bloom:          opacity 0 × 0 = 0 (appUIIn just started)
Corners:              opacity = ramp(25, 15, 45) = 10/30 = 0.333
Text:                 opacity 0 (not started)
```

Grid is 71% visible. Phone is half-opacity. Corner brackets are 1/3 opacity. The frame is establishing — content is arriving but not yet readable.

---

### f50 — 0.833s — Scene Established

```
Grid:                 opacity 0.85 (reached maximum)
Phone body:           opacity 1.0 (PHONE_IN complete)
App UI:               opacity = ramp(50, 25, 70) = 25/45 = 0.556
Amber bloom:          opacity ≈ 0.556 × amberOp = growing
Corners:              opacity = ramp(50, 15, 45) = 1.0 (fully in)
Text "You see...":    opacity = ramp(50, 35, 65) = 15/30 = 0.50
```

Phone is fully opaque. Grid and corners are fully established. App UI is slightly over halfway visible. Text is at 50% opacity. The frame is readable but still "opening" — the amber bloom is building warmth.

---

### f70 — 1.167s — Warm Scene Complete

```
Grid:                 opacity 0.85
Phone body:           opacity 1.0
App UI:               opacity 1.0 (APP_UI_IN complete)
Amber bloom:          opacity at maximum (amberOp = 1.0)
Corners:              opacity 1.0
Text "You see...":    opacity 1.0 (TEXT1_IN complete at f65)
```

The warmest, most amber-dominant frame of the entire animation. The phone glows with amber light. All UI elements are fully visible. This is the "desire" peak — maximum warmth before the cold scan begins.

---

### f95 — 1.583s — Scan Initiates

```
Scan beam:            y = 64px (top of content area), just appearing
                      scanProgress = 0/75 = 0.0
                      op = 0 → ramps to full over 3 frames
Text "You see...":    opacity = ramp(95, 85, 105) = 10/20 × (remaining) ≈ fading
All warm elements:    still at full opacity
```

The scan beam appears at the very top of the content area. Nothing has been "scanned" yet — the phone still shows the full warm UI. The text is beginning to fade. Transitional frame.

---

### f110 — 1.833s — Scan In Progress

```
Scan beam:            y = 64 + (15/75)*952 = 64 + 190.4 = 254px
                      scanProgress = 15/75 = 0.200
                      Beam has scanned 20% of canvas height
Phone (above beam):   wireframe state (cyan strokes, no fill)
Phone (below beam):   warm state (amber gradient, colored)
Clip boundary:        at 254px canvas space = approximately y=84 in phone viewBox
                      (screen starts at y=50 in viewBox, so about 34px scanned)
Text "You see...":    opacity ≈ 0 (fully faded by f105)
Text "You want to...":opacity = ramp(110, 140, 168) = 0 (not started)
```

The split between warm and wireframe is visible. The top quarter of the phone's screen shows cyan wireframe. The rest remains amber and warm.

---

### f140 — 2.333s — Halfway Scan, Second Text

```
Scan beam:            y = 64 + (45/75)*952 = 64 + 571 = 635px
                      scanProgress = 45/75 = 0.600
Phone (above 635px):  wireframe (everything above beam y)
Phone (below 635px):  warm (only bottom portion)
                      Approximately 65% of phone is wireframe now
Text "You want to...":opacity = ramp(140, 140, 168) = 0/28 = just starting
Amber bloom:          `amberOp = 1 × (1 - clamp(interp(collapseProgress, [0,0.4],[0,1])))`
                      collapseProgress = 0, so amberOp = 1.0 still
```

The scan has passed the midpoint of the canvas. Most of the phone's interior is wireframe. The warm UI survives only in the bottom third of the screen. The second text begins appearing.

---

### f160 — 2.667s — Scan 87%, Labels Begin

```
Scan beam:            y = 64 + (65/75)*952 = 64 + 824 = 888px
                      scanProgress = 65/75 = 0.867
Phone:                nearly entirely wireframe (88% scanned)
Floating labels:      beginning to spring outward (LABELS_IN_START = f160)
                      All labels at sp=spring(0)=0 — still at canvas center
Text "You want to...":opacity = ramp(160, 140, 168) = 20/28 = 0.714
```

The scan is nearly complete. The phone is almost entirely wireframe. The first labels (NAVIGATION, SCREENS · 12 with delay=0 and delay=3) are beginning their spring outward movement — invisible at this frame but their springs have started.

---

### f175 — 2.917s — Scan Complete, Labels Emerging

```
Scan beam:            scanProgress = 1.0 (SCAN_END = f170, already past)
                      op = (1 - progress)/0.12 = (1-1.0)/0.12 = 0 → beam invisible
                      Beam has faded out
Phone:                100% wireframe state
Floating labels:      Each label at spring(15 - delay):
                      NAVIGATION (delay=0):  spring(15) ≈ 0.70 → at 70% of dx=-340
                      TYPOGRAPHY (delay=6):  spring(9)  ≈ 0.45 → at 45% of dx=+280
                      COLOR SYSTEM (delay=11): spring(4) ≈ 0.17 → just starting
                      others: earlier stages
Amber bloom:          fully gone (scan complete, amberOp driven by scan context)
Text "You want to...":opacity = ramp(175, 140, 168) → past end → 1.0 (fully visible)
```

The scan beam has vanished. The phone is cold wireframe. Labels are spreading outward at varying distances based on their delays. The frame is maximally "clinical" — cyan, precise, analytical.

---

### f195 — 3.250s — Labels Fully Deployed

```
Phone:                Full wireframe, full opacity
Floating labels:      All 6 labels at or near their target positions:
                      NAVIGATION:    sp≈1.0, at (-340, -140) from center
                      TYPOGRAPHY:    sp≈0.93, at (+280, -80) from center (nearly settled)
                      COLOR SYSTEM:  sp≈0.82, at (-310, +60) from center
                      COMPONENTS:    sp≈0.66, at (+260, +130) from center
                      DESIGN TOKENS: sp≈0.51, at (-280, +180) from center
                      SCREENS · 12:  sp≈0.85, at (+230, -160) from center
Text "You want to...":opacity = 1.0 (fully visible)
```

This is the peak "analysis" frame. The phone is wireframe. All labels are visible and approaching their target positions. This reads as "complete digital dissection." Spectr has identified every component.

---

### f215 — 3.583s — Collapse Initiated

```
collapseProgress:     ramp(215, 215, 265) = 0/50 = 0.0 (just beginning)
Phone scale:          1.55 × (1 - 0 × 0.98) = 1.55 (unchanged)
Phone opacity:        1.0 × (1 - 0) = 1.0 (unchanged)
Floating labels:      fadeOp = fade(215, COLLAPSE_START=215, COLLAPSE_END=265)
                      = fade(215, 215, 265) = 1→0 starting — labels begin fading
Collapse particles:   not yet visible (localFrame=0, particles at origin)
Text "You want to...":opacity = fade(215, 198, 215) = 0 → fully faded out
```

The collapse has just begun. Nothing has visually changed yet — the phone and labels look the same. The text has just finished fading. The viewer has one frame of anticipation before the destruction begins.

---

### f250 — 4.167s — Mid-Collapse

```
collapseProgress:     ramp(250, 215, 265) = 35/50 = 0.70
Phone scale:          1.55 × (1 - 0.70 × 0.98) = 1.55 × 0.314 = 0.487
                      Phone is roughly half its original rendered size
Phone opacity:        1.0 × (1 - 0.70) = 0.30 (30% — nearly invisible)
Amber bloom:          fully gone (collapseProgress > 0.4)
Labels:               opacity = 0 (fade complete by collapseProgress=1)
Particles:            progress=0.70, particles at 70% of max radius
                      NAVIGATION particle (if angle≈π): x = 960 - 0.70*280*speed
                      Radius spread: ~98px–196px from center
                      Opacity: 0.30–1.0 (depends on life value)
Flash:                not started (FLASH_IN_START = f258)
```

The phone is small and nearly transparent. Particles fill the space around where it was. The scene looks like an explosion frozen mid-frame.

---

### f258 — 4.300s — Flash Begins

```
collapseProgress:     ramp(258, 215, 265) = 43/50 = 0.86
Phone scale:          1.55 × (1 - 0.86 × 0.98) = 1.55 × 0.157 = 0.243
                      Phone is tiny, nearly collapsed
Phone opacity:        1.0 × (1 - 0.86) = 0.14 (barely visible)
Flash:                ramp(258, 258, 264) = 0/6 = 0.0 → just starting
                      min(flashRampIn, flashRampOut) = min(0, 1) = 0
Particles:            progress=0.86, near max radius, beginning to fade
```

The phone is almost gone. The flash hasn't yet started visually, but the condition has been met. On the next frame (f259), the flash will be at 1/6 opacity.

---

### f268 — 4.467s — Post-Flash, Doc Begins

```
Flash:                ramp(268, 258, 264) = 1.0 [past ramp-in, clamped]
                      fade(268, 264, 275) = (275-268)/(275-264) = 7/11 = 0.636
                      flashOp = min(1.0, 0.636) = 0.636 → 64% opacity white overlay
Phone:                collapseProgress=1.0 → scale=0.031, opacity=0 (invisible)
Particles:            collapseProgress=1.0 → at max radius, mostly faded
Doc icon:             docProgress = ramp(268, 268, 318) = 0/50 = 0.0
                      spring(0) = 0 → doc invisible
                      dashOffset = PERIM = 560 → stroke not drawn yet
```

The white flash is still 64% opaque. The doc icon has just started its spring but is not yet visible. A frame of near-white with collapsing particles.

---

### f285 — 4.750s — Doc Drawing

```
Flash:                completely faded (past FLASH_OUT_END=275)
Doc icon:             docProgress = ramp(285, 268, 318) = 17/50 = 0.34
                      spring(17) ≈ 0.95 (nearly settled in position)
                      dashOffset = interpolate(0.34, [0,1], [560,0]) = 560 - 190 = 370
                      Approximately 34% of the path is drawn
                      Corner fold visible (docProgress > 0.25)
                      0 text lines visible (all thresholds > 0.34 except Line 0 at 0.30)
                      Line 0: threshold 0.30, lineOp = ramp(0.34, 0.30, 0.42) = 0.04/0.12 = 0.33
violetBloom:          ramp(285, 272, 318) = 13/46 = 0.283
                      stdDeviation = 4 + 0.283*12 = 7.4px
                      First violet glow beginning to show
```

The flash is gone. The doc icon is 95% to its final scale, with about a third of its outline drawn. The first text line is barely visible (0.33 opacity). Violet glow is 28% developed.

---

### f300 — 5.000s — Doc Nearly Complete

```
Doc icon:             docProgress = ramp(300, 268, 318) = 32/50 = 0.64
                      dashOffset = 560 - 0.64*560 = 201.6 → 64% of path drawn
                      Lines visible:
                        Line 0 (0.30): lineOp = ramp(0.64, 0.30, 0.42) = 1.0 (full)
                        Line 1 (0.42): lineOp = ramp(0.64, 0.42, 0.54) = 1.0 (full)
                        Line 2 (0.54): lineOp = ramp(0.64, 0.54, 0.66) = 10/12 = 0.833
                        Line 3 (0.62): lineOp = ramp(0.64, 0.62, 0.74) = 2/12 = 0.167
                        Lines 4,5: opacity 0
violetBloom:          ramp(300, 272, 318) = 28/46 = 0.609
                      stdDeviation = 4 + 0.609*12 = 11.3px
                      Strong violet glow
Doc fade:             clamp(interp(300, [302, 332], [1, 0])) = 1.0 (not started)
```

Four text lines are appearing or fully visible. The document is 64% drawn. The violet glow is at 61%, producing a notable purple-white halo. The document reads as a completed spec with content.

---

### f312 — 5.200s — Transition: Doc Fading, S Appears

```
Doc icon:             docProgress = 1.0 (complete, all 6 lines visible, full glow)
                      docFade = clamp(interp(312, [302, 332], [1, 0])) = (302-312)/(302-332)
                              Wait: fade(frame, 302, 332) = clamp(interp(312,[302,332],[1,0]))
                              = 1 - (312-302)/(332-302) = 1 - 10/30 = 0.667
                      Doc at 67% opacity (beginning to fade)
Wordmark - S:         charLocalFrame = 312 - 312 - 0 = 0
                      spring(0) = 0 → S not yet visible
                      glitchOpacity = 0 → still invisible
Wordmark overall:     overallOp = ramp(312, 312, 324) = 0/12 = 0 → container invisible
```

The transition frame. The doc is fading at 67%. The wordmark container is just becoming visible (0%). S has frame 0 of its spring — the very first moment of its existence.

---

### f330 — 5.500s — S Settled, E Starting

```
Doc icon:             docFade = 1 - (330-302)/30 = 1 - 0.933 = 0.067
                      Doc at 6.7% opacity — nearly invisible
Wordmark - S (i=0):   charLocalFrame = 330 - 312 = 18
                      spring(18) ≈ 1.0 (settled, spring config damping=24 settles ~16-18f)
                      glitchWindow 14f: charLocalFrame=18 > 14 → no glitch
                      Opacity = spring ≈ 1.0
                      Transform: translateY(0) (settled)
Wordmark - P (i=1):   charLocalFrame = 330 - 321 = 9
                      spring(9, damping=24, stiffness=130) ≈ 0.62
                      In glitch window (9 < 14): glitch active
Wordmark - E (i=2):   charLocalFrame = 330 - 330 = 0 → spring(0)=0, appearing
Wordmark - C,T,R:     Not yet started (charLocalFrame < 0)
Divider:              progress = ramp(330, 330, 355) = 0 → not visible
Bloom:                ramp(330, 355, 360) = 0 → no bloom yet
Neon shadow:          'none' (bloomProgress=0)
```

S is fully locked in place at full opacity with no glow. P is glitching (62% spring, mid-glitch). E is at the very first frame of its appearance. The wordmark is partially assembled — the left side is clean, the right side doesn't exist yet.

---

### f340 — 5.667s — THE HERO FRAME

```
Doc icon:             0% opacity (completely gone)
Wordmark - S (i=0):   spring settled, opacity 1.0, no glitch, y=0 ✓
Wordmark - P (i=1):   spring settled, opacity 1.0, no glitch, y=0 ✓
Wordmark - E (i=2):   charLocalFrame=10, spring(10)≈0.79, in glitch window
                      glitchX = interp(10,[0,14],[10,0]) * ±1 = ~2.86px × ±1 = ≈±2.9px
                      glitchOp = 0.4 + 0.6*|sin(10*11.3)| ≈ oscillating
Wordmark - C (i=3):   charLocalFrame=1, spring(1)≈0.04, barely visible, in glitch
Wordmark - T (i=4):   charLocalFrame=-8 → not started (0 opacity)
Wordmark - R (i=5):   charLocalFrame=-17 → not started (0 opacity)
Bloom:                ramp(340, 355, 360) = 0 → no bloom yet
Neon shadow:          'none'
Divider:              ramp(340, 330, 355) = 10/25 = 0.40 → width=168px, opacity=0.40
Tagline:              ramp(340, 340, 360) = 0/20 = 0 → just starting
URL badge:            not started (URL_IN_START=f350)
```

**This is the hero frame precisely specified.**

S and P are clean, settled, white at full opacity with NO glow (bloom hasn't started). E is mid-glitch — slight horizontal jitter, opacity flickering. C has just barely appeared. T and R don't exist yet. The divider is 40% drawn below. The tagline is at exactly 0%.

Despite being the "hero frame," the wordmark is NOT fully assembled here — only S and P are clean. The hero frame is the moment C appears (f340 = f339+1 for C's start), which makes it the frame where the wordmark becomes "readable" for the first time. The viewer can read "SPECTR" even though T and R are absent — the first 4 letters make the brand legible. This is the payoff.

---

### f355 — 5.917s — Bloom Begins

```
Wordmark - S,P,E,C:   All settled, opacity 1.0, no glitch
Wordmark - T (i=4):   charLocalFrame=7, spring(7)≈0.40, in glitch
Wordmark - R (i=5):   charLocalFrame=-2 → opacity 0 (not started)
Bloom:                ramp(355, 355, 360) = 0/5 = 0 → just starting
Neon shadow:          bloomProgress=0 → 'none' → transitions to first shadow value
Divider:              ramp(355, 330, 355) = 1.0 → width=420px, fully drawn
Tagline:              ramp(355, 340, 360) = 15/20 = 0.75 → 75% opacity, 4.5px from final
URL badge:            ramp(355, 350, 360) = 5/10 = 0.5
                      spring(5, damping=16, stiffness=85) ≈ 0.28 → scale=0.28
```

The divider is fully drawn. Five of six characters are visible (R is still appearing). The bloom has just started — at f355, bloomProgress=0, so neon shadow is still 'none'. This frame is the last one where the wordmark appears without glow.

---

### f368 — 6.000s+ — BEYOND CLIP (reference)

The animation clips at f360. This frame is documented for reference to understand where the spring animations would have settled if the clip were extended.

```
All SPECTR chars:     settled at opacity 1.0, y=0, no glitch
Bloom:                ramp(368, 355, 360) = 1.0 (clamped)
                      bloomProgress = 1.0 → full neon glow
Neon shadow at f368:
  breathe = sin((368-360)*0.035)*0.5+0.5 = sin(0.28)*0.5+0.5 = 0.639
  Layer 1: 0 0 4.9px rgba(255,255,255,0.95) [3 + 0.639*3 = 4.92]
  Layer 2: 0 0 11.2px rgba(255,255,255,0.80)
  Layer 3: 0 0 24.4px rgba(255,255,255,0.55)
  Layer 4: 0 0 52.8px rgba(255,255,255,0.30)
  Layer 5: 0 0 102.4px rgba(200,210,255,0.18)
  Layer 6: 0 0 171.9px rgba(160,175,255,0.10)
Tagline:              ramp(368,340,360)=1.0 → full opacity
URL badge:            spring(18)≈1.0, full scale, slight breathe on dot
Global fade:          ramp(368,348,360)=1.0 → fully faded (but this is beyond clip)
```

This reference frame confirms that the animation's full bloom state would be visible approximately 8 frames after the current clip end. This is by design: the animation feels like it was interrupted mid-glory — Spectr is still building.

---

### f390 — 6.500s — THEORETICAL FULL BLOOM (extended composition reference)

If the composition were extended to 8 seconds and BLOOM_IN extended proportionally:

```
Bloom:                breathe = sin((390-360)*0.035)*0.5+0.5 = sin(1.05)*0.5+0.5 = 0.929
                      Glow is near its breathing maximum
Neon shadow:
  Layer 1: 0 0 5.8px rgba(255,255,255,0.95) [3 + 0.929*3]
  Layer 2: 0 0 12.6px rgba(255,255,255,0.80)
  Layer 3: 0 0 27.3px rgba(255,255,255,0.55)
  Layer 4: 0 0 58.6px rgba(255,255,255,0.30)
  Layer 5: 0 0 112.5px rgba(200,210,255,0.18)
  Layer 6: 0 0 186.5px rgba(160,175,255,0.10)
```

This is the "full bloom" reference state — the maximum glow intensity the composition can reach with the current breathing parameters.

---

*End of ANIMATION_SPEC.md*

---

**Document statistics:**  
Sections: 10  
Subsections: 47  
Tables: 18  
Code blocks: 42  
Frame annotations: 24  
Total components documented: 10  
Total color values defined: 42  
Total timing constants: 28  

*Spectr — See an app. Ship an app.*
