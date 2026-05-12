<div align="center">

<img src="assets/spectr-identity.gif" alt="Spectr" width="640" />

### See an app. Ship an app.

Turn a screen recording of any iOS app into a production-ready `spec.md` — exact hex codes, exact font weights, every screen state.<br/>
Drop it into Claude Code and build the clone.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-339933.svg)](https://nodejs.org/)
[![Built for Claude Code](https://img.shields.io/badge/built%20for-Claude%20Code-D97757.svg)](https://claude.com/claude-code)
[![MCP](https://img.shields.io/badge/MCP-compatible-7C3AED.svg)](https://modelcontextprotocol.io/)

[**spectr.to**](https://www.spectr.to) · [**Gallery**](https://www.spectr.to/gallery) · [**Docs**](#how-it-works)

</div>

---

## What it does

Spectr watches a screen recording the way a senior product engineer would, then writes down everything it sees in seven sections:

| Section | What it covers |
|---|---|
| **App Overview** | What the app is, who it serves, primary value prop |
| **Navigation Architecture** | Tab structure, modals, screen graph |
| **Screen Specifications** | Every screen visible, with layout, components, states |
| **Component Library** | Reusable UI pieces, props, states |
| **Design System** | Exact hex codes, font families/sizes/weights, spacing scale, radius/shadow tokens |
| **Implementation Notes** | Gotchas, edge cases, Expo / RN baseline assumptions |
| **Claude Code Prompt** | A ready-to-paste prompt to start building |

The output targets **Expo SDK 54 / React Native / iPhone 15 baseline** by default. Roughly 80–150 KB of structured markdown — big enough to be complete, small enough to fit in a Claude Code context window.

---

## Quick start

Three ways to install. Pick one — they all share the same vision pipeline and write the same spec.

### 1. MCP server (recommended for Claude Code)

```bash
claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp
```

Then in any Claude Code conversation, drop an `.mp4` and ask Claude to spec it. Runs on **your** Claude subscription — no API key required.

### 2. CLI

```bash
npx -y spectr-cli generate ./recording.mp4 --app "Duolingo"
```

Or install globally:

```bash
npm install -g spectr-cli
spectr generate ./recording.mp4 --app "Duolingo"
```

### 3. Claude Code skill

```bash
npx -y spectr-cli install-skill
```

Drops a `SKILL.md` into `~/.claude/skills/spectr/`. Mention "spec it" or "use Spectr" in any Claude Code conversation with a recording attached and Claude picks up the skill automatically.

---

## Requirements

- **Node 18+** (for the CLI / skill installer)
- **Python 3.10+** + [`uv`](https://docs.astral.sh/uv/) (for the MCP / pipeline)
- **`ffmpeg`** on `PATH` — `brew install ffmpeg` on macOS
- **Authenticated `claude` CLI** *or* `ANTHROPIC_API_KEY` in env

Spectr never asks for an API key directly. It uses the credentials already on your machine.

---

## How it works

```
Screen recording (.mp4 / .mov)
        │
        ▼
┌───────────────────────────────────────┐
│ 1. Frame extraction                   │
│    ffmpeg scene-change → pHash dedup  │
│    → 20 unique frames                 │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 2. Vision analysis (parallel)         │
│    • Screen documentation (Haiku)     │
│    • Design token extraction (Haiku)  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 3. Spec generation (4 lanes parallel) │
│    7 sections (Sonnet)                │
│    → validate → assemble              │
└───────────────────────────────────────┘
        │
        ▼
   spec.md (~80–150 KB)
```

Typical run: **5–10 minutes** for a 30–60 second recording. Cost on your own Anthropic key: **~$0.60–$1.20 per spec** at default settings (or $0 on a Claude Pro/Max subscription via the CLI).

The pipeline is deliberately frame-driven, not transcript-driven. Screen recordings have long static periods (loading, reading) — scene-change detection captures every meaningful UI transition while skipping the noise. Perceptual hashing then dedupes near-identical frames so the vision model only sees what's actually new.

---

## Repository layout

```
spectr/
├── bin/spectr.js          # Node CLI wrapper (npm/npx entry point)
├── spectr_mcp/            # Python MCP server + standalone CLI
│   ├── server.py          # FastMCP stdio + streamable-http transports
│   ├── cli.py             # spectr-cli generate <mp4>
│   └── pipeline.py        # DB-free orchestrator (calls worker.local_worker)
├── worker/                # Vision pipeline + prompts
│   ├── local_worker.py    # All processing logic
│   └── prompts/           # screen_analysis, design_tokens, legacy_spec
├── claude_skill/spectr/   # SKILL.md for Claude Code
├── mcp_server/            # Dockerfile for hosted streamable-http MCP
├── frontend/              # Next.js 14 app (powers spectr.to)
└── supabase/              # Schema + migrations for the hosted product
```

The worker pipeline is the heart of the project. Everything else — MCP, CLI, skill, web UI — is a different shape of the same vision passes.

---

## Self-hosting the web product

The hosted product at [spectr.to](https://www.spectr.to) is the same code. To run it yourself:

```bash
# Frontend
cd frontend && npm install && npm run dev

# Worker (separate terminal)
cd worker && pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Set `WORKER_URL=http://localhost:8001` in `frontend/.env.local` and fill the rest from [`.env.example`](.env.example).

Stack:

- **Frontend:** Next.js 14 App Router + Tailwind → Vercel
- **Worker:** Python 3.11 + FastAPI + ffmpeg → Railway (auto-deploys via [`worker/nixpacks.toml`](worker/nixpacks.toml))
- **DB + storage + realtime:** Supabase — run [`supabase/schema.sql`](supabase/schema.sql) on a new project, create a `spectr-uploads` bucket, enable Realtime on `projects`

---

## Contributing

Issues and PRs welcome. A few principles to follow:

- **Don't bypass `_resize_frame_for_api()`** — Claude's vision API rejects images larger than 2000px in multi-image batches. Every frame goes through the resizer.
- **Keep prompts in `worker/prompts/`** — never inline them in `local_worker.py`.
- **Preserve the dual Claude interface (`claude_text()` / `claude_vision()`)** — both CLI and SDK paths must work.
- **Spec sections are 7, in order.** Changing the count or order is a coordinated change across `legacy_spec.py`, assembly logic, and frontend rendering.

See open issues for ideas, or open one to propose changes.

---

## License

[MIT](LICENSE). Use it, fork it, ship from it.

---

<div align="center">

Built with [Claude](https://claude.com) · [spectr.to](https://www.spectr.to)

</div>
