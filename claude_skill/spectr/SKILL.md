---
name: spectr
description: Turn a screen recording (.mp4 / .mov / .m4v) into a production-ready DESIGN.md — 10 sections, exact hex codes, exact font weights, exact spacing, every screen folded in. Drop-in compatible with the awesome-ios-design-md gallery format. Use when the user has dropped a screen recording in chat and wants to clone or document the app.
---

# Spectr — screen recording → DESIGN.md

You are running the Spectr pipeline. The user has provided a screen recording of an iOS app and wants a developer-ready design spec in the canonical "Awesome iOS DESIGN.md" format.

## When to use this skill

Trigger when the user:
- Drops a `.mp4`, `.mov`, or `.m4v` file in chat
- Mentions a screen recording they want "specced" or "documented" or "cloned"
- Asks to generate a DESIGN.md (or spec) from a video
- Mentions Spectr explicitly

If the user has only screenshots (no video), tell them this skill is for screen recordings specifically and point them at the Spectr CLI's frame-based mode instead.

## How it works

The pipeline is wrapped by the `spectr-cli` Python entry point, which is the same code path as the Spectr MCP server. The skill's job is to run it, then read the resulting `DESIGN.md` back so you can summarize what landed.

### Step 1 — Confirm the inputs

You need two things before running:
- The path to the recording (Bash: confirm it exists, is a video file)
- The **reference app name** — the name of the app shown in the recording (e.g. "Duolingo", "DoorDash", "Spotify"). Ask the user if it's not obvious from context.

### Step 2 — Run `spectr-cli`

Run via Bash. `uvx` resolves and runs the latest CLI from PyPI. The first run installs ffmpeg-python and the worker dependencies into an isolated venv (~30 sec). Subsequent runs are instant.

```
uvx --from spectr-mcp spectr-cli generate \
  "<path-to-recording>" \
  --app "<reference-app-name>" \
  --output ./DESIGN.md
```

**CRITICAL: Pass `timeout: 600000` (10 minutes — the Bash tool maximum) when invoking the command.** The pipeline takes **2–4 minutes** for a typical recording; the Bash tool's default 2-minute timeout will kill it mid-run and leave you with no DESIGN.md. Without an explicit timeout you will see the command get cancelled at the 2-minute mark with no output. Always set the timeout.

The pipeline runs ffmpeg for frame extraction, two parallel Claude vision passes for screen + design-token analysis, then one comprehensive Sonnet call that produces the full 10-section DESIGN.md in one coherent pass. Tell the user up front it will take 2–4 minutes so they don't think the tool is hung.

While it runs, the CLI logs progress to stderr. Surface the highlights to the user (frame count, vision-pass status, DESIGN.md byte count).

### Step 3 — Read the DESIGN.md back

When the CLI finishes, the DESIGN.md is on disk at the `--output` path. Read it with the Read tool, then give the user a brief summary:
- App name and section list
- Notable findings (signature color palette, font family, key components)
- Where the file landed

Don't dump the entire DESIGN.md inline — it's typically 25–35 KB. Summarize and point at the file.

### Step 4 — Offer the natural next step

Most users want to actually build the clone. After delivering the DESIGN.md, offer:
> "The DESIGN.md is at `./DESIGN.md`. Want me to scaffold an Expo / React Native (or SwiftUI) project that follows it?"

If they say yes, read the DESIGN.md fully and start scaffolding from the design tokens, typography, and screen inventory.

## Requirements

The skill requires:
- **`ffmpeg`** on `PATH` (for frame extraction). On macOS: `brew install ffmpeg`. On Linux: apt/dnf install. If missing, the CLI's first run will fail and emit an actionable error.
- **`uv` / `uvx`** on `PATH` (for the one-line installer). On macOS: `brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`.
- **The `claude` CLI logged in** — the pipeline uses the user's Claude subscription for vision + DESIGN.md generation. No API key required. If the user has `ANTHROPIC_API_KEY` set, the SDK path takes over instead.

If any of these are missing, surface the install commands and ask the user to run them before trying again.

## What the output DESIGN.md contains

Ten numbered sections in the canonical "Awesome iOS DESIGN.md" format:

1. **Visual Theme & Atmosphere** — mood, contrast model, signature moves, key characteristics
2. **Color Palette & Roles** — Primary, Surface/Background, Text, Semantic, Dark Mode
3. **Typography Rules** — font family, hierarchy table, principles
4. **Component Stylings** — Buttons, Cards, Inputs, Lists, Nav, Tab Bars, Modals, etc.
5. **Screen Inventory & Patterns** — every screen visible in the recording, with layout / modules / actions / states / motion, plus a Shared Patterns subsection
6. **Layout & Spacing** — spacing scale, grid, padding tokens
7. **Depth & Elevation** — level / treatment / use table with principles
8. **Dos and Don'ts** — Do / Don't bullet lists with bold-principle format
9. **Responsive / Adaptive Rules** — Mobile Standard / Larger Phones / iPad table with principles
10. **Quick Reference Cheat Sheet** — compact build-oriented lookup

Total: typically 25–35 KB of structured markdown — drop-in compatible with the [awesome-ios-design-md](https://github.com/Meliwat/awesome-ios-design-md) gallery format.

## Errors to handle gracefully

- **`ffmpeg not found`** → tell the user to install ffmpeg, then re-run
- **`uvx not found`** → tell the user to install `uv` first
- **`claude CLI not authenticated and no ANTHROPIC_API_KEY`** → tell the user to run `claude login` or set the env var
- **`Pipeline produced zero frames`** → the recording is corrupt or too short; suggest a longer / cleaner recording
- **`Vision passes returned empty`** → likely network or auth issue; surface the underlying error from the CLI's stderr
- **`DESIGN.md generation returned empty content`** → Sonnet returned an empty response; rerun (transient) and if it persists, surface the underlying error

Do not silently swallow failures. If the CLI exits non-zero, show the user the stderr output verbatim and the suggested fix.
