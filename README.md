# Spectr

> See an app. Ship an app.

Upload a screen recording of any app + its name.
Get a full-stack `spec.md` ready to paste into Claude Code.

## How it works

1. Upload MP4 + reference app name
2. Claude Vision analyzes every screen → frontend spec
3. Claude researches the app on the web → backend spec
4. Both specs stitched into one `spec.md` with a built-in Claude Code prompt

## Stack

- Next.js 14 (frontend + API routes) → Vercel
- Python worker (ffmpeg + Claude) → Railway
- Supabase (storage + postgres + realtime)

## Local setup

### Prerequisites
- Node 18+, Python 3.11+
- ffmpeg: `brew install ffmpeg`
- Supabase account + Anthropic API key

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Worker
```bash
cd worker && pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Env
```bash
cp .env.example .env
# Fill in keys, set WORKER_URL=http://localhost:8001 for local dev
```

## Deploy

- **Frontend:** connect `/frontend` to Vercel, set all env vars
- **Worker:** connect `/worker` to Railway, set `ANTHROPIC_API_KEY` + `SUPABASE_*` + `WORKER_WEBHOOK_SECRET`
- Copy Railway public URL → set as `WORKER_URL` in Vercel env vars
- **Supabase:** run `supabase/schema.sql`, create bucket `spectr-uploads`, enable Realtime on `projects` table
