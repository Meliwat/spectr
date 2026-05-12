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

If you have **Claude Code** installed and logged in (`claude login`), the MCP runs on your existing Claude subscription — no API key needed.

### Claude Code

```bash
claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp
```

Or for local development against this repo:

```bash
claude mcp add spectr -- uvx --from /path/to/spectr spectr-mcp
```

### Other clients (Cursor, Codex, custom)

Any client that supports MCP stdio servers can launch:

```bash
uvx --from git+https://github.com/Meliwat/spectr spectr-mcp
```

If you don't have the `claude` CLI installed and authenticated, the MCP needs an `ANTHROPIC_API_KEY` instead — set it in the launching process's environment.

## Requirements

- **Python ≥ 3.10** (installed automatically by `uvx`).
- **One of**:
  - **The `claude` CLI** (free path — uses your existing Claude Pro / Max subscription). Install from [claude.com/product/claude-code](https://www.claude.com/product/claude-code), run `claude login` once, you're done.
  - **`ANTHROPIC_API_KEY`** in env (token-billed path — set it when you want to pay Anthropic directly by token).
- **`ffmpeg`** — only required when passing an MP4 path; not needed for App Store URLs.

The MCP auto-selects: API key wins if both are present (faster than CLI subprocess).

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

**With Claude Code subscription (CLI path):** specs are billed against your Claude Pro / Max plan's normal usage allowance. No per-spec charge from Spectr or Anthropic beyond your existing subscription.

**With `ANTHROPIC_API_KEY` (SDK path):** you pay Anthropic by token. Rough numbers per spec at the default `max_frames=20`:

- Vision (20 frames × 2 passes via Haiku): ~$0.10–0.20
- Spec generation (7 sections via Sonnet, with prompt caching): ~$0.50–1.00
- Total: typically **$0.60–1.20 per spec**

Raising `max_frames` past 20 increases vision cost roughly linearly. `max_frames=48` (the old default) runs about $1.40–2.00 per spec.

The hosted version at [spectr.to](https://spectr.to) (coming back soon) charges $19 per spec and includes the pipeline, hosting, storage, retries, and the realtime progress UI.

## License

MIT
