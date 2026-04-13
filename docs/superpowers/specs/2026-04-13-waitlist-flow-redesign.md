# Waitlist Flow Redesign + Admin Dashboard

**Date:** 2026-04-13  
**Status:** Approved

---

## Overview

Replace the single-step email form on `/waitlist` with a two-screen flow (upload video → capture email) and add an admin dashboard at `/admin` for managing signups. Emails go to Supabase; videos go to Supabase Storage; a Resend ping lands in the owner's inbox on every new submission.

---

## Screen Flow

### Screen 1 — Upload

- Full-page drag/drop zone styled to match existing wisp canvas aesthetic
- Accepts `.mp4` only; validates client-side before allowing progression
- "Get Free Blueprint" button is disabled until a valid file is selected
- On click: uploads the video to Supabase Storage bucket `waitlist-videos` via `POST /api/waitlist/upload`
- Loading state during upload (progress indicator, button disabled)
- On success: full-page transition to Screen 2 (slide/fade, not a navigation)
- On upload error: inline error message, user can retry

### Screen 2 — Email Capture

- Heading: "Your blueprint is being prepared."
- Subtext: "Drop your email and we'll send it within 24 hours."
- Email input + submit button
- On submit: `POST /api/waitlist` with `{ email, video_s3_key, video_filename }`
- On success: confirmation state ("You're in. Check your inbox soon.")
- On error: inline error, user can retry

---

## API Routes

### `POST /api/waitlist/upload`

- Receives multipart form data with the MP4 file
- Streams to Supabase Storage bucket `waitlist-videos`
- Key format: `{uuid}-{original_filename}` (uuid prevents collisions)
- Returns `{ key, filename }` on success
- Protected by size limit: reject files over 500MB
- No auth required (public endpoint, rate limiting via Vercel edge)

### `POST /api/waitlist`

Updated to accept `{ email, video_s3_key, video_filename }`:

1. Validate email format
2. Insert into `waitlist` table: `{ email, video_s3_key, video_filename, status: 'pending' }`
3. Handle duplicate email (23505) silently — return success
4. Fire Resend notification to `muhammedeliwat@gmail.com` (non-blocking — don't fail the request if email fails)
5. Return `{ ok: true }`

### `PATCH /api/admin/fulfill`

- Body: `{ id: string }`
- Validates `?key=` query param against `ADMIN_SECRET` env var
- Updates `waitlist` row: `status = 'fulfilled'`
- Returns `{ ok: true }`

### `GET /admin`

- Server component (not an API route)
- Reads `?key=` from search params, compares to `ADMIN_SECRET` — returns 403 page if mismatch
- Fetches all waitlist rows ordered by `created_at DESC` using service key
- Generates Supabase Storage signed URLs (1-hour expiry) for each video
- Renders table + CSV export button

---

## Admin Dashboard (`/admin`)

**Access:** `/admin?key=ADMIN_SECRET`

**Table columns:**
| Column | Content |
|---|---|
| Email | Plain text |
| File | Filename as download link (signed Supabase Storage URL, 1hr expiry) |
| Signed up | Relative timestamp (e.g. "2 hours ago") |
| Status | Badge: `pending` (purple) / `fulfilled` (green) |
| Action | "Mark fulfilled" button (pending rows only) |

**Toolbar:**
- Entry count ("Showing N entries")
- "Export CSV" button — client-side generation from the rendered table data, downloads `waitlist-{date}.csv`

**"Mark fulfilled" flow:**
- Button POSTs to `/api/admin/fulfill` with the row ID
- On success: full page refresh (simplest, no stale state risk)

---

## Resend Email Notification

**Trigger:** Every new unique email submission (duplicates suppressed)  
**From:** `spectr <hello@spectr.to>` (or `onboarding@resend.dev` if domain not verified)  
**To:** `muhammedeliwat@gmail.com`  
**Subject:** `🎬 New blueprint request — {email}`  
**Body:**
- Who submitted (email)
- Filename
- Relative time
- "View in admin →" link to `/admin?key=SECRET`

Implementation: plain `fetch` call to Resend API (no SDK, keeps the bundle lean). Runs after the Supabase insert succeeds. Errors are caught and logged but do not affect the response to the user.

---

## Supabase Changes

### Storage bucket

- Name: `waitlist-videos`
- Access: **private** (no public URLs — admin uses signed URLs)
- RLS: service role only

### Schema migration

```sql
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS video_s3_key   TEXT,
  ADD COLUMN IF NOT EXISTS video_filename TEXT,
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'pending';
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Vercel + `.env.local` | Resend email sending |
| `ADMIN_SECRET` | Vercel + `.env.local` | Admin page access key |
| (existing) `SUPABASE_SERVICE_KEY` | Already set | Storage + DB writes |
| (existing) `SUPABASE_URL` | Already set | Supabase connection |

---

## Files Changed / Created

| File | Change |
|---|---|
| `frontend/app/waitlist/WaitlistClient.tsx` | Rewrite: two-screen flow, upload logic |
| `frontend/app/api/waitlist/route.ts` | Add video fields + Resend ping |
| `frontend/app/api/waitlist/upload/route.ts` | New: handles MP4 → Supabase Storage |
| `frontend/app/api/admin/fulfill/route.ts` | New: PATCH status to fulfilled |
| `frontend/app/admin/page.tsx` | New: admin dashboard server component |

---

## Out of Scope

- Actual Spectr pipeline processing (manual fulfillment for now)
- Email sending to the user (only owner gets pinged)
- Auth system for admin (query param secret is sufficient for single-owner use)
- Video preview in admin (download link is enough)
