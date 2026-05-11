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
import re
import base64
import io
import shutil
import tempfile
import argparse
import subprocess
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from collections import deque
from threading import Lock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

log = logging.getLogger(__name__)

MAX_IMAGE_DIM = 1920  # Claude API rejects >2000px in multi-image requests


def _resize_frame_for_api(path: str) -> str:
    """Return base64 JPEG of the frame, resized if any dimension > MAX_IMAGE_DIM."""
    from PIL import Image
    img = Image.open(path)
    w, h = img.size
    if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
        scale = MAX_IMAGE_DIM / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


from supabase import create_client
from dotenv import load_dotenv
from services.ffmpeg import extract_frames, compress_video
from services.dedup import deduplicate_frames
from services.bundle import extract_bundle_files
from prompts import (
    PROMPT_1_SYSTEM, PROMPT_1_USER,
    PROMPT_1B_SYSTEM, PROMPT_1B_USER,
    SPEC_SECTION_SYSTEM,
    SPEC_SECTION_DEFINITIONS,
    build_spec_section_prompt,
)
from constants import (
    STATUS_PENDING,
    STATUS_EXTRACTING,
    STATUS_ANALYZING_FRONTEND,
    STATUS_STITCHING,
    STATUS_COMPLETE,
    STATUS_FAILED,
)

load_dotenv(Path(__file__).parent.parent / ".env")

BUCKET = "spectr-uploads"
MAX_FRAMES = int(os.getenv("MAX_FRAMES", 48))
BATCH_SIZE = int(os.getenv("FRAME_BATCH_SIZE", 25))
POLL_INTERVAL = 5  # seconds between Supabase polls

# Model used for vision batches (Haiku is fast and cheap for UI analysis)
VISION_MODEL = os.getenv("VISION_MODEL", "claude-haiku-4-5-20251001")
# Model used for the stitch stage (Sonnet for quality output)
STITCH_MODEL = os.getenv("STITCH_MODEL", "claude-sonnet-4-6")
OUTPUT_MODE = os.getenv("OUTPUT_MODE", "spec")
MAX_TOTAL_RETRIES = int(os.getenv("MAX_TOTAL_RETRIES", 8))
SPEC_SECTION_TIMEOUT = int(os.getenv("SPEC_SECTION_TIMEOUT", "480"))
SPEC_LANE_WORKERS = max(1, min(4, int(os.getenv("SPEC_LANE_WORKERS", "4"))))
SPEC_ANALYSIS_WORKERS = max(1, min(2, int(os.getenv("SPEC_ANALYSIS_WORKERS", "2"))))

SPEC_SECTION_LANES = (
    ("app_overview",),
    ("navigation_structure",),
    ("screen_specifications",),
    ("shared_components",),
    ("design_system",),
    ("implementation_notes",),
    ("claude_code_prompt",),
)

_bucket_mime_ok = False  # cached after first successful allowlist check
_anthropic_client = None  # lazy-initialised when ANTHROPIC_API_KEY is set
_unsupported_project_columns: set[str] = set()
_project_logs: dict[str, deque[str]] = {}
_project_logs_lock = Lock()
MAX_PROJECT_LOG_LINES = int(os.getenv("MAX_PROJECT_LOG_LINES", "200"))


# ──────────────────────────────────────────────
# Anthropic SDK helpers (used when ANTHROPIC_API_KEY is set)
# ──────────────────────────────────────────────

def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("anthropic package not installed — run: pip install anthropic")
        _anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _anthropic_client


def _sdk_extract_text(response) -> str:
    chunks = [block.text for block in response.content if hasattr(block, "text")]
    if chunks:
        return "\n".join(chunk for chunk in chunks if chunk)
    raise RuntimeError(f"No text block in response (stop_reason={response.stop_reason})")


def _claude_text_sdk(prompt: str, system: str = None, tools: list[str] = None,
                     model: str = None, cached_user_prefix: str = None,
                     cache: bool = False) -> str:
    ac = _get_anthropic()
    model = model or STITCH_MODEL

    create_kwargs: dict = {"model": model, "max_tokens": 16000}
    if system:
        if cache:
            create_kwargs["system"] = [
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
            ]
        else:
            create_kwargs["system"] = system
    if tools and "WebSearch" in tools:
        create_kwargs["tools"] = [{"type": "web_search_20250305", "name": "web_search"}]

    if cached_user_prefix:
        user_content = [
            {"type": "text", "text": cached_user_prefix, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": prompt},
        ]
    else:
        user_content = prompt

    messages = [{"role": "user", "content": user_content}]

    for _ in range(15):  # safety cap on agentic turns
        resp = ac.messages.create(**create_kwargs, messages=messages)

        if resp.stop_reason == "end_turn":
            return _sdk_extract_text(resp)

        if resp.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": resp.content})
            tool_results = [
                {"type": "tool_result", "tool_use_id": b.id, "content": ""}
                for b in resp.content
                if b.type == "tool_use"
            ]
            messages.append({"role": "user", "content": tool_results})
        else:
            return _sdk_extract_text(resp)

    raise RuntimeError("Exceeded maximum agentic turns")


def _claude_vision_sdk(frame_paths: list[str], text_prompt: str,
                       system: str = None, model: str = None) -> str:
    ac = _get_anthropic()
    content = []
    for path in frame_paths:
        data = _resize_frame_for_api(path)
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": data},
        })
    content.append({"type": "text", "text": text_prompt})

    create_kwargs: dict = {
        "model": model or VISION_MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": content}],
    }
    if system:
        create_kwargs["system"] = system

    resp = ac.messages.create(**create_kwargs)
    return _sdk_extract_text(resp)


# ──────────────────────────────────────────────
# Claude CLI helpers (fallback when no API key)
# ──────────────────────────────────────────────

def _parse_stream_json(output: str) -> str:
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


def _claude_text_cli(prompt: str, system: str = None, tools: list[str] = None,
                     timeout: int = 300, model: str = None,
                     cached_user_prefix: str = None) -> str:
    if cached_user_prefix:
        prompt = cached_user_prefix + "\n\n" + prompt
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


def _claude_vision_cli(frame_paths: list[str], text_prompt: str,
                       system: str = None, model: str = None) -> str:
    content = []
    for path in frame_paths:
        data = _resize_frame_for_api(path)
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
    if model:
        cmd.extend(["--model", model])
    if system:
        cmd.extend(["--system-prompt", system])

    raw = _run_claude(cmd, stdin_data=stdin_message + "\n", timeout=300)
    return _parse_stream_json(raw)


# ──────────────────────────────────────────────
# Public Claude interface — SDK if key present, CLI otherwise
# ──────────────────────────────────────────────

def claude_text(prompt: str, system: str = None, tools: list[str] = None,
                timeout: int = 300, model: str = None,
                cached_user_prefix: str = None, cache: bool = False) -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        return _claude_text_sdk(prompt, system=system, tools=tools, model=model,
                                cached_user_prefix=cached_user_prefix, cache=cache)
    return _claude_text_cli(prompt, system=system, tools=tools, timeout=timeout, model=model,
                            cached_user_prefix=cached_user_prefix)


def claude_vision(frame_paths: list[str], text_prompt: str, system: str = None, model: str = None) -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        return _claude_vision_sdk(frame_paths, text_prompt, system=system, model=model)
    return _claude_vision_cli(frame_paths, text_prompt, system=system, model=model)


# ──────────────────────────────────────────────
# Supabase helpers
# ──────────────────────────────────────────────

_db = None

LEGACY_PROJECT_SELECT_COLUMNS = ",".join(
    [
        "id",
        "reference_app",
        "your_app_name",
        "brand_colors",
        "mp4_s3_key",
        "frontend_spec",
        "backend_spec",
        "status",
        "frame_count",
        "error_text",
        "logo_s3_key",
        "bundle_id",
        "spec_md_s3_key",
        "bundle_s3_key",
    ]
)

def get_db():
    global _db
    if _db is None:
        _db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    return _db


def reset_project_logs(project_id: str):
    with _project_logs_lock:
        _project_logs[project_id] = deque(maxlen=MAX_PROJECT_LOG_LINES)


def get_project_logs(project_id: str) -> list[str]:
    with _project_logs_lock:
        return list(_project_logs.get(project_id, deque()))


def project_log(project_id: str | None, message: str):
    print(message)
    if not project_id:
        return
    line = f"{time.strftime('%H:%M:%S')} {message.strip()}"
    with _project_logs_lock:
        _project_logs.setdefault(project_id, deque(maxlen=MAX_PROJECT_LOG_LINES)).append(line)


def _extract_missing_project_columns(message: str) -> set[str]:
    missing = set(re.findall(r"column ([a-z_]+) does not exist", message, flags=re.I))
    missing.update(
        re.findall(
            r"Could not find the '([a-z_]+)' column of 'projects' in the schema cache",
            message,
            flags=re.I,
        )
    )
    return missing


def update_project(project_id: str, data: dict):
    global _unsupported_project_columns
    payload = {k: v for k, v in data.items() if k not in _unsupported_project_columns}
    if not payload:
        return
    try:
        get_db().table("projects").update(payload).eq("id", project_id).execute()
    except Exception as exc:
        message = str(exc)
        missing = _extract_missing_project_columns(message)
        if missing:
            _unsupported_project_columns.update(missing)
            filtered = {k: v for k, v in payload.items() if k not in _unsupported_project_columns}
            if filtered:
                get_db().table("projects").update(filtered).eq("id", project_id).execute()
            return
        raise


def refund_credit_for_failed_project(client, project_id: str) -> None:
    """Flips a consumed credit back to 'available' when an auto project fails.

    No-op if the project is in manual mode (no credit was consumed) or if no
    matching consumed credit exists. Best-effort: errors are logged but do not
    propagate, so a refund failure does not mask the underlying project failure.
    """
    try:
        project = (
            client.table("projects")
            .select("processing_mode")
            .eq("id", project_id)
            .single()
            .execute()
            .data
        )
        if not project or project.get("processing_mode") != "auto":
            return
        client.table("spec_credits").update({
            "status": "available",
            "consumed_at": None,
            "project_id": None,
        }).eq("project_id", project_id).eq("status", "consumed").execute()
        log.info("Refunded credit for failed auto project %s", project_id)
    except Exception as exc:
        log.error("Refund failed for project %s: %s", project_id, exc)


def maybe_send_manual_completion_email(client, project_id: str) -> None:
    """If the project is manual, send the user a completion email.

    Best-effort: errors are logged but do not propagate. Skips if user email
    cannot be looked up or RESEND_API_KEY is not set (the helper itself
    handles that case).
    """
    try:
        from notify import send_manual_completion_email
    except ImportError as exc:
        log.error("notify module unavailable for project %s: %s", project_id, exc)
        return

    try:
        project = (
            client.table("projects")
            .select("user_id, processing_mode, spec_md_s3_key")
            .eq("id", project_id)
            .single()
            .execute()
            .data
        )
        if not project or project.get("processing_mode") != "manual":
            return

        spec_key = project.get("spec_md_s3_key")
        if not spec_key:
            log.warning("Manual project %s has no spec_md_s3_key, skipping email", project_id)
            return

        # Look up user email via auth admin API.
        user_id = project["user_id"]
        try:
            user = client.auth.admin.get_user_by_id(user_id)
            user_email = user.user.email if user and user.user else None
        except Exception as exc:
            log.error("Failed to look up user %s for project %s: %s", user_id, project_id, exc)
            return

        # Generate a 24h signed URL for the spec.
        signed = client.storage.from_(BUCKET).create_signed_url(spec_key, 60 * 60 * 24)
        signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
        if not signed_url:
            log.error("No signed URL returned for project %s", project_id)
            return

        send_manual_completion_email(
            user_email=user_email,
            project_id=project_id,
            signed_url=signed_url,
        )
    except Exception as exc:
        log.error("maybe_send_manual_completion_email failed for %s: %s", project_id, exc)


def load_project(project_id: str) -> dict:
    project = (
        get_db()
        .table("projects")
        .select(LEGACY_PROJECT_SELECT_COLUMNS)
        .eq("id", project_id)
        .single()
        .execute()
        .data
    )
    for key in ("screen_analysis", "transitions", "canonical_schema", "repair_attempts", "total_retries"):
        project.setdefault(key, None)
    return project


def extract_json_object(text: str):
    text = (text or "").strip()
    if not text:
        raise ValueError("empty response")
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("response did not contain a JSON object")
    return json.loads(text[start:end + 1])


def increment_retry_budget(project_id: str, state: dict, *, repair: bool = False):
    state["total_retries"] += 1
    update_project(
        project_id,
        {
            "total_retries": state["total_retries"],
            **({"repair_attempts": state["repair_attempts"]} if repair else {}),
        },
    )
    if state["total_retries"] > MAX_TOTAL_RETRIES:
        raise RuntimeError(f"Retry budget exceeded ({state['total_retries']} > {MAX_TOTAL_RETRIES})")


def run_vision_batches(
    batches: list[list[str]],
    *,
    prompt_template: str,
    system_prompt: str,
    reference_app: str,
    pass_name: str,
    project_id: str | None = None,
) -> list[str]:
    """Run a batch-oriented vision pass with retries while preserving batch order."""
    project_log(project_id, f"        {len(batches)} batch(es) × {BATCH_SIZE} frames — running {pass_name} in parallel...")

    def _analyze_batch(args):
        idx, batch = args
        prompt = prompt_template.format(n=len(batch), reference_app=reference_app)
        project_log(project_id, f"        → {pass_name} batch {idx + 1}/{len(batches)} started ({len(batch)} frames)")
        last_exc = None
        for attempt in range(3):
            try:
                result = claude_vision(batch, prompt, system=system_prompt)
                project_log(project_id, f"        ✓ {pass_name} batch {idx + 1}/{len(batches)} done")
                return result
            except Exception as exc:
                last_exc = exc
                wait = 2 ** attempt
                project_log(
                    project_id,
                    f"        ! {pass_name} batch {idx + 1}/{len(batches)} "
                    f"attempt {attempt + 1} failed: {exc}; retrying in {wait}s",
                )
                time.sleep(wait)
        raise last_exc

    with ThreadPoolExecutor(max_workers=min(len(batches), 4)) as pool:
        return list(pool.map(_analyze_batch, enumerate(batches)))


def normalize_spec_section_markdown(raw_markdown: str) -> str:
    clean_text, _ = extract_bundle_files(raw_markdown or "")
    text = clean_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def extract_top_level_markdown_headings(markdown: str) -> list[str]:
    return re.findall(r"^## [^\n]+", markdown, flags=re.MULTILINE)


def validate_spec_section_content(section: dict, raw_markdown: str) -> str:
    text = normalize_spec_section_markdown(raw_markdown)
    first_heading = section["top_level_headings"][0]
    first_index = text.find(first_heading)
    if first_index == -1:
        raise ValueError(f"{section['filename']} is missing required heading: {first_heading}")

    text = text[first_index:].strip()
    headings = extract_top_level_markdown_headings(text)
    expected_headings = list(section["top_level_headings"])
    if headings != expected_headings:
        raise ValueError(
            f"{section['filename']} must contain only these top-level headings: {expected_headings}; got {headings}"
        )

    for required in section.get("required_substrings", ()):
        if required not in text:
            raise ValueError(f"{section['filename']} is missing required content: {required}")

    return text


def assemble_spec_document(
    *,
    reference_app: str,
    your_app_name: str,
    section_markdown: list[str],
) -> str:
    header = (
        f"# {your_app_name} — Frontend Specification\n"
        f"> Generated by Spectr | Reference app: {reference_app}"
    )
    return "\n\n---\n\n".join([header, *section_markdown]).strip() + "\n"


def validate_complete_spec_document(
    *,
    spec_markdown: str,
    your_app_name: str,
) -> str:
    text = normalize_spec_section_markdown(spec_markdown)
    expected_header = f"# {your_app_name} — Frontend Specification"
    if not text.startswith(expected_header):
        raise ValueError(f"Final spec is missing expected title header: {expected_header}")

    headings = extract_top_level_markdown_headings(text)
    expected_headings = [section["top_level_headings"][0] for section in SPEC_SECTION_DEFINITIONS]
    if headings != expected_headings:
        raise ValueError(f"Final spec top-level headings mismatch: expected {expected_headings}, got {headings}")

    return text if text.endswith("\n") else text + "\n"


def _generate_spec_section(
    *,
    section: dict,
    section_index: int,
    total_sections: int,
    reference_app: str,
    your_app_name: str,
    brand_overrides: str,
    frontend_spec: str,
    project_id: str,
    output_dir: Path,
) -> str:
    project_log(project_id, f"        → writing section {section_index}/{total_sections}: {section['filename']}")
    cached_prefix, suffix = build_spec_section_prompt(
        section=section,
        reference_app=reference_app,
        your_app_name=your_app_name,
        brand_overrides=brand_overrides,
        frontend_spec=frontend_spec,
        split=True,
    )

    last_error = None
    for attempt in range(3):
        try:
            raw_section = claude_text(
                suffix,
                system=SPEC_SECTION_SYSTEM,
                timeout=SPEC_SECTION_TIMEOUT,
                model=STITCH_MODEL,
                cached_user_prefix=cached_prefix,
                cache=True,
            )
            clean_section = validate_spec_section_content(section, raw_section)
            (output_dir / section["filename"]).write_text(clean_section + "\n", encoding="utf-8")
            project_log(project_id, f"        ✓ section {section_index}/{total_sections} done")
            return clean_section
        except Exception as exc:
            last_error = exc
            if attempt == 2:
                break
            wait = 2 ** attempt
            project_log(
                project_id,
                f"        ! section {section_index}/{total_sections} "
                f"attempt {attempt + 1} failed: {exc}; retrying in {wait}s",
            )
            time.sleep(wait)

    # All retries exhausted — write a degraded placeholder so the rest of the
    # bundle can still be assembled and delivered. A partial spec beats no spec.
    placeholder = (
        f"{section['top_level_headings'][0]}\n\n"
        f"> ⚠️ This section could not be generated automatically "
        f"(error: {last_error}). "
        f"Please re-run the project or fill in this section manually.\n"
    )
    (output_dir / section["filename"]).write_text(placeholder + "\n", encoding="utf-8")
    project_log(
        project_id,
        f"        ⚠️ section {section_index}/{total_sections} failed after 3 attempts — "
        f"placeholder written, continuing build",
    )
    return placeholder


def _run_spec_lane(
    *,
    lane_keys: tuple[str, ...],
    section_lookup: dict[str, dict],
    section_indices: dict[str, int],
    total_sections: int,
    reference_app: str,
    your_app_name: str,
    brand_overrides: str,
    frontend_spec: str,
    project_id: str,
    output_dir: Path,
) -> dict[int, str]:
    lane_results: dict[int, str] = {}
    for key in lane_keys:
        section = section_lookup[key]
        index = section_indices[key]
        lane_results[index] = _generate_spec_section(
            section=section,
            section_index=index,
            total_sections=total_sections,
            reference_app=reference_app,
            your_app_name=your_app_name,
            brand_overrides=brand_overrides,
            frontend_spec=frontend_spec,
            project_id=project_id,
            output_dir=output_dir,
        )
    return lane_results


def generate_sectioned_spec(
    *,
    reference_app: str,
    your_app_name: str,
    brand_colors: dict,
    frontend_spec: str,
    project_id: str,
    output_dir: Path,
) -> str:
    brand_overrides = json.dumps(brand_colors) if brand_colors else "None provided"
    output_dir.mkdir(parents=True, exist_ok=True)
    total_sections = len(SPEC_SECTION_DEFINITIONS)
    section_lookup = {section["key"]: section for section in SPEC_SECTION_DEFINITIONS}
    section_indices = {section["key"]: index for index, section in enumerate(SPEC_SECTION_DEFINITIONS, start=1)}
    lane_keys = [tuple(key for key in lane if key in section_lookup) for lane in SPEC_SECTION_LANES]
    lane_keys = [lane for lane in lane_keys if lane]
    assigned_keys = {key for lane in lane_keys for key in lane}
    unassigned_keys = tuple(section["key"] for section in SPEC_SECTION_DEFINITIONS if section["key"] not in assigned_keys)
    if unassigned_keys:
        lane_keys.append(unassigned_keys)

    section_outputs_by_index: dict[int, str] = {}
    project_log(project_id, f"        running spec sections in {min(SPEC_LANE_WORKERS, len(lane_keys) or 1)} concurrent lane(s)")
    with ThreadPoolExecutor(max_workers=min(SPEC_LANE_WORKERS, len(lane_keys) or 1)) as pool:
        futures = [
            pool.submit(
                _run_spec_lane,
                lane_keys=lane,
                section_lookup=section_lookup,
                section_indices=section_indices,
                total_sections=total_sections,
                reference_app=reference_app,
                your_app_name=your_app_name,
                brand_overrides=brand_overrides,
                frontend_spec=frontend_spec,
                project_id=project_id,
                output_dir=output_dir,
            )
            for lane in lane_keys
        ]
        for future in futures:
            section_outputs_by_index.update(future.result())

    section_outputs = [section_outputs_by_index[index] for index in range(1, total_sections + 1)]

    assembled = assemble_spec_document(
        reference_app=reference_app,
        your_app_name=your_app_name,
        section_markdown=section_outputs,
    )
    return validate_complete_spec_document(
        spec_markdown=assembled,
        your_app_name=your_app_name,
    )


# ──────────────────────────────────────────────
# Pipeline
# ──────────────────────────────────────────────

def process_project_spec(project_id: str):
    client = get_db()
    reset_project_logs(project_id)
    project_log(project_id, f"[spec] Starting project {project_id}")
    project = (
        client.table("projects")
        .select("reference_app, your_app_name, brand_colors, mp4_s3_key, frontend_spec")
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

    tmpdir = tempfile.mkdtemp(prefix=f"spectr_{project_id[:8]}_")
    try:
        if stored_frontend_spec:
            frontend_spec = stored_frontend_spec
            project_log(project_id, "  [1-2/3] Resuming from stored frontend analysis")
        else:
            update_project(project_id, {"status": STATUS_EXTRACTING})
            project_log(project_id, "  [1/3] Downloading MP4 from Supabase Storage...")

            mp4_path = f"{tmpdir}/input.mp4"
            mp4_bytes = client.storage.from_(BUCKET).download(project["mp4_s3_key"])
            with open(mp4_path, "wb") as f:
                f.write(mp4_bytes)

            process_path, was_compressed = compress_video(mp4_path)
            frames_dir = f"{tmpdir}/frames"
            try:
                all_frames = extract_frames(process_path, frames_dir)
            finally:
                if was_compressed:
                    os.unlink(process_path)
            unique = deduplicate_frames(all_frames)

            if len(unique) > MAX_FRAMES:
                step = max(1, len(unique) // MAX_FRAMES)
                unique = unique[::step][:MAX_FRAMES]

            update_project(project_id, {"frame_count": len(unique)})
            project_log(project_id, f"        {len(all_frames)} total → {len(unique)} unique frames")

            update_project(project_id, {"status": STATUS_ANALYZING_FRONTEND})
            project_log(project_id, "  [2/3] Analyzing UI with Claude vision...")

            batches = [unique[i:i + BATCH_SIZE] for i in range(0, len(unique), BATCH_SIZE)]
            project_log(project_id, f"        running screen analysis and design-token extraction with {SPEC_ANALYSIS_WORKERS} concurrent pass(es)")
            with ThreadPoolExecutor(max_workers=SPEC_ANALYSIS_WORKERS) as pool:
                screen_future = pool.submit(
                    run_vision_batches,
                    batches,
                    prompt_template=PROMPT_1_USER,
                    system_prompt=PROMPT_1_SYSTEM,
                    reference_app=reference_app,
                    pass_name="screen analysis",
                    project_id=project_id,
                )
                design_future = pool.submit(
                    run_vision_batches,
                    batches,
                    prompt_template=PROMPT_1B_USER,
                    system_prompt=PROMPT_1B_SYSTEM,
                    reference_app=reference_app,
                    pass_name="design token extraction",
                    project_id=project_id,
                )
                screen_specs = screen_future.result()
                design_token_specs = design_future.result()

            frontend_spec = (
                "\n\n---\n\n".join(screen_specs)
                + "\n\n---\n## DESIGN TOKENS\n---\n\n"
                + "\n\n---\n\n".join(design_token_specs)
            )
            update_project(project_id, {"frontend_spec": frontend_spec})
            project_log(
                project_id,
                f"        {len(screen_specs)} screen batch(es) analyzed and "
                f"{len(design_token_specs)} design-token batch(es) extracted",
            )

        update_project(project_id, {"status": STATUS_STITCHING})
        project_log(project_id, "  [3/3] Writing spec.md...")
        clean_spec = generate_sectioned_spec(
            reference_app=reference_app,
            your_app_name=your_app_name,
            brand_colors=brand_colors,
            frontend_spec=frontend_spec,
            project_id=project_id,
            output_dir=Path(tmpdir) / "spec_sections",
        )

        spec_key = f"{project_id}/spec.md"
        client.storage.from_(BUCKET).upload(
            path=spec_key,
            file=clean_spec.encode("utf-8"),
            file_options={"content-type": "text/markdown", "upsert": "true"},
        )

        update_project(project_id, {
            "status": STATUS_COMPLETE,
            "spec_md_s3_key": spec_key,
            "spec_md_text": clean_spec,
            "bundle_s3_key": None,
            "backend_spec": None,
        })
        project_log(project_id, "  ✓ Done — spec.md uploaded to Storage")
        maybe_send_manual_completion_email(get_db(), project_id)

    except Exception as e:
        update_project(project_id, {"status": STATUS_FAILED, "error_text": str(e)})
        refund_credit_for_failed_project(get_db(), project_id)
        project_log(project_id, f"  ✗ Failed: {e}")
        raise

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def process_project_from_screenshots(project_id: str):
    """Gallery path: the API already uploaded App Store preview screenshots into
    spectr-uploads/<project_id>/screenshots/. Skip ffmpeg extraction, feed the
    files straight into Stage 2 (vision analysis) + Stage 3 (spec gen).

    Intentionally duplicates the Stage 2/3 flow from process_project_spec
    rather than refactoring — the two flows are likely to diverge as we tune
    the prompt set for the screenshot-only path (coverage is thinner, so the
    spec-gen prompt may need different guidance)."""
    client = get_db()
    reset_project_logs(project_id)
    project_log(project_id, f"[gallery] Starting project {project_id}")
    project = (
        client.table("projects")
        .select("reference_app, your_app_name, brand_colors, frontend_spec")
        .eq("id", project_id)
        .single()
        .execute()
        .data
    )

    reference_app = project["reference_app"]
    your_app_name = project.get("your_app_name") or reference_app
    brand_colors = project.get("brand_colors") or {}
    stored_frontend_spec = project.get("frontend_spec")

    tmpdir = tempfile.mkdtemp(prefix=f"spectr_gallery_{project_id[:8]}_")
    try:
        if stored_frontend_spec:
            frontend_spec = stored_frontend_spec
            project_log(project_id, "  [1-2/3] Resuming from stored frontend analysis")
        else:
            update_project(project_id, {"status": STATUS_EXTRACTING})
            project_log(project_id, "  [1/3] Downloading App Store screenshots from Supabase Storage...")

            prefix = f"{project_id}/screenshots"
            try:
                listed = client.storage.from_(BUCKET).list(prefix)
            except Exception as e:
                raise RuntimeError(f"Could not list screenshots: {e}") from e
            if not listed:
                raise RuntimeError("No screenshots found at {}/{}".format(BUCKET, prefix))

            frames_dir = Path(tmpdir) / "frames"
            frames_dir.mkdir()
            frame_paths: list[str] = []
            # Sort so order mirrors the upload order (000.jpg, 001.jpg, ...)
            for i, item in enumerate(sorted(listed, key=lambda x: x.get("name", ""))):
                name = item.get("name")
                if not name:
                    continue
                key = f"{prefix}/{name}"
                data = client.storage.from_(BUCKET).download(key)
                suffix = Path(name).suffix or ".jpg"
                fpath = frames_dir / f"{i:03d}{suffix}"
                fpath.write_bytes(data)
                frame_paths.append(str(fpath))

            if not frame_paths:
                raise RuntimeError("Downloaded zero screenshot bytes")

            update_project(project_id, {"frame_count": len(frame_paths)})
            project_log(project_id, f"        {len(frame_paths)} screenshots downloaded")

            update_project(project_id, {"status": STATUS_ANALYZING_FRONTEND})
            project_log(project_id, "  [2/3] Analyzing UI with Claude vision...")

            batches = [frame_paths[i:i + BATCH_SIZE] for i in range(0, len(frame_paths), BATCH_SIZE)]
            project_log(
                project_id,
                f"        running screen analysis and design-token extraction with {SPEC_ANALYSIS_WORKERS} concurrent pass(es)",
            )
            with ThreadPoolExecutor(max_workers=SPEC_ANALYSIS_WORKERS) as pool:
                screen_future = pool.submit(
                    run_vision_batches,
                    batches,
                    prompt_template=PROMPT_1_USER,
                    system_prompt=PROMPT_1_SYSTEM,
                    reference_app=reference_app,
                    pass_name="screen analysis",
                    project_id=project_id,
                )
                design_future = pool.submit(
                    run_vision_batches,
                    batches,
                    prompt_template=PROMPT_1B_USER,
                    system_prompt=PROMPT_1B_SYSTEM,
                    reference_app=reference_app,
                    pass_name="design token extraction",
                    project_id=project_id,
                )
                screen_specs = screen_future.result()
                design_token_specs = design_future.result()

            frontend_spec = (
                "\n\n---\n\n".join(screen_specs)
                + "\n\n---\n## DESIGN TOKENS\n---\n\n"
                + "\n\n---\n\n".join(design_token_specs)
            )
            update_project(project_id, {"frontend_spec": frontend_spec})
            project_log(
                project_id,
                f"        {len(screen_specs)} screen batch(es) analyzed and "
                f"{len(design_token_specs)} design-token batch(es) extracted",
            )

        update_project(project_id, {"status": STATUS_STITCHING})
        project_log(project_id, "  [3/3] Writing spec.md...")
        clean_spec = generate_sectioned_spec(
            reference_app=reference_app,
            your_app_name=your_app_name,
            brand_colors=brand_colors,
            frontend_spec=frontend_spec,
            project_id=project_id,
            output_dir=Path(tmpdir) / "spec_sections",
        )

        spec_key = f"{project_id}/spec.md"
        client.storage.from_(BUCKET).upload(
            path=spec_key,
            file=clean_spec.encode("utf-8"),
            file_options={"content-type": "text/markdown", "upsert": "true"},
        )

        update_project(project_id, {
            "status": STATUS_COMPLETE,
            "spec_md_s3_key": spec_key,
            "spec_md_text": clean_spec,
            "bundle_s3_key": None,
            "backend_spec": None,
        })
        project_log(project_id, "  \u2713 Done \u2014 spec.md uploaded to Storage")
        maybe_send_manual_completion_email(get_db(), project_id)

    except Exception as e:
        update_project(project_id, {"status": STATUS_FAILED, "error_text": str(e)})
        refund_credit_for_failed_project(get_db(), project_id)
        project_log(project_id, f"  \u2717 Failed: {e}")
        raise

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def process_project(project_id: str):
    """Dispatch based on processing_mode. The gallery path uses pre-extracted
    App Store screenshots; everything else runs the MP4 pipeline."""
    try:
        client = get_db()
        row = (
            client.table("projects")
            .select("processing_mode")
            .eq("id", project_id)
            .single()
            .execute()
            .data
        )
        mode = (row or {}).get("processing_mode") or "auto"
    except Exception as e:
        log.warning("process_project: could not read processing_mode for %s: %s", project_id, e)
        mode = "auto"
    if mode == "gallery":
        return process_project_from_screenshots(project_id)
    return process_project_spec(project_id)


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
    print(f"  Output mode: {OUTPUT_MODE}")
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
