# Design: Backend API Integration in Generated Specs

**Date:** 2026-04-11
**Status:** Approved

## Problem

Developers who download a `spec.md` from Spectr still have to figure out which backend services the app needs, find the right env variables, and manually scaffold their project. Nobody reads a long markdown file for setup instructions — they want to run something and fill in keys.

## Goal

When a developer downloads their Spectr bundle, they should be able to go from zero to running in four steps:

1. Unzip bundle
2. `./setup.sh` — scaffolds `.env`, installs deps
3. Open `.env`, paste keys (each has a comment telling them exactly where to find it)
4. Run the app

`spec.md` stays clean — no setup noise. Setup lives in files developers actually use.

## What Changes

### 1. `worker/prompts.py` — PROMPT_3_SYSTEM

Add a service detection + file generation instruction block. Claude must:

1. **Detect services** from its own frontend/backend analysis using signal matching:
   - Auth screens / login flows → `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - File uploads / media storage → `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or Storage-specific)
   - AI/chat features → `OPENAI_API_KEY`
   - Push notifications → `EXPO_PUSH_TOKEN` / `FCM_SERVER_KEY`
   - Payments → `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`
   - Maps → `GOOGLE_MAPS_API_KEY`
   - Only include services with clear UI evidence — no guessing

2. **Output two fenced code blocks** at the end of spec.md, clearly delimited:
   - ` ```env:file:.env.example ``` ` — env vars with inline comments pointing to where to get each value
   - ` ```bash:file:setup.sh ``` ` — setup script (see template below)

### 2. `worker/local_worker.py` — bundle extraction

After stitching, scan `spec_md` for fenced blocks tagged `file:<filename>`. Extract each block and write it as a real file. Bundle `spec.md` + extracted files into a `bundle.zip` uploaded to Supabase Storage.

## Output Format

### `.env.example`
```bash
# Supabase — supabase.com → your project → Settings → API
SUPABASE_URL=
SUPABASE_ANON_KEY=

# OpenAI — platform.openai.com → API Keys → Create new secret key
OPENAI_API_KEY=
```
Only services Claude detected are included. Each variable has a one-line comment with the exact URL to get the value.

### `setup.sh`
```bash
#!/bin/bash
set -e
cp .env.example .env
echo "✓ .env created — open it and fill in your API keys"
npm install 2>/dev/null || yarn install 2>/dev/null || echo "No package.json found, skipping install"
echo ""
echo "Next steps:"
echo "  1. Open .env and paste your API keys"
echo "  2. Run your app"
```

## Bundle Structure

```
bundle.zip
  spec.md          ← feature spec, no setup noise
  .env.example     ← copy → .env, fill in keys
  setup.sh         ← run first
```

Download button on project page changes from "Download spec.md" → "Download Bundle".

## What Doesn't Change

- Pipeline stages 1–3 unchanged
- Stitching (stage 4) unchanged except for the appended file blocks
- No new API calls, no new services, no new env vars required on Spectr's side
- `spec.md` content (app overview, features, architecture) unchanged

## Out of Scope

- Provisioning accounts or creating projects on behalf of the user
- Table schemas, RLS policies, seed data — those belong in the app's own migrations
- Validating whether keys work

## Implementation Notes

- File block extraction regex: ` ```(\w+):file:([\w./]+)\n([\s\S]*?)``` `
- If no services detected, `.env.example` is omitted from the bundle (no empty file)
- `setup.sh` is always included (install step is always useful)
- Upsert bundle.zip to `spectr-uploads/{project_id}/bundle.zip`
- Keep `spec_md_s3_key` for backward compat; add `bundle_s3_key` column
