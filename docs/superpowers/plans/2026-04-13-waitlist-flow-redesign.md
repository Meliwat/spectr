# Waitlist Flow Redesign + Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-step email form with a two-screen flow (upload MP4 → capture email) and add an admin dashboard at `/admin?key=SECRET` for managing submissions.

**Architecture:** Screen 1 collects an MP4 via drag/drop, generates a Supabase Storage signed upload URL server-side, then uploads the file directly from the browser to Supabase (bypassing Vercel body size limits). Screen 2 collects email and POSTs to `/api/waitlist` along with the video key. The admin page is a Next.js server component that fetches rows + generates signed download URLs, with a thin client component for interactive buttons.

**Tech Stack:** Next.js 14 App Router, Supabase JS 2.43.x (`@supabase/supabase-js`), TailwindCSS (inline styles for admin), Resend API (plain fetch, no SDK)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/app/api/waitlist/upload/route.ts` | Create | Generate signed Supabase Storage upload URL |
| `frontend/app/api/waitlist/route.ts` | Modify | Accept video fields; fire Resend notification |
| `frontend/app/api/admin/fulfill/route.ts` | Create | PATCH waitlist row status to fulfilled |
| `frontend/app/admin/page.tsx` | Create | Server component: auth check, fetch rows + signed URLs |
| `frontend/app/admin/AdminTable.tsx` | Create | Client component: table, fulfill button, CSV export |
| `frontend/app/waitlist/WaitlistClient.tsx` | Modify | Add upload screen state, drag/drop zone, screen transition |

---

## Task 1: Supabase — DB migration + storage bucket

**Files:**
- Supabase project: `nlkwoezxicayljemxhma` (via MCP or Supabase dashboard SQL editor)

- [ ] **Step 1: Apply DB migration**

Run via Supabase MCP `apply_migration` or paste into SQL editor:

```sql
-- Add columns to waitlist table
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS video_s3_key   TEXT,
  ADD COLUMN IF NOT EXISTS video_filename TEXT,
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'pending';
```

Expected: no error, columns appear in table schema.

- [ ] **Step 2: Create storage bucket**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waitlist-videos',
  'waitlist-videos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only service role can read/write
CREATE POLICY "service_role_all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'waitlist-videos');
```

Expected: bucket appears in Supabase Storage dashboard as private.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: waitlist schema + storage bucket"
```

---

## Task 2: Upload API route

**Files:**
- Create: `frontend/app/api/waitlist/upload/route.ts`

- [ ] **Step 1: Create the route**

```ts
// frontend/app/api/waitlist/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const MAX_BYTES = 500 * 1024 * 1024 // 500 MB

export async function POST(req: NextRequest) {
  const { filename, size } = await req.json()

  if (
    !filename ||
    typeof filename !== 'string' ||
    !filename.toLowerCase().endsWith('.mp4')
  ) {
    return NextResponse.json({ error: 'Only .mp4 files are accepted' }, { status: 400 })
  }

  if (typeof size === 'number' && size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })
  }

  // Sanitise filename and prepend UUID to prevent collisions
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key  = `${crypto.randomUUID()}-${safe}`

  const { data, error } = await supabaseServer.storage
    .from('waitlist-videos')
    .createSignedUploadUrl(key)

  if (error || !data) {
    console.error('[upload] signed URL error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Return key + token; client calls supabase.storage.uploadToSignedUrl()
  return NextResponse.json({ key, filename: safe, token: data.token })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/waitlist/upload/route.ts
git commit -m "feat: signed upload URL endpoint for waitlist videos"
```

---

## Task 3: Update waitlist API route (video fields + Resend)

**Files:**
- Modify: `frontend/app/api/waitlist/route.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// frontend/app/api/waitlist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email, video_s3_key, video_filename } = await req.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const normalised = email.trim().toLowerCase()

  const { error } = await supabaseServer
    .from('waitlist')
    .insert({
      email:          normalised,
      video_s3_key:   video_s3_key  ?? null,
      video_filename: video_filename ?? null,
    })

  if (error) {
    if (error.code === '23505') {
      // Duplicate email — treat as success (don't leak membership)
      return NextResponse.json({ ok: true })
    }
    console.error('[waitlist] insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  // Fire Resend notification — non-blocking, never fails the request
  const adminUrl =
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spectr.to'}` +
    `/admin?key=${process.env.ADMIN_SECRET ?? ''}`

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    'spectr <onboarding@resend.dev>',
      to:      'muhammedeliwat@gmail.com',
      subject: `🎬 New blueprint request — ${normalised}`,
      html: [
        `<p><strong>${normalised}</strong> just submitted a video.</p>`,
        `<p>File: ${video_filename ?? '(no file)'}</p>`,
        `<p><a href="${adminUrl}">View in admin →</a></p>`,
      ].join(''),
    }),
  }).catch(err => console.error('[resend] notification failed:', err))

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/waitlist/route.ts
git commit -m "feat: waitlist route accepts video fields and sends Resend notification"
```

---

## Task 4: Admin fulfill API route

**Files:**
- Create: `frontend/app/api/admin/fulfill/route.ts`

- [ ] **Step 1: Create the route**

```ts
// frontend/app/api/admin/fulfill/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key || key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('waitlist')
    .update({ status: 'fulfilled' })
    .eq('id', id)

  if (error) {
    console.error('[fulfill] update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/admin/fulfill/route.ts
git commit -m "feat: admin fulfill endpoint"
```

---

## Task 5: Admin dashboard

**Files:**
- Create: `frontend/app/admin/page.tsx`
- Create: `frontend/app/admin/AdminTable.tsx`

- [ ] **Step 1: Create AdminTable client component**

```tsx
// frontend/app/admin/AdminTable.tsx
'use client'

import { useState } from 'react'

export type AdminRow = {
  id:             string
  email:          string
  video_filename: string | null
  downloadUrl:    string | null
  status:         string
  created_at:     string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const S = {
  page:   { minHeight: '100vh', background: '#07080f', color: '#c8cef0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '32px' },
  inner:  { maxWidth: 920, margin: '0 auto' },
  bar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1:     { margin: 0, fontSize: 20, fontWeight: 600, color: '#e0e4ff' } as React.CSSProperties,
  count:  { margin: '4px 0 0', fontSize: 13, color: '#6b7280' } as React.CSSProperties,
  btn:    { background: 'transparent', border: '1px solid #3a3b6e', color: '#a0a4d0', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  wrap:   { background: '#0d0e18', border: '1px solid #1e1f38', borderRadius: 10, overflow: 'hidden' },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 } as React.CSSProperties,
  th:     { padding: '10px 16px', textAlign: 'left', color: '#4b5180', fontWeight: 500, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' } as React.CSSProperties,
  thead:  { background: '#0a0b15', borderBottom: '1px solid #1a1b2e' },
} as const

export default function AdminTable({ rows, adminKey }: { rows: AdminRow[]; adminKey: string }) {
  const [fulfilling, setFulfilling] = useState<string | null>(null)

  async function markFulfilled(id: string) {
    setFulfilling(id)
    try {
      await fetch(`/api/admin/fulfill?key=${encodeURIComponent(adminKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } finally {
      window.location.reload()
    }
  }

  function exportCsv() {
    const header = ['Email', 'File', 'Signed Up', 'Status']
    const body   = rows.map(r => [
      r.email,
      r.video_filename ?? '',
      new Date(r.created_at).toISOString(),
      r.status,
    ])
    const csv  = [header, ...body].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `waitlist-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.bar}>
          <div>
            <h1 style={S.h1}>spectr · waitlist</h1>
            <p style={S.count}>Showing {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</p>
          </div>
          <button onClick={exportCsv} style={S.btn}>Export CSV ↓</button>
        </div>

        <div style={S.wrap}>
          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                {['Email', 'File', 'Signed up', 'Status', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#3a3b6e' }}>
                    No signups yet.
                  </td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id} style={{ borderTop: '1px solid #1a1b2e', background: i % 2 ? '#0a0b14' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', color: '#c8cef0' }}>{row.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.downloadUrl
                      ? <a href={row.downloadUrl} style={{ color: '#7170ff', textDecoration: 'none', fontSize: 12 }}>{row.video_filename ?? 'download'}</a>
                      : <span style={{ color: '#3a3b6e', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{timeAgo(row.created_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: row.status === 'fulfilled' ? '#1a2e1a' : '#1e1a2e',
                      color:      row.status === 'fulfilled' ? '#4ade80' : '#a78bfa',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {row.status === 'pending' && (
                      <button
                        onClick={() => markFulfilled(row.id)}
                        disabled={fulfilling === row.id}
                        style={{ ...S.btn, fontSize: 11, padding: '5px 12px', opacity: fulfilling === row.id ? 0.5 : 1 }}
                      >
                        {fulfilling === row.id ? 'Saving...' : 'Mark fulfilled'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create admin page server component**

```tsx
// frontend/app/admin/page.tsx
import { supabaseServer } from '@/lib/supabase-server'
import AdminTable, { AdminRow } from './AdminTable'

type RawRow = {
  id:             string
  email:          string
  video_s3_key:   string | null
  video_filename: string | null
  status:         string
  created_at:     string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  // Auth check
  if (!searchParams.key || searchParams.key !== process.env.ADMIN_SECRET) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#fff' }}>
        <h1 style={{ color: '#ff4444' }}>403 Forbidden</h1>
        <p style={{ color: '#888' }}>Invalid or missing admin key.</p>
      </div>
    )
  }

  const { data, error } = await supabaseServer
    .from('waitlist')
    .select('id, email, video_s3_key, video_filename, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#ff4444' }}>
        Failed to load: {error.message}
      </div>
    )
  }

  // Generate 1-hour signed download URLs for each video
  const rows: AdminRow[] = await Promise.all(
    (data as RawRow[]).map(async row => {
      let downloadUrl: string | null = null
      if (row.video_s3_key) {
        const { data: urlData } = await supabaseServer.storage
          .from('waitlist-videos')
          .createSignedUrl(row.video_s3_key, 3600)
        downloadUrl = urlData?.signedUrl ?? null
      }
      return {
        id:             row.id,
        email:          row.email,
        video_filename: row.video_filename,
        downloadUrl,
        status:         row.status,
        created_at:     row.created_at,
      }
    })
  )

  return <AdminTable rows={rows} adminKey={searchParams.key} />
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/
git commit -m "feat: admin dashboard with fulfill and CSV export"
```

---

## Task 6: WaitlistClient — two-screen flow

**Files:**
- Modify: `frontend/app/waitlist/WaitlistClient.tsx`

The existing file has three logical sections you'll edit. Everything else (canvas animation, headline, strip) stays untouched.

**Section A — Add imports and new state** (after existing `import` line, before constants)

- [ ] **Step 1: Add supabase import and new state types**

After `import { useEffect, useRef, useState } from 'react'`, add:

```ts
import { supabase } from '@/lib/supabase'
```

After `type FormState = 'idle' | 'loading' | 'success' | 'error'`, add:

```ts
type UploadState = 'idle' | 'uploading' | 'error'
```

**Section B — Add state variables and handlers** (inside the component function, after existing state declarations around line 178)

- [ ] **Step 2: Add upload state variables**

After the existing `const [focused, setFocused] = useState(false)` (or similar existing state), add:

```ts
const [screen,       setScreen]       = useState<'upload' | 'email'>('upload')
const [uploadState,  setUploadState]  = useState<UploadState>('idle')
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [dragActive,   setDragActive]   = useState(false)
const [videoKey,     setVideoKey]     = useState('')
const [videoFilename, setVideoFilename] = useState('')
const fileInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 3: Add upload handler functions**

Add these functions before (or after) the existing `handleSubmit` function:

```ts
function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4') {
    return 'Only .mp4 files are accepted'
  }
  if (file.size > 500 * 1024 * 1024) {
    return 'File must be under 500 MB'
  }
  return null
}

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  const err = validateFile(file)
  if (err) { setUploadState('error'); return }
  setSelectedFile(file)
  setUploadState('idle')
}

function handleDrop(e: React.DragEvent) {
  e.preventDefault()
  setDragActive(false)
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  const err = validateFile(file)
  if (err) { setUploadState('error'); return }
  setSelectedFile(file)
  setUploadState('idle')
}

async function handleUpload() {
  if (!selectedFile || uploadState === 'uploading') return
  setUploadState('uploading')

  try {
    // 1. Get signed upload URL from our API
    const res = await fetch('/api/waitlist/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: selectedFile.name, size: selectedFile.size }),
    })
    if (!res.ok) { setUploadState('error'); return }
    const { key, filename, token } = await res.json()

    // 2. Upload directly to Supabase Storage using the signed token
    const { error: uploadErr } = await supabase.storage
      .from('waitlist-videos')
      .uploadToSignedUrl(key, token, selectedFile, { contentType: 'video/mp4' })

    if (uploadErr) { setUploadState('error'); return }

    setVideoKey(key)
    setVideoFilename(filename)
    setScreen('email')
  } catch {
    setUploadState('error')
  }
}
```

- [ ] **Step 4: Update handleSubmit to include video fields**

Replace the existing `handleSubmit` function body:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!email || formState === 'loading') return
  setFormState('loading')
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, video_s3_key: videoKey, video_filename: videoFilename }),
    })
    setFormState(res.ok ? 'success' : 'error')
  } catch {
    setFormState('error')
  }
}
```

**Section C — Add CSS for upload zone** (inside the existing `<style>` JSX block, before the closing backtick)

- [ ] **Step 5: Append upload zone CSS**

At the end of the existing inline `<style>` block (before the closing `` ` `` ), append:

```css
/* ── UPLOAD SCREEN ──────────────────────────────────────────── */
.wl-upload-zone {
  border: 1.5px dashed rgba(113,112,255,0.30);
  border-radius: 10px; padding: 28px 20px; text-align: center;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  position: relative; margin-bottom: 14px;
}
.wl-upload-zone:hover, .wl-upload-zone.drag-active {
  border-color: rgba(113,112,255,0.65);
  background: rgba(113,112,255,0.04);
}
.wl-upload-zone input[type="file"] {
  position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
}
.wl-upload-icon { font-size: 26px; margin-bottom: 10px; }
.wl-upload-label { color: #6b7280; font-size: 12px; line-height: 1.6; }
.wl-upload-label strong { color: #a0a4d0; }

.wl-file-pill {
  display: flex; align-items: center; gap: 10px;
  background: rgba(113,112,255,0.08); border: 1px solid rgba(113,112,255,0.20);
  border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;
}
.wl-file-name { font-size: 12px; color: #a0a4d0; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wl-file-remove { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; }

.wl-screen-enter { animation: wl-screen-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }
@keyframes wl-screen-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wl-card-heading {
  font-size: 15px; font-weight: 600; color: #e0e4ff;
  margin: 0 0 5px; text-align: center;
}
.wl-card-sub {
  font-size: 12px; color: #6b7280; text-align: center; margin: 0 0 18px; line-height: 1.5;
}
```

**Section D — Replace card content JSX**

- [ ] **Step 6: Replace the card content conditional render**

Find this block (around line 709):
```tsx
{formState === 'success' ? (
  <div className="wl-success-wrap">
```

Replace everything from that line through the closing `</form>` and `<p className="wl-founding">` (the full card inner content, ~30 lines) with:

```tsx
{screen === 'upload' ? (
  /* ── Screen 1: Upload ── */
  <div className="wl-screen-enter">
    {selectedFile ? (
      <div className="wl-file-pill">
        <span style={{ fontSize: 16 }}>🎬</span>
        <span className="wl-file-name">{selectedFile.name}</span>
        <button
          className="wl-file-remove"
          onClick={() => { setSelectedFile(null); setUploadState('idle') }}
          aria-label="Remove file"
        >×</button>
      </div>
    ) : (
      <div
        className={`wl-upload-zone${dragActive ? ' drag-active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="wl-upload-icon">🎬</div>
        <div className="wl-upload-label">
          <strong>Drop your screen recording here</strong><br />
          or click to browse · MP4 only · max 500 MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,video/mp4"
          onChange={handleFileChange}
          onClick={e => e.stopPropagation()}
        />
      </div>
    )}

    <button
      className="wl-btn"
      onClick={handleUpload}
      disabled={!selectedFile || uploadState === 'uploading'}
    >
      {uploadState === 'uploading' ? 'Uploading...' : 'Get Free Blueprint →'}
    </button>

    {uploadState === 'error' && (
      <p className="wl-error">Upload failed — check your file and try again.</p>
    )}

    <p className="wl-founding">
      Founding members get a <span>lifetime discount</span> at launch.
    </p>
  </div>
) : formState === 'success' ? (
  /* ── Success state ── */
  <div className="wl-success-wrap wl-screen-enter">
    <div className="wl-success-icon" aria-hidden="true">✓</div>
    <div className="wl-success-text">
      <strong>You&rsquo;re in.</strong>{' '}
      We&rsquo;ll send your blueprint within 24 hours.
    </div>
  </div>
) : (
  /* ── Screen 2: Email ── */
  <div className="wl-screen-enter">
    <p className="wl-card-heading">Your blueprint is being prepared.</p>
    <p className="wl-card-sub">Drop your email and we&rsquo;ll send it within 24 hours.</p>
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef} className="wl-input" type="email"
        placeholder="your@email.com" value={email}
        onChange={e => setEmail(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required disabled={formState === 'loading'}
        autoFocus
      />
      <button className="wl-btn" type="submit" disabled={formState === 'loading'}>
        {formState === 'loading' ? 'Sending...' : 'Send my blueprint'}
      </button>
      {formState === 'error' && (
        <p className="wl-error">Something went wrong — try again.</p>
      )}
    </form>
    <p className="wl-founding">
      Founding members get a <span>lifetime discount</span> at launch.
    </p>
  </div>
)}
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/waitlist/WaitlistClient.tsx
git commit -m "feat: two-screen waitlist flow (upload → email)"
```

---

## Task 7: Deploy

- [ ] **Step 1: Deploy to Vercel**

```bash
cd frontend && npx vercel --prod --yes 2>&1 | tail -5
```

Expected: `"readyState": "READY"` and a deployment URL.

- [ ] **Step 2: Smoke test the upload flow**

1. Open `https://www.spectr.to/waitlist`
2. Drag or click to select a small `.mp4` file
3. Click "Get Free Blueprint →" — verify loading state appears then transitions to email screen
4. Enter `test+smoke@example.com`, click "Send my blueprint"
5. Verify success state appears

- [ ] **Step 3: Smoke test the admin page**

Open `https://www.spectr.to/admin?key=364e426f02253104c6495079f6aea3848d08dce4fc664cbb6a0b345dd1138818`

Verify:
- Table renders with the smoke-test row
- File column shows a clickable link that downloads the video
- "Mark fulfilled" button changes status badge to green on click

- [ ] **Step 4: Verify Resend notification arrived**

Check `muhammedeliwat@gmail.com` for subject `🎬 New blueprint request — test+smoke@example.com`.

---

## Notes

- **Resend sender:** Using `onboarding@resend.dev` until `spectr.to` DNS propagates (up to 48h). Once Resend shows the domain as Verified, update the `from` field in `/api/waitlist/route.ts` to `spectr <hello@spectr.to>` and redeploy.
- **Admin key:** `364e426f02253104c6495079f6aea3848d08dce4fc664cbb6a0b345dd1138818` — already in Vercel and `.env.local`.
- **Signed download URLs** expire after 1 hour — refresh the admin page to get fresh URLs.
