# Spec Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generated specs ship with a `setup.sh` + `.env.example` bundle so developers go from download to running in 4 steps — no reading required.

**Architecture:** PROMPT_3 detects backend services from the analyzed UI and appends XML-tagged file blocks at the end of spec.md. The worker parses those blocks, strips them from spec.md, and zips everything into `bundle.zip`. The download API returns the bundle URL. The frontend button downloads `bundle.zip`.

**Tech Stack:** Python `zipfile` + `re` (stdlib), existing Supabase Storage client, Next.js API route, PROMPT_3 in `worker/prompts.py`.

---

## File Map

| File | Change |
|------|--------|
| `worker/services/bundle.py` | **Create** — `extract_bundle_files()` + `create_bundle_zip()` |
| `worker/tests/test_bundle.py` | **Create** — tests for both functions |
| `worker/prompts.py` | **Modify** — add service detection + file output instructions to PROMPT_3_SYSTEM and PROMPT_3_USER |
| `worker/local_worker.py` | **Modify** — call bundle logic after stitching, upload zip, save `bundle_s3_key` |
| `frontend/app/api/projects/[id]/download/route.ts` | **Modify** — prefer `bundle_s3_key`, fall back to `spec_md_s3_key` |
| `frontend/app/app/projects/[id]/page.tsx` | **Modify** — button text + download filename |

---

## Task 1: Add `bundle_s3_key` column

**Files:**
- No code files — SQL migration only

- [ ] **Step 1: Run migration**

In Supabase dashboard SQL editor (or via MCP), run:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bundle_s3_key TEXT;
```

- [ ] **Step 2: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'bundle_s3_key';
```

Expected: one row returned.

- [ ] **Step 3: Commit note**

```bash
git commit --allow-empty -m "db: add bundle_s3_key column to projects"
```

---

## Task 2: Write `worker/services/bundle.py` with tests (TDD)

**Files:**
- Create: `worker/services/bundle.py`
- Create: `worker/tests/test_bundle.py`

- [ ] **Step 1: Write failing tests**

Create `worker/tests/test_bundle.py`:

```python
import zipfile
import io
import pytest
from services.bundle import extract_bundle_files, create_bundle_zip


SPEC_WITH_FILES = """# MyApp — Full Stack Specification

## App Overview
A social fitness app.

<spectr:files>
<spectr:file name=".env.example">
# Supabase — supabase.com → Settings → API
SUPABASE_URL=
SUPABASE_ANON_KEY=
</spectr:file>
<spectr:file name="setup.sh">
#!/bin/bash
cp .env.example .env
echo "done"
</spectr:file>
</spectr:files>"""

SPEC_WITHOUT_FILES = """# MyApp — Full Stack Specification

## App Overview
A social fitness app."""


def test_extract_returns_files():
    clean, files = extract_bundle_files(SPEC_WITH_FILES)
    assert ".env.example" in files
    assert "setup.sh" in files


def test_extract_env_content():
    _, files = extract_bundle_files(SPEC_WITH_FILES)
    assert "SUPABASE_URL=" in files[".env.example"]
    assert "SUPABASE_ANON_KEY=" in files[".env.example"]


def test_extract_strips_xml_from_spec():
    clean, _ = extract_bundle_files(SPEC_WITH_FILES)
    assert "<spectr:files>" not in clean
    assert "<spectr:file" not in clean
    assert "## App Overview" in clean


def test_extract_no_files_returns_empty():
    clean, files = extract_bundle_files(SPEC_WITHOUT_FILES)
    assert files == {}
    assert clean == SPEC_WITHOUT_FILES


def test_create_bundle_contains_spec():
    zip_bytes = create_bundle_zip("# MyApp", {})
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert "spec.md" in zf.namelist()
        assert zf.read("spec.md").decode() == "# MyApp"


def test_create_bundle_contains_extra_files():
    extra = {".env.example": "SUPABASE_URL=\n", "setup.sh": "#!/bin/bash\n"}
    zip_bytes = create_bundle_zip("# MyApp", extra)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert ".env.example" in zf.namelist()
        assert "setup.sh" in zf.namelist()
        assert zf.read(".env.example").decode() == "SUPABASE_URL=\n"


def test_create_bundle_empty_extra_files():
    zip_bytes = create_bundle_zip("# spec", {})
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert zf.namelist() == ["spec.md"]
```

- [ ] **Step 2: Run tests — confirm all fail**

```bash
cd /Users/meliwat/spectr/worker
python -m pytest tests/test_bundle.py -v
```

Expected: `ModuleNotFoundError: No module named 'services.bundle'`

- [ ] **Step 3: Implement `worker/services/bundle.py`**

Create `worker/services/bundle.py`:

```python
import re
import io
import zipfile


def extract_bundle_files(spec_md: str) -> tuple[str, dict[str, str]]:
    """Parse <spectr:file> blocks out of spec_md.

    Returns (clean_spec_md, {filename: content}) where clean_spec_md has the
    entire <spectr:files>...</spectr:files> block removed.
    """
    files: dict[str, str] = {}
    pattern = r'<spectr:file name="([^"]+)">([\s\S]*?)</spectr:file>'
    for match in re.finditer(pattern, spec_md):
        filename = match.group(1)
        content = match.group(2).strip()
        files[filename] = content

    clean = re.sub(r'\n*<spectr:files>[\s\S]*?</spectr:files>\n*', '\n', spec_md).strip()
    return clean, files


def create_bundle_zip(spec_md: str, extra_files: dict[str, str]) -> bytes:
    """Create an in-memory zip with spec.md at root plus any extra files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('spec.md', spec_md)
        for filename, content in extra_files.items():
            zf.writestr(filename, content)
    return buf.getvalue()
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
cd /Users/meliwat/spectr/worker
python -m pytest tests/test_bundle.py -v
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add worker/services/bundle.py worker/tests/test_bundle.py
git commit -m "feat: add bundle extraction and zip creation"
```

---

## Task 3: Update `worker/prompts.py` — service detection

**Files:**
- Modify: `worker/prompts.py`

- [ ] **Step 1: Update PROMPT_3_SYSTEM**

Replace the current `PROMPT_3_SYSTEM`:

```python
PROMPT_3_SYSTEM = """You are a technical writer producing a complete, production-ready app specification.
Combine the frontend and backend specs into one clean structured spec.md.
Apply all branding overrides. Be thorough — this file is the sole input a developer needs.

After writing the full spec, detect which backend services the app requires by scanning the frontend
and backend specs for these signals:
  - Auth screens, login/signup flows, user profiles → SUPABASE_URL, SUPABASE_ANON_KEY
  - File uploads, media, avatars, attachments → SUPABASE_URL, SUPABASE_SERVICE_KEY
  - AI chat, text generation, embeddings, completions → OPENAI_API_KEY
  - Push notifications → EXPO_PUBLIC_PROJECT_ID
  - In-app payments, subscriptions → STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY
  - Maps, location, geocoding → GOOGLE_MAPS_API_KEY

Only include a service if there is clear evidence in the UI or architecture. Do not guess.

Append the following block at the very end of the spec (after all other content).
Use exactly this XML format — no variation:

<spectr:files>
<spectr:file name=".env.example">
# One comment per variable: ServiceName — exact URL to dashboard page where key is found
VARIABLE_NAME=
</spectr:file>
<spectr:file name="setup.sh">
#!/bin/bash
set -e
cp .env.example .env
echo "✓ .env created — open it and fill in your API keys"
npm install 2>/dev/null || yarn install 2>/dev/null || echo "No package.json found — skipping install"
echo ""
echo "Next: open .env, paste your API keys, then run your app"
</spectr:file>
</spectr:files>

If no services are detected, still append the block with an empty .env.example (just a comment line).
Always include setup.sh."""
```

- [ ] **Step 2: Run existing tests to verify no regression**

```bash
cd /Users/meliwat/spectr/worker
python -m pytest tests/ -v
```

Expected: all existing tests still pass (prompts are strings, no logic tests break).

- [ ] **Step 3: Commit**

```bash
git add worker/prompts.py
git commit -m "feat: add service detection and file output instructions to PROMPT_3"
```

---

## Task 4: Update `worker/local_worker.py` — bundle after stitch

**Files:**
- Modify: `worker/local_worker.py`

- [ ] **Step 1: Add import**

At the top of `worker/local_worker.py`, add to the existing imports block:

```python
from services.bundle import extract_bundle_files, create_bundle_zip
```

- [ ] **Step 2: Replace the stitch + upload block**

Find this section (around line 284–310):

```python
        spec_md = claude_text(prompt, system=PROMPT_3_SYSTEM, timeout=900, model=STITCH_MODEL)

        # Upload spec.md to Supabase Storage
        spec_key = f"{project_id}/spec.md"
        client.storage.from_(BUCKET).upload(
            path=spec_key,
            file=spec_md.encode("utf-8"),
            file_options={"content-type": "text/markdown", "upsert": "true"},
        )
        update_project(project_id, {
            "status": STATUS_COMPLETE,
            "spec_md_s3_key": spec_key,
            "spec_md_text": spec_md,
        })
        print(f"\n  ✓ Done — spec.md uploaded to Storage")
```

Replace with:

```python
        raw_spec = claude_text(prompt, system=PROMPT_3_SYSTEM, timeout=900, model=STITCH_MODEL)

        # Extract <spectr:file> blocks and strip them from the displayed spec
        clean_spec, bundle_files = extract_bundle_files(raw_spec)

        # Upload clean spec.md
        spec_key = f"{project_id}/spec.md"
        client.storage.from_(BUCKET).upload(
            path=spec_key,
            file=clean_spec.encode("utf-8"),
            file_options={"content-type": "text/markdown", "upsert": "true"},
        )

        # Build and upload bundle.zip (spec.md + .env.example + setup.sh)
        zip_bytes = create_bundle_zip(clean_spec, bundle_files)
        bundle_key = f"{project_id}/bundle.zip"
        client.storage.from_(BUCKET).upload(
            path=bundle_key,
            file=zip_bytes,
            file_options={"content-type": "application/zip", "upsert": "true"},
        )

        update_project(project_id, {
            "status": STATUS_COMPLETE,
            "spec_md_s3_key": spec_key,
            "spec_md_text": clean_spec,
            "bundle_s3_key": bundle_key,
        })
        print(f"\n  ✓ Done — bundle.zip uploaded to Storage ({len(bundle_files)} extra files)")
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/meliwat/spectr/worker
python -m pytest tests/ -v
```

Expected: all tests pass (no logic for the local_worker stitch section is unit-tested; we're verifying nothing broke).

- [ ] **Step 4: Commit**

```bash
git add worker/local_worker.py
git commit -m "feat: extract bundle files from spec and upload bundle.zip"
```

---

## Task 5: Update download API route

**Files:**
- Modify: `frontend/app/api/projects/[id]/download/route.ts`

- [ ] **Step 1: Update the route**

Replace the entire file content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await supabaseServer
    .from('projects')
    .select('spec_md_s3_key, bundle_s3_key, status')
    .eq('id', params.id)
    .single()

  if (!data || data.status !== 'complete') {
    return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  }

  // Prefer bundle.zip; fall back to spec.md for older projects
  const storageKey = data.bundle_s3_key || data.spec_md_s3_key
  const filename = data.bundle_s3_key ? 'bundle.zip' : 'spec.md'

  if (!storageKey) {
    return NextResponse.json({ error: 'No download available' }, { status: 404 })
  }

  const { data: signed } = await supabaseServer
    .storage.from('spectr-uploads').createSignedUrl(storageKey, 86400)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, filename })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/projects/\[id\]/download/route.ts
git commit -m "feat: download API returns bundle.zip when available"
```

---

## Task 6: Update frontend download button

**Files:**
- Modify: `frontend/app/app/projects/[id]/page.tsx`

- [ ] **Step 1: Add filename state**

In `page.tsx`, find the existing state declarations:

```typescript
const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
```

Replace with:

```typescript
const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
const [downloadFilename, setDownloadFilename] = useState<string>('bundle.zip')
```

- [ ] **Step 2: Update the fetch handler to capture filename**

Find:

```typescript
        .then(d => {
          if (d.url) {
            setDownloadUrl(d.url)
            // Scroll to download button after it appears
            setTimeout(() => downloadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
          }
        })
```

Replace with:

```typescript
        .then(d => {
          if (d.url) {
            setDownloadUrl(d.url)
            setDownloadFilename(d.filename || 'bundle.zip')
            setTimeout(() => downloadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
          }
        })
```

- [ ] **Step 3: Update the download anchor**

Find:

```tsx
          <a
            href={downloadUrl}
            download="spec.md"
            className="btn-primary block w-full py-3 text-center text-base"
            style={{ borderRadius: 6 }}
          >
            Download spec.md
          </a>
```

Replace with:

```tsx
          <a
            href={downloadUrl}
            download={downloadFilename}
            className="btn-primary block w-full py-3 text-center text-base"
            style={{ borderRadius: 6 }}
          >
            Download Bundle
          </a>
```

- [ ] **Step 4: Update the hint text below the button**

Find:

```tsx
            Then run: <span style={{ color: 'var(--violet)' }}>claude --file spec.md</span>
```

Replace with:

```tsx
            Unzip, run <span style={{ color: 'var(--violet)' }}>./setup.sh</span>, fill in <span style={{ color: 'var(--violet)' }}>.env</span>, then <span style={{ color: 'var(--violet)' }}>claude --file spec.md</span>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/app/projects/\[id\]/page.tsx
git commit -m "feat: download button returns bundle.zip with setup files"
```

---

## Self-Review Checklist

- [x] **DB column** — `bundle_s3_key` added in Task 1 ✓
- [x] **Bundle extraction** — `extract_bundle_files` + `create_bundle_zip` with 7 tests ✓
- [x] **Prompt changes** — PROMPT_3_SYSTEM instructs service detection + XML output ✓
- [x] **Worker upload** — uploads both `spec.md` and `bundle.zip`, saves both keys ✓
- [x] **Download API** — prefers bundle, falls back to spec for old projects ✓
- [x] **Frontend** — filename state, button text, hint text all updated ✓
- [x] **Backward compat** — old projects without `bundle_s3_key` still download `spec.md` ✓
- [x] **Empty service detection** — prompt says always include `setup.sh` even with no services ✓
- [x] No TBD/TODO/placeholder steps ✓
- [x] All type references consistent across tasks ✓
