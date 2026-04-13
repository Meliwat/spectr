# Spectr Waitlist Page — Design Spec

**Date:** 2026-04-12
**Status:** Options for review — no build yet
**Scope:** `/waitlist` route, new page, existing homepage untouched

---

## Foundation: Existing Design System

Everything below extends (never replaces) the current token set. All new tokens are additive.

### Current Tokens (reference)

```css
/* Backgrounds */
--bg-canvas: #010102
--bg:        #08090a
--bg-2:      #0f1011

/* Surfaces */
--surface:   #191a1b
--surface-2: #28282c
--surface-3: rgba(255,255,255,0.02)
--surface-4: rgba(255,255,255,0.04)

/* Brand */
--indigo:       #5e6ad2
--violet:       #7170ff
--violet-hover: #828fff
--lavender:     #7a7fad

/* Text */
--text:    #f7f8f8
--text-2:  #d0d6e0
--muted:   #8a8f98
--subdued: #62666d

/* Borders */
--border:        rgba(255,255,255,0.08)
--border-subtle: rgba(255,255,255,0.05)

/* Shadows */
--shadow-soft:  0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(255,255,255,0.04)
--shadow-panel: 0 20px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)
--shadow-focus: 0 0 0 1px rgba(113,112,255,0.4), 0 0 0 4px rgba(113,112,255,0.12), 0 8px 24px rgba(0,0,0,0.35)

/* Glow */
--ghost-glow:       0 0 24px rgba(113,112,255,0.12)
--ghost-glow-hover: 0 0 32px rgba(113,112,255,0.22)
```

### Existing Animations (reference)

```css
ghost-emerge   — fade in + translateY(18px) + blur(4px) → 0. Duration 0.8s, cubic-bezier(0.16,1,0.3,1)
ghost-fade-in  — fade in + translateY(6px) → 0. Duration 0.4s ease
ghost-shimmer  — background-position sweep, 2s linear infinite (used in GhostSkeleton)
ghost-pulse    — opacity 0.4 → 0.8 → 0.4, infinite
ghost-float    — translateY(0) → (-4px) → 0, infinite
```

---

## New Tokens (shared across all options)

These apply regardless of which direction is chosen.

### Extended Glow Tokens

```css
/* Ambient background glow — the violet halo at top of body, extended */
--glow-primary:   radial-gradient(ellipse 70% 40% at 50% -5%, rgba(113,112,255,0.18), transparent)
--glow-secondary: radial-gradient(ellipse 50% 30% at 15% 10%, rgba(94,106,210,0.10), transparent)
--glow-accent:    radial-gradient(ellipse 40% 20% at 85% 5%,  rgba(122,127,173,0.07), transparent)

/* Panel inner glow — top edge highlight on glass panels */
--glow-panel-top: inset 0 1px 0 rgba(255,255,255,0.06)

/* Violet bloom — for the CTA button and form focus states */
--bloom-violet:      0 0 0 1px rgba(113,112,255,0.5), 0 0 40px rgba(113,112,255,0.2), 0 0 80px rgba(113,112,255,0.08)
--bloom-violet-rest: 0 0 24px rgba(113,112,255,0.14), 0 2px 8px rgba(0,0,0,0.4)
```

### Extended Timing Tokens

```css
/* Easing curves */
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1)      /* already used in ghost-emerge */
--ease-out-quart:  cubic-bezier(0.25, 1, 0.5, 1)      /* snappier, for hover states */
--ease-in-out-sin: cubic-bezier(0.37, 0, 0.63, 1)     /* for continuous loops */
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)  /* subtle overshoot, for button press */

/* Durations */
--dur-instant:  80ms
--dur-fast:     160ms
--dur-normal:   280ms
--dur-slow:     480ms
--dur-crawl:    800ms    /* same as ghost-emerge */
--dur-drift:    3200ms   /* ambient loops */
--dur-type:     40ms     /* per-character typewriter delay */
```

### Reveal Delay Scale

Used via CSS custom property `--reveal-delay` (same pattern as existing homepage):

```
hero-label:    80ms
hero-h1-line1: 180ms
hero-h1-line2: 320ms
hero-sub:      460ms
hero-form:     600ms
hero-founding: 760ms
right-panel:   500ms
panel-item-1:  680ms
panel-item-2:  820ms
panel-item-3:  960ms
panel-item-4:  1100ms
```

---

## Layout (shared across all options)

The waitlist page reuses the existing layout primitives exactly:

```
page-frame landing-frame
  └─ page-shell landing-shell
       └─ panel-strong  (the main card, same border-radius 22px, same glass bg)
            └─ grid: [1.45fr | 0.85fr] at lg breakpoint
                 ├─ LEFT COLUMN  — headline, sub, form, founding line
                 └─ RIGHT COLUMN — varies by option (see below)
```

The nav remains unchanged. The eyebrow chips change copy.

**Eyebrow chips (waitlist page):**
- Chip 1 (with violet dot): `Early access`
- Chip 2: `Free for founding members`

---

## Option A — Typewriter Spec Preview

**Concept:** The right panel shows a live typewriter effect rendering real spec.md output. Text appears character by character, section by section, as if Claude is writing it in real time. Loop restarts silently every ~20 seconds. No fabrication — use real output from a run.

**Why it works:** Developers read it and immediately understand what they're getting. Zero explanation needed. The output sells itself.

### New Tokens (Option A only)

```css
/* Typewriter cursor */
--cursor-width:   2px
--cursor-height:  1.1em
--cursor-color:   var(--violet)
--cursor-blink:   blink-hard 0.9s step-end infinite

/* Code surface — the inner panel showing the spec */
--spec-surface-bg:     rgba(255,255,255,0.02)
--spec-surface-border: rgba(255,255,255,0.05)
--spec-surface-radius: 14px
--spec-font:           'Berkeley Mono', ui-monospace, 'SF Mono', monospace
--spec-font-size:      12px
--spec-line-height:    1.7
--spec-color-heading:  var(--text)
--spec-color-label:    var(--subdued)
--spec-color-value:    var(--text-2)
--spec-color-accent:   var(--violet)   /* used for ## section markers */
```

### Animation Spec (Option A)

```
@keyframes blink-hard {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@keyframes spec-line-in {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

Typewriter loop:
  - Phase 1 (0–8s):   Type the ## heading character by character at --dur-type delay
  - Phase 2 (8–16s):  Type 3–4 key/value pairs below it, each line fading in after previous completes
  - Phase 3 (16–19s): Hold — cursor pulses at end of last line
  - Phase 4 (19–20s): Fade entire panel to opacity:0 over 0.6s
  - Phase 5 (20s):    Reset, restart from Phase 1

Cursor:
  - Renders as ::after pseudo-element on the active line
  - Uses blink-hard (step-end, not ease — hard blink only)
  - Disappears during Phase 4 fade

Section cycling order (example content):
  ## Screen: Home Feed
  Route       /feed
  Layout      Vertical FlatList, full-bleed cards
  Components  FeedCard, StoryRail, FloatingTabBar
  States      loading · empty · populated · refreshing

  ## Design System
  Primary     #7170ff
  Background  #010102
  Font        Inter Variable, 510 weight
  Radius      6px · 14px · 22px · 9999px
  
  ## Screen: Profile
  Route       /profile/:id
  Layout      ScrollView, sticky header, tab switcher
  Actions     follow · message · share · block
```

### Right Panel Structure (Option A)

```
panel (18px radius, same glass as homepage right panel)
  ├─ header row
  │    ├─ section-title label: "LIVE OUTPUT PREVIEW"
  │    └─ status dot (pulsing violet dot + "Generating..." text in --muted)
  └─ spec-surface (inner rounded box, monospace font)
       └─ typewriter content
            ├─ ## heading line (--spec-color-accent for ## token, --text for heading text)
            ├─ key–value rows (--spec-color-label : --spec-color-value)
            └─ blinking cursor
```

---

## Option B — Animated Spec Sections Reveal

**Concept:** The right panel renders the 7 spec sections as stacked pill-chips. On page load they cascade in one by one (same ghost-emerge timing as homepage steps). Each chip has a shimmer sweep passing through it once after appearing — like a progress bar completing. After all 7 are in, a "bundle ready" state appears at the bottom with a subtle green pulse and download icon.

**Why it works:** Shows the scope of what you get (7 structured sections) without showing raw text. More legible at a glance. The shimmer + "ready" state implies speed and completeness.

### New Tokens (Option B only)

```css
/* Chip shimmer */
--shimmer-base:      rgba(255,255,255,0.03)
--shimmer-highlight: rgba(255,255,255,0.09)
--shimmer-width:     200%
--shimmer-duration:  1.2s
--shimmer-ease:      cubic-bezier(0.4, 0, 0.2, 1)

/* Completion state */
--ready-surface:  rgba(16,185,129,0.06)
--ready-border:   rgba(16,185,129,0.18)
--ready-text:     #10b981
--ready-glow:     0 0 16px rgba(16,185,129,0.12)

/* Section chip */
--chip-height:   44px
--chip-radius:   10px
--chip-border:   rgba(255,255,255,0.05)
--chip-bg:       rgba(255,255,255,0.02)
--chip-bg-done:  rgba(255,255,255,0.035)
```

### Animation Spec (Option B)

```
Section chips cascade in:
  Each chip: ghost-emerge (same as homepage step items), staggered 160ms apart
  Delay sequence: 680ms, 840ms, 1000ms, 1160ms, 1320ms, 1480ms, 1640ms

Per-chip shimmer (fires once, after chip appears):
  @keyframes chip-shimmer-once {
    0%   { background-position: -200% 0; opacity: 0.7; }
    60%  { background-position: 100% 0;  opacity: 1; }
    100% { background-position: 200% 0;  opacity: 0; }
  }
  duration: 1.2s, ease, fills: both
  delay: chip-reveal-delay + 400ms (fires after chip is visible)

"Bundle ready" row:
  Appears after last chip (delay: 1640ms + 600ms = 2240ms)
  Animation: ghost-emerge + green glow pulse
  
  @keyframes ready-pulse {
    0%, 100% { box-shadow: var(--ready-glow); }
    50%       { box-shadow: 0 0 28px rgba(16,185,129,0.22); }
  }
  Loop: infinite, 2s, ease-in-out
  
Loop behavior: static after initial load — no repeat, no loop. One entrance animation, then held.
```

### Right Panel Structure (Option B)

```
panel
  ├─ header row
  │    ├─ section-title: "WHAT YOU GET"
  │    └─ mono label: "7 sections · 1 zip" in --subdued
  ├─ section chips (stacked, gap-2)
  │    ├─ [01] App Overview
  │    ├─ [02] Navigation Structure
  │    ├─ [03] Screen Specifications
  │    ├─ [04] Shared Components
  │    ├─ [05] Design System
  │    ├─ [06] Implementation Notes
  │    └─ [07] Claude Code Prompt   ← this one gets a violet border instead of default
  └─ bundle-ready row
       ├─ green dot (pulsing)
       ├─ "spec.md + bundle.zip ready to build from"
       └─ faint download icon (SVG, --ready-text color)
```

---

## Option C — Ambient Particle Drift + Minimal Form Focus

**Concept:** The right panel is removed entirely. The page goes single-column, centered, maximum 560px. The visual energy comes from the background — a field of 30–40 tiny violet/white particles drifting slowly upward at varying speeds and opacities. The form is the hero. The email input has a bloom glow on focus that's noticeably more dramatic than the homepage's focus state.

**Why it works:** Forces the eye directly to the form. Nothing competes. The particle field adds atmosphere without distraction. Closer to the "cinematic" direction while staying within the existing token system.

### New Tokens (Option C only)

```css
/* Particle field */
--particle-color-a: rgba(113,112,255,0.35)   /* violet dots */
--particle-color-b: rgba(255,255,255,0.12)   /* white dots */
--particle-size-sm: 1.5px
--particle-size-md: 2.5px
--particle-size-lg: 3.5px
--particle-blur-sm: 0px
--particle-blur-lg: 2px

/* Form bloom (focus state, more dramatic than homepage) */
--form-bloom-focus:
  0 0 0 1px rgba(113,112,255,0.55),
  0 0 0 4px rgba(113,112,255,0.16),
  0 0 60px rgba(113,112,255,0.18),
  0 0 120px rgba(113,112,255,0.06)

/* Submit button — larger than standard btn-primary */
--btn-waitlist-height:   52px
--btn-waitlist-radius:   10px
--btn-waitlist-font:     15px
--btn-waitlist-glow:     0 0 40px rgba(113,112,255,0.28), 0 8px 24px rgba(94,106,210,0.3)
--btn-waitlist-glow-hover: 0 0 60px rgba(113,112,255,0.4), 0 12px 32px rgba(94,106,210,0.4)
```

### Animation Spec (Option C)

```
Particle field (CSS-only, no canvas):
  - 36 divs, absolutely positioned, pointer-events none
  - Each: border-radius 50%, position random (seeded via nth-child transforms)
  - Animation: drift-up — translateY(0) → translateY(-100vh), opacity varies
  
  @keyframes drift-up {
    0%   { transform: translateY(0)       scale(1);    opacity: var(--p-opacity-start); }
    85%  { transform: translateY(-90vh)   scale(0.8);  opacity: var(--p-opacity-mid); }
    100% { transform: translateY(-100vh)  scale(0.6);  opacity: 0; }
  }
  
  Each particle has:
    --p-opacity-start: randomized 0.2–0.6 via nth-child
    --p-opacity-mid:   randomized 0.1–0.3
    duration:  8s–22s (staggered, each particle different)
    delay:     0s–12s (so field is pre-populated on load)
    timing:    linear
    iteration: infinite
    bottom:    -20px (start below viewport)
    left:      randomized 0%–100%

Form focus bloom:
  Transition: box-shadow 0.2s var(--ease-out-quart), border-color 0.2s
  Rest state: standard --shadow-soft
  Focus state: --form-bloom-focus (see above)
  
  Input grows subtly on focus:
    transform: scale(1.005)
    transition: transform 0.2s var(--ease-out-quart)

Button press:
  :active → transform: scale(0.97), duration 80ms, ease var(--ease-spring)
  Release → scale(1), duration 160ms, overshoot slightly (spring ease)

Success state (after submit):
  Form fades out: opacity 0, translateY(-8px), duration 400ms
  Success message fades in: opacity 1, translateY(0) from translateY(8px), 400ms delay
  Success message: "You're in. We'll reach out to get your screen recording."
  Color: --text-2, same font size as subheadline
```

### Page Structure (Option C)

```
Full viewport centered flex column
  ├─ eyebrow chips (same as shared layout)
  ├─ h1 (same sizing as homepage)
  ├─ subheadline (tighter copy, see below)
  ├─ form (stacked: email input + submit button, full width, max 420px)
  ├─ founding line
  └─ particle field (position: fixed, inset 0, z-index 0, pointer-events none)

No right panel. No stat cards.
```

---

## Copy (all options)

### Headline
```
See an app.
Build an app.
```
(Unchanged from homepage — it's already right.)

### Subheadline variants

**Option A & B** (two-column layout, more space):
> Send us a screen recording of any mobile app. We'll send back a complete UI spec — every screen, component, and design token — ready to drop into Claude Code and start building.

**Option C** (single-column, tighter):
> Record any app. Get a UI blueprint inspired by it — ready for your agent to execute.

### Founding line (all options)
```
Founding members get a lifetime discount at launch.
```

### Form
- Input placeholder: `your@email.com`
- Button label: `Get my free spec`
- Success: `You're in. We'll reach out to get your screen recording.`

---

## What to Decide

1. **Layout:** Two-column (A or B) or single-column centered (C)?
2. **Right panel story:** Live output demo (A), scope/sections reveal (B), or no panel (C)?
3. **Animation intensity:** Continuous loop (A), one-shot entrance (B), or ambient background (C)?

Recommendation: **Option B** for fastest build and highest clarity. Option A is the most compelling demo but requires real spec output content. Option C is the most visually distinctive but loses the product explanation the right panel provides.

---

## What Doesn't Change (regardless of option)

- `globals.css` — no token changes, only additions
- Nav component
- `btn`, `btn-primary`, `input`, `panel-strong` class definitions
- `ghost-emerge` animation
- Typography scale
- `page-frame`, `page-shell`, `landing-frame`, `landing-shell` layout classes
