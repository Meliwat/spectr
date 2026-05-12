# spectr-mcp

MCP server that exposes [Spectr](https://spectr.to)'s spec-generation pipeline as a tool any MCP client can call. Hand it an App Store URL or a local MP4 of an app, get back a production-ready `spec.md` precise enough to build a clone from.

```
See an app. Ship an app.
```

## What it does

One tool, `generate_spec(source, ...)`:

- **`source`** — an App Store URL (e.g. `https://apps.apple.com/us/app/doordash/id719972451`) or an absolute path to a local MP4 screen recording.
- Returns a structured 7-section markdown spec covering app overview, navigation, screens, components, design system (with exact hex/px/weight values), implementation notes, and a Claude Code prompt the developer can paste.
- Targets Expo SDK 54 / React Native / iPhone 15 baseline.

Typical run: 2–5 min for App Store URLs, 5–10 min for MP4 recordings.

## Install

You bring your own Anthropic key. Pipeline costs are billed to your account, not Spectr's.

### Claude Code

```bash
claude mcp add spectr \
  --env ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp
```

Or for local development against this repo:

```bash
claude mcp add spectr \
  --env ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -- uvx --from /path/to/spectr spectr-mcp
```

### Other clients (Cursor, Codex, custom)

Any client that supports MCP stdio servers can launch:

```bash
uvx --from git+https://github.com/Meliwat/spectr spectr-mcp
```

Set `ANTHROPIC_API_KEY` in the launching process's environment.

## Requirements

- **Python ≥ 3.10** (installed automatically by `uvx`)
- **`ANTHROPIC_API_KEY`** — required. The fallback to the `claude` CLI doesn't reliably work inside MCP subprocesses (no keychain access).
- **`ffmpeg`** — only required when passing an MP4 path; not needed for App Store URLs

## Usage from inside Claude Code

```
> Generate a spec from https://apps.apple.com/us/app/doordash/id719972451 and write it to ./doordash-spec.md
```

Claude Code will pick the tool, call it, and write the file. The tool returns a short confirmation summary so your context window stays small.

For MP4 input:

```
> Generate a spec from /Users/me/Desktop/recording.mp4 for the app "Linear"
```

The `reference_app` parameter is required for MP4 input (the tool has no way to detect the app name otherwise).

## Cost

You pay Anthropic directly for vision + text tokens. Rough numbers per spec at the default `max_frames=20`:

- Vision (20 frames × 2 passes via Haiku): ~$0.10–0.20
- Spec generation (7 sections via Sonnet, with prompt caching): ~$0.50–1.00
- Total: typically **$0.60–1.20 per spec**

Raising `max_frames` past 20 increases vision cost roughly linearly. `max_frames=48` (the old default) runs about $1.40–2.00 per spec.

The hosted version at [spectr.to](https://spectr.to) charges $19 per spec and includes the pipeline, hosting, storage, retries, and the realtime progress UI.

## License

MIT
