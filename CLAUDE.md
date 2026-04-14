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

## Output Bundle Contents

The `bundle.zip` download contains:
- `spec.md` — the 7-section spec assembled by the pipeline
- `.env.example` — auto-detected service keys based on UI signals (auth → Supabase, payments → Stripe, AI → OpenAI)
- `setup.sh` — one-command environment scaffolding script

The `spec.md` alone is the core deliverable. The bundle adds scaffolding helpers.

---

## Target Output Stack

The entire pipeline produces specs targeting **Expo SDK 54 / React Native / iPhone 15 baseline**. This is not configurable — `PROMPT_3_SYSTEM` hardcodes this context, and the `claude_code_prompt` section instructs Claude Code to build Expo/React Native apps specifically. The product is a mobile-only spec generator. Do not position it as generating backend or web code.

---

## Waitlist Video Upload Feature

Before the product opens to the public, the landing page collects waitlist signups with an MP4 upload. This is a lightweight pre-launch data collection flow, not the main pipeline.

### Flow

1. **Screen 1 — Upload**: Dedicated page at `/waitlist` (`app/waitlist/page.tsx` + `WaitlistClient.tsx`). Neon wordmark → badge → headline → subcopy → upload card → social proof strip. The **phone-framed demo video** is pinned absolutely to the right side of the viewport (212px wide on desktop, 168px on ≥768px, hidden below 960px) so it doesn't compete with the upload CTA on small screens. Drag/drop zone. Validates MP4. "Get Free Blueprint" button uploads the video directly to Supabase Storage (`waitlist-videos` bucket, private) via `POST /api/waitlist/upload`. Shows loading state during upload, then transitions to Screen 2.
2. **Screen 2 — Email**: Full-page transition after upload succeeds. "Your blueprint is being prepared" heading, email input, submit. `POST /api/waitlist` stores `{email, video_s3_key, video_filename}` in the `waitlist` table and sends a Resend notification to muhammedeliwat@gmail.com.

### Demo Video Assets

The phone-framed looping preview on Screen 1 uses:
- `frontend/public/demo/spectr-demo.mp4` — 1.6 MB, H.264, 30fps, audio stripped, faststart-muxed
- `frontend/public/demo/spectr-demo-poster.jpg` — ~50 KB first-frame poster so initial paint isn't black

To regenerate: transcode source to H.264 CRF, strip audio, 30fps, add `-movflags faststart`. The `<video>` element must carry all four attributes — `autoPlay muted loop playsInline` — or iOS Safari fullscreens the video on tap instead of autoplaying inline.

### Admin Dashboard (`/admin`)

Server-rendered. Protected by `ADMIN_SECRET` env var — access via `/admin?key=<ADMIN_SECRET>`. Shows a table of all waitlist rows: email, filename (signed URL for direct video download), timestamp, status badge. "Mark fulfilled" button per row (`PATCH /api/admin/fulfill`). CSV export.

### Supabase Changes

- `waitlist-videos` storage bucket — private, signed URLs used for admin downloads
- `waitlist` table gains three columns: `video_s3_key TEXT`, `video_filename TEXT`, `status TEXT DEFAULT 'pending'`

### New Files

| File | Purpose |
|---|---|
| `app/api/waitlist/upload/route.ts` | Receives MP4, streams to Supabase Storage, returns the storage key |
| `app/api/waitlist/route.ts` | Stores email + video key in DB, fires Resend notification |
| `app/api/admin/fulfill/route.ts` | PATCH — flips waitlist row status to `fulfilled` |
| `app/admin/page.tsx` | Admin dashboard, server-rendered |

### New Environment Variables

| Variable | Purpose |
|---|---|
| `ADMIN_SECRET` | Guards `/admin` dashboard |
| `RESEND_API_KEY` | Sends email notification on new waitlist submission |
| `RESEND_FROM` | Sender address — `spectr <hello@spectr.to>`. Set in Vercel on all environments (2026-04-14). |

### Deployment Status

The waitlist feature is **live in production at `www.spectr.to`**. The full two-screen flow (upload → email) is deployed on Vercel with Supabase env vars configured.

**Resend domain verification — DNS changes applied, pending Resend confirmation.** DKIM was already verified. The stale CNAME on `send` has been deleted and the required MX + TXT records have been added:
- **MX** · Host `send` · Value `feedback-smtp.us-east-1.amazonses.com` · Priority `10`
- **TXT** · Host `send` · Value `v=spf1 include:amazonses.com ~all`

**Namecheap-specific note:** Adding an MX on the `send` subdomain required switching Mail Settings from "Email Forwarding" → "Custom MX" mode in Namecheap. This automatically removed the old SPF TXT at `@` (`v=spf1 include:spf.efwd.registrar-servers.com ~all`). That record only covered Namecheap's email-forwarding service, which was not in use — harmless.

**Resend domain is fully verified (2026-04-14).** DKIM + MX + SPF all green. `RESEND_FROM=spectr <hello@spectr.to>` is set in Vercel on all environments. Waitlist notification emails now send from `hello@spectr.to`.

**Vercel env vars can have trailing newlines — ALL of them.** This affects every env var set via the Vercel dashboard, not just secrets. Without stripping, failures are silent and the Vercel dashboard shows the correct-looking value. The fix is a `clean()` helper in both Supabase client files:

```ts
const clean = (v: string | undefined, fallback: string) =>
  (v ?? fallback).replace(/\\n/g, '').trim()
```

This helper is already applied in `lib/supabase.ts` (for `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and `lib/supabase-server.ts` (for `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`). Also apply `.trim()` to `ADMIN_SECRET` comparisons. Confirmed affected: every env var on this project's Vercel deployment — the URL, anon key, service key, and admin secret all had trailing `\n`.

---

## Pre-Launch Waitlist Gate

Before the Supabase auth check, `middleware.ts` enforces an invite-only gate via a `spectr_access` cookie. This prevents non-invited traffic from ever reaching the product — they land on `/waitlist` instead.

### How it works

1. Middleware checks for `request.cookies.get('spectr_access')?.value === 'main'`
2. If the cookie is absent → redirect to `/waitlist`
3. If the cookie is present → proceed to the Supabase auth check (for `/app/*` routes)

### Granting access

`GET /spectr-enter?to=<path>` (`app/spectr-enter/route.ts`) sets the cookie and redirects to `<path>` (defaults to `/app`). Share this URL with invited users. The cookie is `httpOnly`, `sameSite: lax`, secure in production, and expires after 30 days.

```
https://www.spectr.to/spectr-enter?to=/app
```

After deployment, hit this URL in every browser you want to grant access to — including your own.

### Ungated paths

These bypass both the waitlist gate and the auth check:

- `/waitlist` — public sign-up page
- `/spectr-enter` — cookie setter (must stay ungated or you can't grant access)
- `/admin` — admin dashboard
- `/auth/callback` — Supabase magic-link exchange
- `/api/*` — all API routes
- `/_next/*` and static assets — Next.js internals

---

## Authentication Architecture

Auth is implemented via Supabase magic-link (OTP email). Full user isolation is live.

### Auth Flow

1. Unauthenticated user hits `/app/*` → `middleware.ts` redirects to `/login`
2. User enters email → `POST /auth/v1/otp` via Supabase → magic link email sent
3. Link click → `/auth/callback` exchanges the code for a session cookie
4. Middleware refreshes the session cookie on every request to `/app/*`

### Supabase Client Files

There are now three Supabase client modules — use the right one:

| File | Use when |
|---|---|
| `lib/supabase-browser.ts` | Client Components — auth-aware, inherits signed-in user's JWT |
| `lib/supabase-ssr.ts` | Server Components + Route Handlers — reads/writes session cookies |
| `lib/supabase.ts` | Legacy browser client alias — same as `supabase-browser.ts`; Realtime subscriptions use this so they inherit the JWT |

`lib/auth-project.ts` exports `requireProjectOwner(supabase, projectId)` — call this in every `/api/projects/[id]/*` route. It returns the project row if the authenticated user owns it, or throws a 404 response. Do not re-implement ownership checks inline.

### RLS Policies

`projects` table has RLS enabled with owner-only `SELECT/INSERT/UPDATE` policies scoped to `auth.uid() = user_id`. `waitlist` table also has RLS enabled (service-role only — no user-facing access).

The `projects` table has a `user_id uuid REFERENCES auth.users(id)` column (nullable for legacy rows) and an index on `user_id`.

`spectr-uploads` storage bucket has RLS policies for the `authenticated` role: INSERT, SELECT, and UPDATE on `storage.objects` scoped to `bucket_id = 'spectr-uploads'`. All three are required — the upload call uses `upsert: true`, which needs UPDATE in addition to INSERT. The `/app` upload flow uses the browser JWT client and these policies allow it through.

### Known State After Migration

The 35 pre-auth `projects` rows with `user_id = NULL` were deleted on 2026-04-14. The table is clean; all remaining rows have an owner.

### Supabase Dashboard Configuration

- Site URL: `https://www.spectr.to`
- Redirect allow-list: `https://www.spectr.to/auth/callback`, `http://localhost:3000/auth/callback`

These must remain configured. Removing them breaks the magic-link callback.

### New Frontend Files

| File | Purpose |
|---|---|
| `lib/supabase-browser.ts` | Auth-aware browser Supabase client |
| `lib/supabase-ssr.ts` | Session-cookie Supabase client for server use |
| `lib/auth-project.ts` | `requireProjectOwner()` ownership guard |
| `app/login/` | Magic-link login page + `LoginClient.tsx` |
| `app/auth/callback/` | Code-exchange route handler |
| `app/app/projects/[id]/ProjectClient.tsx` | Client component split out for realtime subscription under JWT |

---

## Known Pre-Launch Gaps

Auth and user isolation are now implemented. The `spectr-uploads` RLS policies (INSERT, SELECT, UPDATE for `authenticated`) are in place. No known open gaps remain.

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

**Do not leave app-specific strings in `required_substrings` validators.**
`legacy_spec.py` sections 6 (`implementation_notes`) and 7 (`claude_code_prompt`) had a hardcoded `"merchant logos"` entry in their `required_substrings` tuples — a DoorDash-era leftover. For any non-food-delivery app Claude correctly omits that phrase, fails validation, retries 3×, then falls back to a placeholder. This burns ~60–90s per failing section and silently degrades output quality. Keep `required_substrings` generic (structural headings only); never put app-specific content there. Check `SPEC_SECTION_DEFINITIONS` in `worker/prompts/legacy_spec.py` if sections 6–7 are consistently falling back to placeholders.

The fix is to remove the string from the **validator tuple only** — do not remove it from the **prompt instructions**. The prompt still tells Claude to write the branding-override guidance; for food-delivery clones Claude will still emit it naturally. The validator just stops policing a specific literal wording, so non-food apps no longer fail validation on irrelevant content.

**Do not use the `supabaseServer` module-level singleton in API route handlers.**
`lib/supabase-server.ts` exports a `supabaseServer` singleton that is initialized at module load time — before Vercel injects environment variables into the runtime. Using it in API routes produces "invalid api key" errors in production even when the env vars are correctly set. Always call `makeSupabaseServer()` inside the request handler function body instead. The `supabaseServer` export exists for compatibility with existing imports but must not be the pattern for new routes.

**Do not use internal Next.js fetch loopback in server-rendered pages.**
Server-rendered pages (like `app/admin/page.tsx`) must not call their own API routes via `fetch('/api/...')` internally. On Vercel, server-to-server loopback fetches are unreliable — the request may fail or time out because the function tries to call itself before it has fully initialized. Instead, query Supabase (or any data source) directly inside the server component using `makeSupabaseServer()`. This was the root cause of the admin dashboard failing to load waitlist data in production despite the API route working correctly when called externally.

**Do not let `middleware.ts` intercept static assets in `/public/`.**
The auth middleware must explicitly pass through requests for `/public/` paths (including the demo video at `/demo/spectr-demo.mp4`). Without this, Vercel serves a redirect to `/login` instead of the video file, breaking the waitlist page demo player. Any static asset path that needs to load unauthenticated — including `/demo/*`, `/fonts/*`, `/_next/*` — must be excluded from the auth gate matcher in `middleware.ts`.

**Do not put centering transforms and reveal animations on the same element.**
The waitlist demo phone frame (`<aside>` in `WaitlistClient.tsx`) uses `translateY(-50%)` to vertically center against the viewport. Any CSS animation whose end keyframe includes a `transform` reset (e.g. `translateY(0) scale(1)`) will overwrite that centering once the animation completes — causing visible drift ~1.5s after page load. The fix is to split them onto separate elements: the outer element holds only the centering transform and is never animated; the inner element runs the reveal animation. If you add or modify reveal animations on the phone frame, keep this two-element structure intact.

**Do not call `triggerWorker()` without awaiting it.**
`lib/trigger-worker.ts` is async — not awaiting it makes the call fire-and-forget. The API route returns before the worker ever receives the POST, so the project stays stuck at `pending` indefinitely. Always `await triggerWorker(id)` in both `app/api/projects/route.ts` and `app/api/projects/[id]/retry/route.ts`. The `\n`-stripping for `WORKER_URL` and `WORKER_WEBHOOK_SECRET` is handled inside `triggerWorker` itself — do not strip them at the call site.

**Any API route that directly fetches the worker must also trim `WORKER_URL` and `WORKER_WEBHOOK_SECRET`.**
`triggerWorker()` does the trim internally, but routes that call the worker directly (e.g. `app/api/projects/[id]/logs/route.ts`) must apply their own `clean()` helper: `const clean = (v: string | undefined) => (v ?? '').replace(/\\n/g, '').trim()`. Without this, the Vercel-injected trailing `\n` produces a malformed URL and the route silently returns `{ lines: [] }` with no indication of failure. Also log worker errors explicitly (`console.error`) — silent empty returns make this class of bug nearly invisible.

**Do not put an `env` block in `vercel.json`.**
Vercel's `vercel.json` `"env"` section hardcodes values that are embedded at deployment time and **override** anything set in the Vercel dashboard at runtime. A `"SUPABASE_SERVICE_KEY": "placeholder"` entry will always win over the real key — producing silent "invalid api key" failures where debug tooling shows the correct-looking value but the running function gets the hardcoded string. Keep `vercel.json` free of any `env` block; set all environment variables exclusively through the Vercel dashboard.

---

## Vercel Deployment

The `frontend` Vercel project is connected to the `Meliwat/spectr` GitHub repository (scoped install, not all-repos). Production branch is `master`, root directory is `frontend`. Every `git push origin master` auto-deploys — no manual `vercel --prod` needed.

---

## Railway Worker Deployment

The worker requires `worker/nixpacks.toml` to declare system dependencies explicitly. Without it, Railway's Nixpacks builder does not install `ffmpeg`, causing frame extraction to fail silently at runtime.

Current `worker/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["ffmpeg", "python311"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

Do not remove this file. If Railway is ever migrated to a Dockerfile approach, ensure `ffmpeg` is installed explicitly in the image.

---

## Promo Video

`promo/` is a standalone [Remotion](https://www.remotion.dev/) project for generating marketing video assets. It is not part of the Spectr pipeline — it's a separate tool for producing promo clips.

There are three compositions registered in `promo/src/index.tsx`. **SpectrePromo is the primary/canonical composition** — the user has confirmed it is preferred over the alternatives. Do not suggest replacing or deprecating it.

### SpectrePromo (`promo/src/SpectrePromo.tsx`)

8-second (480 frames, 60fps) cinematic promo — the phone/scanner/particle story.

- **Assets used**: `spectr-symbol.png` + `spectr-logotype.png` brand assets via Remotion `<Img>`
- **Fonts**: Orbitron 900 (wordmark) + Share Tech Mono (tagline/readout) — loaded via `@remotion/google-fonts`
- **Animation structure** (8s, 480 frames @ 60fps):
  - **0–1.6s** — Phone materializes from darkness, backlit with amber warmth. "You see an app." types in corner. Real-looking UI lives inside (gradient hero card, cards, list items, tab bar).
  - **1.6–2.8s** — Cyan scanner sweeps top-to-bottom. As it passes, warm app drains to blueprint: wireframe strokes, cyan border, grid overlay. "You want to build it." Component labels scatter outward — NAVIGATION, TYPOGRAPHY, COLOR SYSTEM, COMPONENTS.
  - **3.5–4.5s** — Phone implodes. 56 particles burst outward in cyan and white. White flash. A `spec.md` document icon draws itself from stroke — violet glow builds, text lines materialize inside.
  - **5.2–6.5s** — S·P·E·C·T·R glitch into position one-by-one in Orbitron 900, each crackling from static to clean white. All six lock simultaneously; neon bloom hits full (6-layer white shadow stack with breathing animation).
  - **6.5–7.5s** — Gradient divider draws itself. "See an app. Ship an app." lifts in Share Tech Mono. spectr.to badge springs in bottom-right.
  - **7.5–8s** — Hold and fade.

### SpectreSignal (`promo/src/SpectreSignal.tsx`)

8-second (480 frames, 60fps) alternative promo — the waveform/signal-processing story. Same timing constants and SPECTR wordmark finale, different visual metaphor.

- **Animation structure** (8s, 480 frames @ 60fps):
  - **Act I (0–2s)** — Amber waveform of 80 bars pulses across the canvas with seeded organic phase offsets. Terminal readout types: `analyzing signal...`. Visual metaphor: raw screen-recording data.
  - **Act II (2–5s)** — Waveform fragments into 24 discrete cyan frequency columns (representing extracted frames). Columns rise from bottom staggered. Readout ticks through the pipeline: frames extracted → vision analysis → spec generation. Columns then sort by height — Spectr ranking frames by uniqueness.
  - **Act III (5–8s)** — Columns collapse to a violet implosion point. Flash. SPECTR assembles with each letter entering from a unique direction (S from bottom-left, P from below, E from bottom-right, C from top-left, T from above, R from top-right), converging simultaneously. Full 6-layer neon bloom. Tagline lifts. spectr.to badge springs in.

### SpectreIdentity (`promo/src/SpectreIdentity.tsx`)

6-second (360 frames, 60fps) brand identity reel — aurora + symbol + logotype + tagline. Uses the exact visual language of the waitlist landing page (globals.css aurora palette, violet/indigo radials, wisp particles).

- **Animation structure** (6s, 360 frames @ 60fps):
  - **0–1.3s** — Aurora blooms from top (violet/indigo radials), grid lines fade in, 15 wisp particles drift across
  - **1.0–2.7s** — `spectr-symbol.png` springs up from below with a violet glow ring behind it
  - **2.2–3.7s** — `spectr-logotype.png` slides in beside the symbol with neon drop-shadows
  - **3.3–4.8s** — "See an app." and "Ship an app." lift in line by line, 74px Inter 400
  - **4.5–5.5s** — Eyebrow badge ("From recording to product blueprint" with pulsing violet dot) + `spectr.to` URL badge spring in
  - **5.5–6.0s** — Hold, gentle glow pulse, fade out
- **Cinematic touches**: letterbox bars top/bottom, film grain overlay at 4.5% opacity, radial vignette (all low intensity)

- **Preview**: `cd promo && npx remotion preview src/index.tsx`

The `promo/` directory has its own `node_modules` and is not wired into the frontend build.

**Detailed animation reference**: `promo/ANIMATION_SPEC.md` — 2,238-line spec covering every timing constant (frames + seconds), every color (hex + rgba), every easing config (damping/stiffness/mass), every SVG filter attribute, exact pixel coordinates per component, 24 critical frames annotated, motion principles, layer order, render commands, and implementation notes. Read this before modifying any animation in the promo.

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
