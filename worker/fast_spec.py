"""DESIGN.md generator — pipeline output now follows the canonical
"Awesome iOS DESIGN.md" template (see the awesome-ios-design-md repo).

The previous fast_spec produced a 7-section Spectr-shaped spec.md with
templated "Implementation Notes" and "Claude Code Prompt" sections. We
swapped to the inspired-by design-system shape that the gallery uses, so
pipeline output is drop-in compatible with the awesome-ios-design-md
folder format.

Output shape: one DESIGN.md file, 10 numbered sections:

  1. Visual Theme & Atmosphere
  2. Color Palette & Roles
  3. Typography Rules
  4. Component Stylings
  5. Screen Inventory & Patterns   ← folds in the per-screen content
  6. Layout & Spacing
  7. Depth & Elevation
  8. Dos and Don'ts
  9. Responsive / Adaptive Rules
  10. Quick Reference Cheat Sheet

Sections 1-4 and 6-10 mirror the canonical gallery template
(awesome-ios-design-md/design-md/airbnb/DESIGN.md). Section 5 is the
fold-in — vision-extracted screen-by-screen patterns that the gallery
doesn't carry (because the gallery is hand-curated brand reference, not
recording-driven).

The generator is one comprehensive Sonnet call rather than the previous
5-parallel-call orchestration. Single call gives better cross-section
coherence — every reference to a color or font lands consistently because
the model sees the whole document at once.

`brand_colors` and `your_app_name` are accepted for API compatibility but
ignored: DESIGN.md is an "inspired by" design-system reference, not a
"build a clone with these brand overrides" instruction. Apply brand
overrides at the implementation stage instead.
"""

from __future__ import annotations

import time
from pathlib import Path

try:
    import local_worker
except ImportError:
    from worker import local_worker  # type: ignore[no-redef]


_SONNET = "claude-sonnet-4-6"


# ──────────────────────────────────────────────
# Prompts
# ──────────────────────────────────────────────

_DESIGN_MD_SYSTEM = """You are producing a comprehensive iOS design-system reference document in the
canonical "Awesome iOS DESIGN.md" format — a magazine-quality "inspired by"
design spec that an AI coding agent or a designer reads to understand and
recreate the look and feel of a real iOS app.

Voice and rigor:
- Editorial, opinionated, specific. Long > short. Specific > general.
- Use real font names and exact hex codes wherever possible. Lean on your
  knowledge of the named reference app when the frames are ambiguous, but
  prefer the values present in the FRONTEND SPEC's DESIGN TOKENS block
  when there is a conflict.
- Every color must include its `#hex` value in backticks.
- Every font must have a real name (SF Pro Text, Inter, Söhne, Cash Sans,
  Airbnb Cereal, etc.) — never "system sans-serif" alone.
- Every numeric value carries a unit (`16pt`, `1.4`, `0.08`, etc.).

Tone constraints:
- This is inspired-by. The reference app's trademarks belong to its owners.
  Do not claim official endorsement.
- Avoid generic adjectives like "clean" or "minimal" without saying what
  specifically makes the design so — e.g. "12pt vertical rhythm, hairline
  dividers, no decorative chrome" instead of "clean".

Output rules:
- Markdown only. No code fences around the whole document.
- No preamble, no closing remarks.
- Exactly the 10 numbered top-level sections in the order specified by the
  user prompt. No extra `##` sections."""


_DESIGN_MD_USER = """Produce a single DESIGN.md file for the iOS app: {reference_app}.

The FRONTEND SPEC below is a vision-extracted summary of a screen recording
of {reference_app}. It contains per-screen analysis and a DESIGN TOKENS
block (colors, typography, components, layout, elevation, do's/don'ts,
responsive rules — extracted directly from frames). Use this as your
primary source of truth for concrete values. Where values are missing or
ambiguous, fall back to your knowledge of the real {reference_app} iOS app.

FRONTEND SPEC:
{frontend_spec}

OUTPUT exactly this structure:

# Design System Inspiration of {reference_app} (iOS)

## 1. Visual Theme & Atmosphere

Write 2-4 paragraphs describing the overall look, mood, contrast model,
surface treatment, and visual hierarchy. Identify the signature visual
moves that make the app instantly recognizable. End with a bullet list
titled **Key Characteristics:** with 5-9 bullets summarizing the signature
moves (canvas color + accent + iconography + key motion + typography
personality + tab/nav model).

## 2. Color Palette & Roles

Organize as:

### Primary
- **Name** (`#hex`): role description

### Surface, Background & Dividers
- **Name** (`#hex`): role description

### Text
- **Name** (`#hex`): role description

### Semantic
- **Success / Warning / Error / Info** (`#hex` each)

### Dark Mode
Include only if the recording shows dark mode or it is strongly implied by
the brand. Mirror the structure above with the dark variants.

## 3. Typography Rules

### Font Family
Name the primary face (real name — e.g. "SF Pro Text", "Inter",
"Capsule Sans Text", "Airbnb Cereal", etc.). List weights available and
the platform fallback stack.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|

Cover at least: Large Nav Title, Section Header, Subsection, Card Title,
Body, Body Small, Metadata, Button (Primary), Button (Secondary), Tab
Label, Chip Label, Caption. Use real values inferred from the frames +
your knowledge of the app.

### Principles
3-5 bullets explaining the typographic logic and hierarchy.

## 4. Component Stylings

For each major component family visible in the frames (Buttons, Cards,
Inputs, Lists, Navigation Bars, Tab Bars, Modals & Sheets, Pills/Badges,
Toasts, Empty States, Avatars), use a `### ComponentName` subheading and
specify exact values for: background, text, border-radius, border, shadow,
padding, and states (`pressed`, `focus`, `disabled`, `selected`) where
applicable. Be concrete: `border-radius: 12pt`, not "rounded corners".

## 5. Screen Inventory & Patterns

For each distinct screen visible in the FRONTEND SPEC, write a
`### Screen Name` subheading followed by a tight ~75-150 word entry
covering:

- **Purpose** — one sentence on what the screen does for the user
- **Layout** — header / body / footer structure, sticky elements, scroll
  behavior
- **Key modules** — the named patterns this screen uses (e.g. "carousel
  rail", "two-column grid", "sticky bottom CTA")
- **Primary actions** — the dominant CTAs and gestures
- **States** — empty / loading / error / success behaviors visible or
  strongly implied
- **Motion** — transitions or animation if visible

After all per-screen entries, add a `### Shared Patterns` subsection
naming the cross-screen patterns (e.g. "every screen has a sticky search
header", "all detail screens slide up as a sheet from the bottom",
"the tab bar disappears in immersive flows").

## 6. Layout & Spacing

Document the spacing scale, grid system, gutters, page padding, card
padding, and major layout intervals with precise numeric values.

| Token | Value | Usage |
|-------|-------|-------|

Cover at least: page horizontal padding, card padding, vertical rhythm
between sections, gap between cards, hairline divider weight.

## 7. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|

Cover 3-5 rows from flat surfaces through cards, sticky chrome, and
modals/overlays. Include borders, shadows, blur, and luminance shifts as
applicable.

### Principles
3-5 bullets explaining how depth is communicated.

## 8. Dos and Don'ts

### Do
5-9 bullets. Each item formatted: `**Bold principle** — reason it matters`

### Don't
5-9 bullets. Same format.

## 9. Responsive / Adaptive Rules

| Name | Width | Key Changes |
|------|-------|-------------|

Cover Mobile Standard (375pt), Larger Phones (414pt / 430pt), and iPad if
the app supports it. Document layout shifts, density changes, and
navigation collapse rules.

### Principles
3-5 bullets explaining the responsive strategy.

## 10. Quick Reference Cheat Sheet

A compact, build-oriented reference for the most important colors,
typography roles, spacing tokens, and component recipes. Designed for an
engineer translating the design into code. Use short tables or tight
bullet lists; this section is a fast lookup, not prose."""


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _strip_fence(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        lines = t.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines).strip()
    return t


# ──────────────────────────────────────────────
# Public entry — drop-in signature with generate_sectioned_spec
# ──────────────────────────────────────────────

def generate_spec_fast(
    *,
    reference_app: str,
    your_app_name: str,
    brand_colors: dict,
    frontend_spec: str,
    project_id: str,
    output_dir: Path,
) -> str:
    """Generate a single DESIGN.md (10-section gallery format) from the
    vision-extracted frontend spec.

    `your_app_name` and `brand_colors` are accepted for API compatibility
    with the previous fast_spec signature but are not applied — DESIGN.md
    is an inspired-by reference document, not a "clone-build with these
    brand overrides" instruction. Brand overrides belong at the
    implementation stage.
    """
    del your_app_name, brand_colors  # unused under the new contract

    output_dir.mkdir(parents=True, exist_ok=True)
    start = time.time()

    local_worker.project_log(
        project_id,
        "        [design.md] generating 10-section spec via Sonnet",
    )

    raw = local_worker.claude_text(
        _DESIGN_MD_USER.format(
            reference_app=reference_app,
            frontend_spec=frontend_spec,
        ),
        system=_DESIGN_MD_SYSTEM,
        model=_SONNET,
        timeout=900,
    )
    content = _strip_fence(raw)
    if not content:
        raise RuntimeError("DESIGN.md generation returned empty content")

    text = content + "\n" if not content.endswith("\n") else content
    (output_dir / "DESIGN.md").write_text(text, encoding="utf-8")

    elapsed = time.time() - start
    local_worker.project_log(
        project_id,
        f"        [design.md] complete: {elapsed:.1f}s, {len(text):,} chars",
    )
    return text
