"""Fast-mode spec generator — experimental "best bang for buck" path.

Differs from worker.local_worker.generate_sectioned_spec in 4 ways:

1. Sections 1, 6, 7 are static templates with thin interpolation — no LLM calls.
2. Sections 4 and 5 are reformat-only Haiku calls over the DESIGN TOKENS block.
3. Section 3 is a single monolithic Sonnet call — no per-screen split.
4. All 5 model-call sections run in parallel (no lane sequencing).

Wall-clock target: ~3 min vs the full pipeline's 5-10 min.
For a 15-screen app: ~5 spec-gen calls vs the full path's ~21.

Same input (frontend_spec) and same output shape (assembled spec.md) as the
full path, so the two modes can be diffed directly.
"""

from __future__ import annotations

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock

# Import the module rather than rebinding the names. Tests patch
# `local_worker.claude_text` per-test with unittest.mock, and a name binding
# created via `from local_worker import claude_text` would freeze the
# reference at module-load time — patches in later tests would silently miss
# fast_spec's call sites once any earlier test has already imported this
# module. Resolving through `local_worker.claude_text` keeps every call site
# honest about the live attribute.
try:
    import local_worker
except ImportError:
    from worker import local_worker  # type: ignore[no-redef]


_HAIKU = "claude-haiku-4-5-20251001"
_SONNET = "claude-sonnet-4-6"

_SCREEN_HEADER_RE = re.compile(r"(?m)^##\s+Screen:\s*(.+?)\s*$")


# ──────────────────────────────────────────────
# Static section templates (no model calls)
# ──────────────────────────────────────────────

_SECTION_1_TEMPLATE = """## App Overview

{summary_paragraphs}

The intended implementation target is a React Native mobile app for iPhone and
Android phones, not a desktop site. Treat the base-model iPhone 15 viewport as
the primary sizing reference for layout decisions.
"""

_SECTION_6_TEMPLATE = """## Frontend Implementation Notes

Build with Expo SDK 54 plus React Native, TypeScript, React Navigation,
Zustand, and react-native-svg. Drive the first build order from the screen and
component lists above — start with the navigation shell, then the most-
trafficked screens, then secondary surfaces.

Prefer React Native Animated and FlatList by default. Reach for
react-native-reanimated or FlashList only when a screen clearly needs them
(complex shared-element transitions, lists with thousands of items). Smaller
defaults reduce native-module surface and keep the project Expo Go-safe.

Install all Expo-native packages with `npx expo install` so the resolver picks
versions that match the installed SDK. Do not add custom Babel configuration or
prebuild-native config unless the current official Expo docs explicitly require
it. Prioritize Expo Go compatibility and runtime stability over exact animation
fidelity — if a setup risks runtime issues, simplify the animation instead of
leaving a broken app.

Optimize for the base-model iPhone 15 as the baseline device size. The
recording's spacing, type scale, and tap targets were measured at that
viewport.

Do not run final iOS build, simulator, or `npm` commands; execution is done
manually by the user. The spec is build-ready, not deploy-ready.

When branding overrides only change colors, preserve universal restaurant
photos, merchant banners, and merchant logos. Only swap the app logo when an
explicit replacement logo is provided.
"""

_SECTION_7_TEMPLATE = """## Claude Code Prompt

Paste everything below this line into Claude Code:

Build a React Native mobile app called "{your_app_name}" that clones the user
experience of {reference_app}. The app should match the visual system, screen
flow, and core interactions documented in spec.md.

The frontend stack is:
- Expo SDK 54
- React Native
- TypeScript
- React Navigation
- Zustand
- react-native-svg

Start with these five screens, in order: {top_screens}.

Extract shared components from day one — the navigation shell, list cells,
section headers, the primary CTA button, and any pill/badge components used
across multiple screens.

This should be built as a React Native mobile app for iPhone and Android
phones, not a responsive web app. Use local SVG icons and illustrations
instead of emoji characters. Prefer React Native Animated and FlatList by
default, and only reach for react-native-reanimated or FlashList when clearly
necessary. Install Expo-native packages only with `npx expo install` and only
at Expo-compatible versions for SDK 54. Do not add custom Babel or native
configuration unless the current official Expo docs require it. Prioritize
Expo Go compatibility and runtime stability over exact animation fidelity —
simplify risky setups rather than leaving a broken app. If the spec mentions
older or ambiguous versions like "Reanimated 2", interpret that as the
current Expo-compatible version, not a legacy setup. Do not run iOS build,
simulator, or `npm` commands at the end; final execution is handled by the
user manually. The baseline device target is the base-model iPhone 15.
Branding overrides should only change colors and an explicitly provided
replacement logo while preserving universal restaurant photos, merchant
banners, and merchant logos. Use mocked local data — JSON fixtures or
in-memory stores — for any feature that would otherwise need a backend.

Use the spec.md in this project as your source of truth for all screens,
components, and visual rules.
"""


# ──────────────────────────────────────────────
# Dynamic-content prompts (model calls)
# ──────────────────────────────────────────────

_APP_OVERVIEW_PROMPT = """Write 2-3 short paragraphs describing the product, its target user, and
its core value proposition. Base everything on the FRONTEND SPEC below. Do
not mention React Native, iPhone 15, Expo, or any implementation detail —
those are stitched in by a downstream template. Just describe what the app
does and who it's for.

{brand_block}FRONTEND SPEC:
{frontend_spec}
"""

_NAVIGATION_PROMPT = """Document the primary navigation model, route hierarchy, tab structure,
modal layers, drill-down paths, sticky headers, and cross-screen movement
patterns visible in the recording. Base everything on the FRONTEND SPEC
below — do not invent navigation not supported by the recording.

Output exactly one top-level section, starting with the heading
`## Navigation Structure`. No other `##` headings. No preamble.

{brand_block}FRONTEND SPEC:
{frontend_spec}
"""

_SCREENS_PROMPT = """For every distinct screen documented in the FRONTEND SPEC, write a
`### Screen Name` subheading followed by a tight per-screen entry covering:

- purpose
- layout hierarchy from top to bottom
- key modules and sections
- primary actions
- visible empty / loading / error / success states
- motion or transition behavior if visible
- exact spacing, sizing, and alignment when the DESIGN TOKENS block makes
  them clear

Keep each screen under ~250 words. Output exactly one top-level section,
starting with the heading `## Screen Specifications`. Do not introduce any
other top-level `##` headings. Do not preface with explanation.

{brand_block}FRONTEND SPEC:
{frontend_spec}
"""

_COMPONENTS_PROMPT = """The FRONTEND SPEC's DESIGN TOKENS block contains a Component Recipes
section. Reformat that material as a numbered shared-component catalog under
a single `## Shared Components` heading. Number components starting at
`### 1.` and increment without gaps.

For each component, list:
- the screens it appears on
- the exact visual rules — background, text, radius, border, shadow,
  padding, and visible states

Do not invent components not present in the DESIGN TOKENS block. Output
exactly one top-level section starting with `## Shared Components`. No other
`##` headings.

{brand_block}FRONTEND SPEC:
{frontend_spec}
"""

_DESIGN_SYSTEM_PROMPT = """Reformat the DESIGN TOKENS block from the FRONTEND SPEC into the
structure below. Move every concrete value (hex, rgba, px, font weight,
line-height, shadow) verbatim into the corresponding subsection. Do not
invent values; only reorganize what is already in the DESIGN TOKENS block.

Output exactly one top-level section, starting with `## Design System`,
containing these subsections in this order:

### Color Palette
Organize as:
#### Primary
#### Surface & Background
#### Accent
#### Neutral
#### Semantic
Format each color as: Name (`#hex`): functional role description

### Typography
Output a table with exactly these columns:
| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
Then add `### Principles` with 3-5 rationale bullets.

### Spacing & Layout
Output a token table with exactly these columns:
| Token | Value | Usage |
Also note grid system, gutters, page padding, card padding, and major layout
intervals with precise numeric values.

### Component Styles
For each major component: background, text, radius, border, shadow, padding,
and states (`pressed`, `focus`, `disabled`, `selected`).

### Elevation & Depth
| Level | Treatment | Use |

### Responsive Breakpoints
| Name | Width | Key Changes |

### Do's and Don'ts
Two parallel bullet lists. Each item: **Bold principle** — reason it matters.

### Design Principles
5-7 bullets on the visual philosophy of the reference app.

Do not output any other top-level `##` headings. No preamble.

{brand_block}FRONTEND SPEC:
{frontend_spec}
"""


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _build_brand_block(brand_colors: dict | None) -> str:
    if not brand_colors:
        return ""
    return (
        f"BRAND OVERRIDES (apply throughout, replace existing brand colors):\n"
        f"{json.dumps(brand_colors)}\n\n"
    )


def _extract_top_screens(frontend_spec: str, n: int = 5) -> list[str]:
    """Pull up to `n` unique screen names from the vision output, first-seen order."""
    seen: set[str] = set()
    out: list[str] = []
    for match in _SCREEN_HEADER_RE.findall(frontend_spec):
        name = match.strip()
        key = name.lower()
        if key and key not in seen:
            seen.add(key)
            out.append(name)
        if len(out) >= n:
            break
    return out


def _render_top_screens(screens: list[str]) -> str:
    if not screens:
        return "Home, Search, Detail, Profile, Settings"
    return ", ".join(screens[:5])


def _strip_fence(text: str) -> str:
    """Strip a leading/trailing markdown fence if the model wrapped output in one."""
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
# Main entry — drop-in replacement signature for generate_sectioned_spec
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
    """Fast-mode spec generator.

    Same signature, same return shape as generate_sectioned_spec. Persists
    each section to `output_dir` for parity with the full path so disk-level
    diffs work between modes.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    start = time.time()
    call_count = 0
    call_lock = Lock()

    def _bump():
        nonlocal call_count
        with call_lock:
            call_count += 1

    brand_block = _build_brand_block(brand_colors)

    def _call(prompt: str, *, model: str, timeout: int) -> str:
        _bump()
        return local_worker.claude_text(prompt, model=model, timeout=timeout)

    def _overview_task() -> str:
        return _call(
            _APP_OVERVIEW_PROMPT.format(brand_block=brand_block, frontend_spec=frontend_spec),
            model=_HAIKU,
            timeout=300,
        )

    def _nav_task() -> str:
        return _call(
            _NAVIGATION_PROMPT.format(brand_block=brand_block, frontend_spec=frontend_spec),
            model=_SONNET,
            timeout=300,
        )

    def _screens_task() -> str:
        return _call(
            _SCREENS_PROMPT.format(brand_block=brand_block, frontend_spec=frontend_spec),
            model=_SONNET,
            timeout=900,
        )

    def _components_task() -> str:
        return _call(
            _COMPONENTS_PROMPT.format(brand_block=brand_block, frontend_spec=frontend_spec),
            model=_HAIKU,
            timeout=300,
        )

    def _design_task() -> str:
        return _call(
            _DESIGN_SYSTEM_PROMPT.format(brand_block=brand_block, frontend_spec=frontend_spec),
            model=_HAIKU,
            timeout=300,
        )

    local_worker.project_log(project_id, "        [fast] launching 5 section calls in parallel")
    with ThreadPoolExecutor(max_workers=5) as pool:
        f_overview = pool.submit(_overview_task)
        f_nav = pool.submit(_nav_task)
        f_screens = pool.submit(_screens_task)
        f_components = pool.submit(_components_task)
        f_design = pool.submit(_design_task)
        overview_text = _strip_fence(f_overview.result())
        nav_text = _strip_fence(f_nav.result())
        screens_text = _strip_fence(f_screens.result())
        components_text = _strip_fence(f_components.result())
        design_text = _strip_fence(f_design.result())

    section_1 = _SECTION_1_TEMPLATE.format(summary_paragraphs=overview_text)
    section_6 = _SECTION_6_TEMPLATE
    section_7 = _SECTION_7_TEMPLATE.format(
        your_app_name=your_app_name,
        reference_app=reference_app,
        top_screens=_render_top_screens(_extract_top_screens(frontend_spec)),
    )

    sections = [
        ("01-app-overview.md", section_1.rstrip() + "\n"),
        ("02-navigation-structure.md", nav_text.rstrip() + "\n"),
        ("03-screen-specifications.md", screens_text.rstrip() + "\n"),
        ("04-shared-components.md", components_text.rstrip() + "\n"),
        ("05-design-system.md", design_text.rstrip() + "\n"),
        ("06-frontend-implementation-notes.md", section_6.rstrip() + "\n"),
        ("07-claude-code-prompt.md", section_7.rstrip() + "\n"),
    ]
    for filename, content in sections:
        (output_dir / filename).write_text(content, encoding="utf-8")

    header = (
        f"# {your_app_name} — Frontend Specification\n"
        f"> Generated by Spectr | Reference app: {reference_app}"
    )
    body = "\n\n---\n\n".join([header] + [content.rstrip() for _, content in sections])
    assembled = body.strip() + "\n"

    elapsed = time.time() - start
    local_worker.project_log(
        project_id,
        f"        [fast] complete: {elapsed:.1f}s wall, {call_count} claude calls",
    )
    return assembled
