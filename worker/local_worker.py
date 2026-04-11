#!/usr/bin/env python3
"""
Spectr Local Worker Bridge

Polls Supabase for pending projects and processes them using the `claude` CLI.
Uses your Claude subscription — no API key or API credits needed.

Usage:
  python3.9 worker/local_worker.py                      # poll continuously
  python3.9 worker/local_worker.py --once               # process one project and exit
  python3.9 worker/local_worker.py --project-id <uuid>  # process a specific project
  python3.9 worker/local_worker.py --interval 10        # custom poll interval (seconds)
"""

import os
import sys
import json
import time
import base64
import shutil
import tempfile
import argparse
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client
from dotenv import load_dotenv
from services.ffmpeg import extract_frames
from services.dedup import deduplicate_frames
from prompts import (
    PROMPT_1_SYSTEM, PROMPT_1_USER,
    PROMPT_2_SYSTEM, PROMPT_2_USER,
    PROMPT_3_SYSTEM, PROMPT_3_USER,
)
from constants import (
    STATUS_PENDING,
    STATUS_EXTRACTING,
    STATUS_ANALYZING_FRONTEND,
    STATUS_ANALYZING_BACKEND,
    STATUS_STITCHING,
    STATUS_COMPLETE,
    STATUS_FAILED,
)

load_dotenv(Path(__file__).parent.parent / ".env")

BUCKET = "spectr-uploads"
MAX_FRAMES = int(os.getenv("MAX_FRAMES", 80))
BATCH_SIZE = int(os.getenv("FRAME_BATCH_SIZE", 25))  # increased from 15 → 25
POLL_INTERVAL = 5  # seconds between Supabase polls

# Model overrides — defaults use claude CLI (subscription, no API key needed)
# Set STITCH_MODEL=claude-haiku-4-5-20251022 to use Haiku (3-6x cheaper/faster)
STITCH_MODEL = os.getenv("STITCH_MODEL", "claude-haiku-4-5-20251022")


# ──────────────────────────────────────────────
# Claude CLI helpers
# ──────────────────────────────────────────────

def _parse_stream_json(output: str) -> str:
    """Extract the final text result from stream-json output lines."""
    for line in reversed(output.strip().splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if obj.get("type") == "result" and obj.get("subtype") == "success":
                return obj.get("result", "")
        except json.JSONDecodeError:
            continue
    raise RuntimeError("No result found in stream-json output")


def _run_claude(cmd: list[str], stdin_data: str = None, timeout: int = 300) -> str:
    """Execute a claude CLI command and return stdout."""
    result = subprocess.run(
        cmd,
        input=stdin_data,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"claude exited {result.returncode}:\n"
            f"stderr: {result.stderr[:800]}\n"
            f"stdout: {result.stdout[:400]}"
        )
    return result.stdout.strip()


def claude_text(prompt: str, system: str = None, tools: list[str] = None,
                timeout: int = 300, model: str = None) -> str:
    """Run a text-only prompt non-interactively, returns plain text."""
    cmd = [
        "claude", "--print",
        "--output-format", "text",
        "--dangerously-skip-permissions",
    ]
    if model:
        cmd.extend(["--model", model])
    if system:
        cmd.extend(["--system-prompt", system])
    if tools:
        cmd.extend(["--allowedTools", *tools])
    else:
        cmd.extend(["--tools", ""])
    cmd.extend(["-p", prompt])
    return _run_claude(cmd, timeout=timeout)


def claude_vision(frame_paths: list[str], text_prompt: str, system: str = None) -> str:
    """Run a vision prompt by piping image content via stream-json stdin."""
    content = []
    for path in frame_paths:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": data},
        })
    content.append({"type": "text", "text": text_prompt})

    stdin_message = json.dumps({
        "type": "user",
        "message": {"role": "user", "content": content},
    })

    cmd = [
        "claude", "--print",
        "--input-format", "stream-json",
        "--output-format", "stream-json",
        "--verbose",
        "--tools", "",
        "--dangerously-skip-permissions",
    ]
    if system:
        cmd.extend(["--system-prompt", system])

    raw = _run_claude(cmd, stdin_data=stdin_message + "\n", timeout=300)
    return _parse_stream_json(raw)


# ──────────────────────────────────────────────
# Supabase helpers
# ──────────────────────────────────────────────

_db = None

def get_db():
    global _db
    if _db is None:
        _db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    return _db


def update_project(project_id: str, data: dict):
    get_db().table("projects").update(data).eq("id", project_id).execute()


# ──────────────────────────────────────────────
# Pipeline
# ──────────────────────────────────────────────

def process_project(project_id: str):
    client = get_db()
    project = (
        client.table("projects")
        .select("reference_app, your_app_name, brand_colors, mp4_s3_key, frontend_spec, backend_spec")
        .eq("id", project_id)
        .single()
        .execute()
        .data
    )

    reference_app = project["reference_app"]
    your_app_name = project.get("your_app_name") or reference_app
    brand_colors = project.get("brand_colors") or {}

    # Resume from stored data if available (avoids re-running expensive stages)
    stored_frontend_spec = project.get("frontend_spec")
    stored_backend_spec = project.get("backend_spec")

    tmpdir = tempfile.mkdtemp(prefix=f"spectr_{project_id[:8]}_")
    try:
        if stored_frontend_spec and stored_backend_spec:
            # Both specs already exist — skip straight to stitching
            frontend_spec = stored_frontend_spec
            backend_spec = stored_backend_spec
            print(f"  [1-3/4] Resuming from stored specs (skipping extraction + analysis)")
        else:
            # ── Stage 1: Extract frames ──────────────────────────
            update_project(project_id, {"status": STATUS_EXTRACTING})
            print(f"  [1/4] Downloading MP4 from Supabase Storage...")

            mp4_path = f"{tmpdir}/input.mp4"
            mp4_bytes = client.storage.from_(BUCKET).download(project["mp4_s3_key"])
            with open(mp4_path, "wb") as f:
                f.write(mp4_bytes)

            print(f"        Extracting frames...")
            frames_dir = f"{tmpdir}/frames"
            all_frames = extract_frames(mp4_path, frames_dir)
            unique = deduplicate_frames(all_frames)

            if len(unique) > MAX_FRAMES:
                step = len(unique) // MAX_FRAMES
                unique = unique[::step][:MAX_FRAMES]

            update_project(project_id, {"frame_count": len(unique)})
            print(f"        {len(all_frames)} total → {len(unique)} unique frames")

            # ── Stage 2: Analyze frontend ────────────────────────
            if stored_frontend_spec:
                frontend_spec = stored_frontend_spec
                print(f"  [2/4] Using stored frontend spec")
            else:
                update_project(project_id, {"status": STATUS_ANALYZING_FRONTEND})
                print(f"  [2/4] Analyzing UI with Claude vision...")

                batches = [unique[i:i + BATCH_SIZE] for i in range(0, len(unique), BATCH_SIZE)]
                print(f"        {len(batches)} batch(es) × {BATCH_SIZE} frames — running in parallel...")

                # Run all vision batches concurrently
                def _analyze_batch(args):
                    idx, batch = args
                    prompt = PROMPT_1_USER.format(n=len(batch), reference_app=reference_app)
                    print(f"        → Batch {idx + 1}/{len(batches)} started ({len(batch)} frames)")
                    result = claude_vision(batch, prompt, system=PROMPT_1_SYSTEM)
                    print(f"        ✓ Batch {idx + 1}/{len(batches)} done")
                    return idx, result

                screen_specs = [None] * len(batches)
                with ThreadPoolExecutor(max_workers=len(batches)) as pool:
                    for idx, spec in pool.map(_analyze_batch, enumerate(batches)):
                        screen_specs[idx] = spec

                frontend_spec = "\n\n---\n\n".join(screen_specs)
                update_project(project_id, {"frontend_spec": frontend_spec})
                print(f"        {len(screen_specs)} batch(es) analyzed (parallel)")

            # ── Stage 3: Research backend ────────────────────────
            if stored_backend_spec:
                backend_spec = stored_backend_spec
                print(f"  [3/4] Using stored backend spec")
            else:
                update_project(project_id, {"status": STATUS_ANALYZING_BACKEND})
                print(f"  [3/4] Researching backend architecture...")

                prompt = PROMPT_2_USER.format(
                    reference_app=reference_app,
                    frontend_summary=frontend_spec[:2000],
                )
                backend_spec = claude_text(
                    prompt,
                    system=PROMPT_2_SYSTEM,
                    tools=["WebSearch"],
                    timeout=600,
                )
                update_project(project_id, {"backend_spec": backend_spec})
                print(f"        Backend spec written")

        # ── Stage 4: Stitch spec.md ──────────────────────────
        update_project(project_id, {"status": STATUS_STITCHING})
        print(f"  [4/4] Stitching spec.md...")

        brand_overrides = json.dumps(brand_colors) if brand_colors else "None provided"
        prompt = PROMPT_3_USER.format(
            reference_app=reference_app,
            your_app_name=your_app_name,
            brand_overrides=brand_overrides,
            frontend_spec=frontend_spec,
            backend_spec=backend_spec,
        )
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

    except Exception as e:
        update_project(project_id, {"status": STATUS_FAILED, "error_text": str(e)})
        print(f"\n  ✗ Failed: {e}")
        raise

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ──────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Spectr Local Worker — uses claude CLI, no API key needed"
    )
    parser.add_argument("--once", action="store_true",
                        help="Process one pending project then exit")
    parser.add_argument("--project-id",
                        help="Process a specific project ID directly")
    parser.add_argument("--interval", type=int, default=POLL_INTERVAL,
                        help=f"Supabase poll interval in seconds (default: {POLL_INTERVAL})")
    args = parser.parse_args()

    # Sanity check
    if not shutil.which("claude"):
        print("✗ `claude` not found in PATH. Is Claude Code installed?")
        sys.exit(1)
    if not os.getenv("SUPABASE_URL"):
        print("✗ SUPABASE_URL not set. Check your .env file.")
        sys.exit(1)

    print(f"\n  Spectr Local Worker")
    print(f"  {'─' * 40}")
    print(f"  Uses `claude` CLI — no API key needed")
    print(f"  Ctrl+C to stop\n")

    # Direct project mode
    if args.project_id:
        print(f"→ Processing {args.project_id}")
        process_project(args.project_id)
        return

    # Poll loop
    while True:
        try:
            rows = (
                get_db()
                .table("projects")
                .select("id, reference_app")
                .eq("status", STATUS_PENDING)
                .order("created_at")
                .limit(1)
                .execute()
            )
            if rows.data:
                p = rows.data[0]
                print(f"\n→ {p['reference_app']}  ({p['id'][:8]}...)")
                process_project(p["id"])
                if args.once:
                    break
            else:
                print(".", end="", flush=True)

        except KeyboardInterrupt:
            print("\n\nStopped.")
            break
        except Exception as e:
            print(f"\n[error] {e}")

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
