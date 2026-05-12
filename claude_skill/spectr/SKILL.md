---
name: spectr
description: Turn a screen recording (.mp4 / .mov / .m4v) into a production-ready spec.md — 7 sections, exact hex codes, exact font weights, exact spacing. Use when the user has dropped a screen recording in chat and wants to clone or document the app.
---

# Spectr — screen recording → spec.md

You are running the Spectr pipeline. The user has provided a screen recording of an iOS app and wants a developer-ready spec.

## When to use this skill

Trigger when the user:
- Drops a `.mp4`, `.mov`, or `.m4v` file in chat
- Mentions a screen recording they want "specced" or "documented" or "cloned"
- Asks to generate a spec from a video
- Mentions Spectr explicitly

If the user has only screenshots (no video), tell them this skill is for screen recordings specifically and point them at the Spectr CLI's frame-based mode instead.

## How it works

The pipeline is wrapped by the `spectr-cli` Python entry point, which is the same code path as the Spectr MCP server. The skill's job is to run it, then read the resulting `spec.md` back so you can summarize what landed.

### Step 1 — Confirm the inputs

You need two things before running:
- The path to the recording (Bash: confirm it exists, is a video file)
- The **reference app name** — the name of the app shown in the recording (e.g. "Duolingo", "DoorDash", "Spotify"). Ask the user if it's not obvious from context.

Optional, only if the user supplies them:
- A clone name (`--your-app`) — defaults to the reference app
- Brand colors JSON (`--brand-colors`) — overrides the source app's palette in the spec

### Step 2 — Run `spectr-cli`

Run via Bash. `uvx` resolves and runs the latest CLI from PyPI. The first run installs ffmpeg-python and the worker dependencies into an isolated venv (~30 sec). Subsequent runs are instant.

```
uvx --from spectr-mcp spectr-cli generate \
  "<path-to-recording>" \
  --app "<reference-app-name>" \
  --output ./spec.md
```

The pipeline takes **5–10 minutes** for a typical recording. It runs ffmpeg for frame extraction, two parallel Claude vision passes for screen + design-token analysis, then 7 spec-section generations in parallel. Tell the user this up front so they don't think the tool is hung.

While it runs, the CLI logs progress to stderr. Surface the highlights to the user (frame count, vision-pass status, section count).

### Step 3 — Read the spec.md back

When the CLI finishes, the spec.md is on disk at the `--output` path. Read it with the Read tool, then give the user a brief summary:
- App name and section count
- Notable findings (color palette, font choices, navigation pattern)
- Where the file landed

Don't dump the entire spec.md inline — it's 80–150KB. Summarize and point at the file.

### Step 4 — Offer the natural next step

Most users want to actually build the clone. After delivering the spec, offer:
> "The spec is at `./spec.md`. Want me to scaffold an Expo / React Native project that follows it?"

If they say yes, read the spec.md fully (it has a built-in Claude Code prompt in the last section) and start scaffolding.

## Requirements

The skill requires:
- **`ffmpeg`** on `PATH` (for frame extraction). On macOS: `brew install ffmpeg`. On Linux: apt/dnf install. If missing, the CLI's first run will fail and emit an actionable error.
- **`uv` / `uvx`** on `PATH` (for the one-line installer). On macOS: `brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`.
- **The `claude` CLI logged in** — the pipeline uses the user's Claude subscription for vision + spec generation. No API key required. If the user has `ANTHROPIC_API_KEY` set, the SDK path takes over instead.

If any of these are missing, surface the install commands and ask the user to run them before trying again.

## What the output spec contains

Seven sections, in order, each its own heading:

1. **App Overview** — what the app is, who it serves, primary value prop
2. **Navigation Architecture** — tab structure, modals, screen graph
3. **Screen Specifications** — every screen visible in the recording, with layout, components, states
4. **Component Library** — reusable UI pieces, props, states
5. **Design System** — exact hex codes, font families/sizes/weights/line-heights, spacing scale, radius/shadow tokens
6. **Implementation Notes** — gotchas, edge cases, Expo / RN baseline assumptions
7. **Claude Code Prompt** — a ready-to-paste prompt for the developer to start building

Total: roughly 80–150 KB of structured markdown. Big enough to be complete, small enough to fit in a Claude Code context window.

## Errors to handle gracefully

- **`ffmpeg not found`** → tell the user to install ffmpeg, then re-run
- **`uvx not found`** → tell the user to install `uv` first
- **`claude CLI not authenticated and no ANTHROPIC_API_KEY`** → tell the user to run `claude login` or set the env var
- **`Pipeline produced zero frames`** → the recording is corrupt or too short; suggest a longer / cleaner recording
- **`Vision passes returned empty`** → likely network or auth issue; surface the underlying error from the CLI's stderr

Do not silently swallow failures. If the CLI exits non-zero, show the user the stderr output verbatim and the suggested fix.
