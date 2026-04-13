# Spectr — Claude Context

This file is the accumulated knowledge of this project. Read it fully before touching anything. It exists so you don't have to re-derive decisions that have already been made, don't suggest things that have already been ruled out, and don't optimize for the wrong goals.

---

## What Spectr Is

Spectr turns a screen recording of any mobile app into a production-ready `spec.md` that a developer can paste into Claude Code and build from. The tagline is: **See an app. Ship an app.**

The output is not documentation. It is a blueprint — precise enough that a developer with no prior context on the original app could reconstruct it faithfully. That means exact hex values, exact font sizes, exact spacing, exact component behavior, exact navigation structure. Approximations are failures.

The target user uploads an MP4 of an app they want to clone or draw inspiration from, provides the reference app name, optionally provides brand colors, and receives a `spec.md` that covers screens, design system, navigation, components, and implementation guidance.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 App Router + React 18 + TailwindCSS | Standard, fast to build on |
| Database | Supabase PostgreSQL + Realtime | Realtime subscriptions built-in, no extra infra |
| Storage | Supabase Storage | Same project, same credentials as DB |
| Worker | Python 3.11 + FastAPI | Anthropic SDK is best-supported in Python; ffmpeg easier to shell out from Python |
| Vision | Claude Vision (Haiku 4.5 by default) | Cost-efficient for high-volume frame analysis |
| Spec generation | Claude (Sonnet 4.6 by default) | Best output quality for long-form structured markdown |
| Deployment | Vercel (frontend) + Railway (worker) | Vercel for Next.js, Railway because it handles ffmpeg without Docker complexity |

---

## Architecture

### Data Flow

```
User uploads MP4 + app name
  → POST /api/projects (Next.js API route)
    → Supabase: insert project row (status: pending)
    → triggerWorker(): POST {WORKER_URL}/run with project_id
  → Worker: process_project_spec(project_id)
    → [1/3] Extract frames (ffmpeg scene-change → dedup → cap 48)
    → [2/3] Analyze frontend (parallel vision batches: screens + design tokens)
    → [3/3] Generate spec.md (7 sections in 2 parallel lanes → assemble → validate → upload)
  → Supabase Realtime: frontend subscribes, updates UI in real time
  → User downloads spec.md or bundle.zip
```

### Separation of Concerns

- **Frontend** knows nothing about Claude or ffmpeg. It creates projects, triggers the worker, and renders output.
- **Worker** knows nothing about the UI. It reads from Supabase, writes back to Supabase, and logs progress.
- **Supabase** is the source of truth and the message bus between the two.

This separation is intentional and load-bearing. Do not blur it. The worker can be restarted, redeployed, or swapped without touching the frontend, and vice versa.

---

## The Processing Pipeline in Detail

All processing logic lives in `worker/local_worker.py`. This is the most important file in the project.

### Stage 1: Frame Extraction

1. Download MP4 from Supabase Storage
2. If >50MB, compress with ffmpeg (H.264 CRF28, 1280px max, 30fps)
3. Extract frames using ffmpeg scene-change detection (threshold: 0.15)
4. If scene detection yields too few frames, fall back to 1fps extraction
5. Deduplicate using perceptual hashing (pHash, threshold distance: 6)
6. Cap at 48 unique frames (configurable via `MAX_FRAMES` env var)

**Why scene-change detection instead of 1fps:**
Screen recordings have long static periods (user reading, loading states). 1fps generates hundreds of near-identical frames that waste token budget and slow processing. Scene detection captures ~5-15x fewer frames while catching every meaningful UI transition.

**Why cap at 48 frames:**
Vision batches are 25 frames each. 48 frames = 2 batches, which runs in parallel. More frames means more cost and more time with diminishing returns — most apps show all their unique screens within 48 well-chosen frames.

### Stage 2: Vision Analysis

Two parallel passes run simultaneously, each receiving all frame batches:

**Pass 1 — Screen Analysis (PROMPT_1)**
- Role: expert reverse-engineer
- Output: per-screen documentation — name, purpose, route, layout, components, data, navigation, states, UX notes
- Format: `## Screen: [Name]` headers

**Pass 2 — Design Tokens (PROMPT_1B)**
- Role: senior designer extracting design tokens
- Output: 9-section design reference — theme, color palette, typography, components, layout, depth/elevation, dos/don'ts, responsive rules, cheat sheet
- Format: exact values — hex codes, px sizes, font weights, not descriptions

Both passes run in batches of 25 frames. Each batch runs concurrently (up to 4 workers). Failed batches retry 3x with exponential backoff.

### Stage 3: Spec Generation

7 sections generated in 2 parallel lanes:

| Section | Key |
|---|---|
| App Overview | `app_overview` |
| Navigation Architecture | `navigation` |
| Screen Specifications | `screens` |
| Component Library | `components` |
| Design System | `design_system` |
| Implementation Notes | `implementation_notes` |
| Claude Code Prompt | `claude_code_prompt` |

Each section is validated against required headings and substrings before acceptance. If validation fails, it retries 3x. If all retries fail, a placeholder is inserted and processing continues — partial spec is better than total failure.

Sections are assembled with `---` separators into the final `spec.md`.

---

## Prompts

Prompts live in `worker/prompts/`. Never inline prompts directly in `local_worker.py`.

### screen_analysis.py
`PROMPT_1_SYSTEM` and `PROMPT_1_USER` — vision prompt for screen documentation. Instructs Claude to treat each frame as an expert reverse-engineer would: name every component, describe every state, document every data field visible.

### design_tokens.py
`PROMPT_1B_SYSTEM` and `PROMPT_1B_USER` — vision prompt for design token extraction. Instructs Claude to produce exact numeric values. "Blue primary" is not acceptable output. `#1A73E8` is.

### legacy_spec.py
Contains `PROMPT_3_SYSTEM`, `PROMPT_3_USER`, `SPEC_SECTION_DEFINITIONS`, `build_spec_section_prompt()`, and `SPEC_SECTION_SYSTEM`. These drive the spec section generation stage. Also contains deprecated `PROMPT_2_*` prompts (backend research pass) — kept for compatibility, not used in the active pipeline.

**PROMPT_3_SYSTEM** is the most consequential prompt in the project. It sets the spec writing role (React Native/Expo focus, no backend, precise numeric values only). Changes here affect every spec generated.

---

## Claude Interface Layer

The worker supports two modes, auto-selected at runtime:

- **SDK mode**: if `ANTHROPIC_API_KEY` is set, uses `anthropic` Python package directly
- **CLI mode**: if no API key, shells out to `claude` CLI subprocess

Both modes expose the same interface: `claude_text()` and `claude_vision()`. All pipeline code calls these functions — never the SDK or CLI directly. This abstraction exists so local development (using a Claude subscription via CLI) works identically to production (using API key).

Do not break this abstraction. Do not add SDK-specific or CLI-specific logic outside of the `_claude_*_sdk()` and `_claude_*_cli()` private functions.

---

## Frontend Architecture

### Key Pages

- `/` — Landing page. Static marketing, hero, animated stat cards.
- `/app` — Upload form. UploadZone + BrandingForm + submission to `/api/projects`.
- `/app/projects` — Project list. Server-rendered, last 50 projects.
- `/app/projects/[id]` — Project detail. Realtime status, log polling, download links.

### Progress Tracking

`StatusTracker.tsx` is the most complex component. It:
- Subscribes to Supabase Realtime for project status updates
- Polls `/api/projects/[id]/logs` every 2 seconds during processing
- Parses worker log lines to extract batch counts and timestamps
- Calculates ETA from batch progress patterns
- Renders animated progress bar (eases toward target, never overshoots ceiling)
- Supports two pipeline modes: "legacy" (3-stage) and "new" (8-stage)

The progress bar animation is CSS-driven with a floating dot indicator. Do not replace it with a simple `width` transition — the easing behavior was deliberately tuned.

### Realtime Updates

Project detail page subscribes to `postgres_changes` on the `projects` table via Supabase Realtime. Status updates flow automatically without polling the DB. Log content is separate and does poll (`/api/projects/[id]/logs` every 2s) because logs are stored in worker memory, not the DB.

---

## Database Schema

```sql
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status          TEXT NOT NULL DEFAULT 'pending',
  reference_app   TEXT NOT NULL,
  your_app_name   TEXT,
  brand_colors    JSONB,
  mp4_s3_key      TEXT,
  spec_md_s3_key  TEXT,
  bundle_s3_key   TEXT,
  screen_analysis JSONB,
  frontend_spec   TEXT,
  spec_md_text    TEXT,
  frame_count     INT,
  error_text      TEXT,
  repair_attempts INT DEFAULT 0,
  total_retries   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

`frontend_spec` stores the concatenated vision analysis output (both PROMPT_1 and PROMPT_1B). It is used as input to spec section generation. Storing it in the DB allows the pipeline to resume at Stage 3 without re-running vision analysis.

`update_project()` in the worker uses `upsert` and auto-detects column existence from the schema to avoid errors on missing columns. Do not bypass this with raw SQL inserts.

---

## Status Values

Defined in `worker/constants.py`:

```
pending → extracting → analyzing_screens → analyzing_transitions →
synthesizing_schema → generating_backend → generating_frontend →
validating → repairing → bundling → complete / failed
```

Not all statuses are used in the current pipeline. `analyzing_transitions`, `synthesizing_schema`, `generating_backend` are reserved for a future multi-pass pipeline. The active pipeline uses: `pending → extracting → analyzing_screens → generating_frontend → complete / failed`.

The frontend `StatusTracker` component handles both the legacy 3-stage set and the full 8-stage set. When adding new statuses, update both `constants.py` and `lib/types.ts`.

---

## Environment Variables

### Worker
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | DB + storage connection |
| `SUPABASE_SERVICE_KEY` | Yes | — | Service role key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | No | — | If set, uses SDK; else uses CLI |
| `WORKER_WEBHOOK_SECRET` | Yes | — | Validates `/run` and `/logs` requests |
| `VISION_MODEL` | No | haiku-4-5-20251001 | Model for frame analysis |
| `STITCH_MODEL` | No | claude-sonnet-4-6 | Model for spec generation |
| `MAX_FRAMES` | No | 48 | Cap on unique frames kept |
| `FRAME_BATCH_SIZE` | No | 25 | Frames per vision API call |
| `SPEC_LANE_WORKERS` | No | 2 | Parallel spec section lanes |
| `SPEC_ANALYSIS_WORKERS` | No | 2 | Parallel vision passes |
| `SCENE_THRESHOLD` | No | 0.15 | ffmpeg scene-change sensitivity |
| `COMPRESS_THRESHOLD_MB` | No | 50 | Video compression trigger |

### Frontend
| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client-side DB connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client-side read-only access |
| `SUPABASE_SERVICE_KEY` | Yes | Server-side API routes (full access) |
| `WORKER_URL` | Yes | Worker endpoint for triggering runs |
| `WORKER_WEBHOOK_SECRET` | Yes | Shared secret for worker requests |

---

## Output Quality Standard

A spec.md is good if a developer with no prior knowledge of the reference app could build a faithful clone from it alone. This means:

- Every screen documented with name, purpose, route, layout, all visible components
- Every component documented with exact props, states, and visual behavior
- Color palette with exact hex values — no descriptions like "blue" or "dark gray"
- Typography with exact font family, size (px), weight, line height, letter spacing per style
- Spacing and layout with exact pixel values or Tailwind equivalents
- Navigation structure with exact transitions and gesture behaviors
- Every loading state, empty state, and error state documented
- A Claude Code prompt at the end that, when used, produces code that matches the spec

If any of these are missing or approximate, the spec is incomplete. The self-critique pass (PROMPT_4, not yet implemented) should flag these gaps.

---

## What Not To Do

**Do not add a backend research pass back into the active pipeline.**
`PROMPT_2_*` (web research via Claude web search) was removed from the active pipeline because it added significant latency and the output quality didn't justify it. The prompts are kept in `legacy_spec.py` for reference. Do not re-enable without a clear reason.

**Do not replace the dual Claude interface with SDK-only.**
Local development relies on the CLI fallback. Removing it breaks local dev entirely.

**Do not inline prompts in `local_worker.py`.**
All prompts belong in `worker/prompts/`. The separation exists so prompts can be edited, versioned, and eventually A/B tested without touching pipeline logic.

**Do not add synchronous blocking calls in the FastAPI routes.**
The worker uses FastAPI background tasks for processing. The `/run` endpoint returns immediately and processing happens asynchronously. Blocking the route would cause Railway to think the worker is unresponsive.

**Do not reduce spec section count below 7.**
The 7-section structure is the core output contract. The frontend renders download links and preview based on the assembled `spec.md`. Changing the section count or order requires coordinated changes to section definitions, assembly logic, and frontend rendering.

**Do not use approximate values in prompts.**
Every prompt instruction that could produce vague output should specify that exact values are required. "Document the color" is wrong. "Document the exact hex color code" is right.

**Do not skip the validation pass on spec sections.**
Each section is validated against required headings and substrings before acceptance. This is the quality gate. Bypassing it produces specs that look complete but are missing critical content.

---

## Local Development

### Start the worker locally
```bash
cd worker
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Process a specific project manually
```bash
cd worker
python local_worker.py --project-id <uuid>
```

### Extract frames locally (for testing prompts)
```bash
cd worker
python extract.py --mp4 path/to/recording.mp4 --app "AppName"
# Outputs frames/ folder + .spectr_meta file
# Drag frames/ into Claude Code and run /spectr skill
```

### Run the frontend
```bash
cd frontend
npm install
npm run dev
```

Set `WORKER_URL=http://localhost:8001` in frontend `.env.local` for local worker.

---

## Current State of the Codebase

- The active pipeline is the 3-stage spec-only flow (`extracting → analyzing_screens → generating_frontend → complete`)
- `local_worker.py` has `process_project_spec()` as the primary entry point
- The 8-stage status values in `constants.py` are defined but only partially used — they exist for a planned future expansion of the pipeline
- `worker/local_worker.py` is ~880 lines — the largest file and the most likely source of bugs
- `extract.py` is a standalone CLI tool for local frame extraction, separate from the main processing pipeline
- The `/spectr` skill (Claude Code skill) is a separate entry point for local spec generation from pre-extracted frames

---

## Files to Know First

When starting any task, read these files before making changes:

1. `worker/local_worker.py` — all pipeline logic
2. `worker/prompts/screen_analysis.py` — vision prompt for screens
3. `worker/prompts/design_tokens.py` — vision prompt for design tokens
4. `worker/prompts/legacy_spec.py` — spec section definitions + prompts
5. `frontend/src/lib/types.ts` — all TypeScript types including status enums
6. `frontend/src/components/StatusTracker.tsx` — realtime progress UI
7. `supabase/schema.sql` — database schema
