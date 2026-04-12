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
import shutil
import tempfile
import argparse
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from collections import deque
from threading import Lock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client
from dotenv import load_dotenv
from services.ffmpeg import extract_frames, compress_video
from services.dedup import deduplicate_frames
from services.bundle import extract_bundle_files, create_bundle_zip
from services.mobile_scaffold import (
    build_fixed_mobile_files,
    build_route_manifest,
    ensure_locked_mobile_files,
    extract_scaffold_api,
    extract_design_tokens,
    merge_files,
    slugify_name,
    validate_mobile_project,
)
from services.schema_synthesis import synthesize_schema
from prompts import (
    PROMPT_1_SYSTEM, PROMPT_1_USER,
    SCREEN_JSON_SYSTEM, SCREEN_JSON_USER,
    PROMPT_1B_SYSTEM, PROMPT_1B_USER,
    TRANSITION_ANALYSIS_SYSTEM, TRANSITION_ANALYSIS_USER,
    MOBILE_FRONTEND_SYSTEM, MOBILE_FRONTEND_USER,
    MOBILE_VIEW_MODEL_SYSTEM, MOBILE_VIEW_MODEL_USER,
    MOBILE_REPAIR_SYSTEM, MOBILE_REPAIR_USER,
    PROMPT_2_SYSTEM, PROMPT_2_USER,
    PROMPT_3_SYSTEM, PROMPT_3_USER,
    SPEC_SECTION_SYSTEM,
    SPEC_SECTION_DEFINITIONS,
    build_spec_section_prompt,
)
from constants import (
    STATUS_PENDING,
    STATUS_EXTRACTING,
    STATUS_ANALYZING_SCREENS,
    STATUS_ANALYZING_TRANSITIONS,
    STATUS_SYNTHESIZING_SCHEMA,
    STATUS_GENERATING_BACKEND,
    STATUS_GENERATING_FRONTEND,
    STATUS_VALIDATING,
    STATUS_REPAIRING,
    STATUS_BUNDLING,
    STATUS_ANALYZING_FRONTEND,
    STATUS_ANALYZING_BACKEND,
    STATUS_STITCHING,
    STATUS_COMPLETE,
    STATUS_FAILED,
)

load_dotenv(Path(__file__).parent.parent / ".env")

BUCKET = "spectr-uploads"
MAX_FRAMES = int(os.getenv("MAX_FRAMES", 24))
BATCH_SIZE = int(os.getenv("FRAME_BATCH_SIZE", 25))
STRUCTURED_BATCH_SIZE = int(os.getenv("STRUCTURED_SCREEN_BATCH_SIZE", "8"))
POLL_INTERVAL = 5  # seconds between Supabase polls

# Model used for vision batches (Haiku is fast and cheap for UI analysis)
VISION_MODEL = os.getenv("VISION_MODEL", "claude-haiku-4-5-20251001")
# Model used for the stitch stage (Sonnet for quality output)
STITCH_MODEL = os.getenv("STITCH_MODEL", "claude-sonnet-4-6")
OUTPUT_MODE = os.getenv("OUTPUT_MODE", "spec")
MAX_TOTAL_RETRIES = int(os.getenv("MAX_TOTAL_RETRIES", 8))
TRANSITION_WORKERS = max(1, int(os.getenv("TRANSITION_WORKERS", "4")))
SPEC_SECTION_TIMEOUT = int(os.getenv("SPEC_SECTION_TIMEOUT", "480"))
SPEC_LANE_WORKERS = max(1, min(2, int(os.getenv("SPEC_LANE_WORKERS", "2"))))
SPEC_ANALYSIS_WORKERS = max(1, min(2, int(os.getenv("SPEC_ANALYSIS_WORKERS", "2"))))

SPEC_SECTION_LANES = (
    ("app_overview", "navigation_structure", "implementation_notes", "claude_code_prompt"),
    ("screen_specifications", "shared_components", "design_system"),
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
                     model: str = None) -> str:
    ac = _get_anthropic()
    model = model or STITCH_MODEL

    create_kwargs: dict = {"model": model, "max_tokens": 16000}
    if system:
        create_kwargs["system"] = system
    if tools and "WebSearch" in tools:
        create_kwargs["tools"] = [{"type": "web_search_20250305", "name": "web_search"}]

    messages = [{"role": "user", "content": prompt}]

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
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
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
                     timeout: int = 300, model: str = None) -> str:
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
                timeout: int = 300, model: str = None) -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        return _claude_text_sdk(prompt, system=system, tools=tools, model=model)
    return _claude_text_cli(prompt, system=system, tools=tools, timeout=timeout, model=model)


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


def ensure_bucket_allows_bundle_uploads(client) -> None:
    """Expand the bucket MIME allowlist so bundle.zip uploads don't fail."""
    global _bucket_mime_ok
    if _bucket_mime_ok:
        return

    bucket = client.storage.get_bucket(BUCKET)
    allowed = getattr(bucket, "allowed_mime_types", None)

    # No allowlist means unrestricted uploads.
    if not allowed or "application/zip" in allowed:
        _bucket_mime_ok = True
        return

    client.storage.update_bucket(BUCKET, {
        "allowed_mime_types": [*allowed, "application/zip"],
    })
    _bucket_mime_ok = True
    project_log(None, "        Updated bucket allowlist to include application/zip")


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


def run_structured_screen_batches(
    batches: list[list[str]],
    *,
    reference_app: str,
    project_id: str,
    retry_state: dict,
) -> list[dict]:
    structured: list[dict] = []
    for idx, batch in enumerate(batches):
        prompt = SCREEN_JSON_USER.format(n=len(batch), reference_app=reference_app)
        project_log(project_id, f"        → structured screen batch {idx + 1}/{len(batches)} started ({len(batch)} frames)")
        for attempt in range(3):
            try:
                response = claude_vision(batch, prompt, system=SCREEN_JSON_SYSTEM, model=VISION_MODEL)
                payload = extract_json_object(response)
                screens = payload.get("screens")
                if not isinstance(screens, list) or not screens:
                    raise ValueError("structured screen response missing screens[]")
                structured.extend(screen for screen in screens if isinstance(screen, dict))
                project_log(project_id, f"        ✓ structured screen batch {idx + 1}/{len(batches)} done")
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                increment_retry_budget(project_id, retry_state)
                wait = 2 ** attempt
                project_log(
                    project_id,
                    f"        ! structured screen batch {idx + 1}/{len(batches)} "
                    f"attempt {attempt + 1} failed: {exc}; retrying in {wait}s",
                )
                time.sleep(wait)
    return structured


def merge_structured_screens(items: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for item in items:
        route = item.get("route") or item.get("name") or f"/screen-{len(merged) + 1}"
        key = str(route)
        if key not in merged:
            merged[key] = {
                "name": item.get("name", "Screen"),
                "route": route,
                "purpose": item.get("purpose", ""),
                "states": [],
                "actions": [],
                "visible_entities": {},
            }
        target = merged[key]
        target["states"] = sorted({*target["states"], *(item.get("states") or [])})
        target["actions"] = sorted({*target["actions"], *(item.get("actions") or [])})
        visible = item.get("visible_entities") or {}
        for entity, fields in visible.items():
            target["visible_entities"].setdefault(entity, [])
            target["visible_entities"][entity] = sorted({*target["visible_entities"][entity], *(fields or [])})
        if item.get("purpose") and not target["purpose"]:
            target["purpose"] = item["purpose"]
        if item.get("name") and target["name"] == "Screen":
            target["name"] = item["name"]
    return list(merged.values())


def analyze_transitions(
    frames: list[str],
    *,
    reference_app: str,
    project_id: str,
    retry_state: dict,
) -> list[dict]:
    transitions: list[dict | None] = [None] * max(0, len(frames) - 1)
    if len(frames) < 2:
        return []

    retry_lock = Lock()

    def _analyze(index: int) -> dict | None:
        frame_pair = [frames[index], frames[index + 1]]
        project_log(project_id, f"        → transition {index + 1}/{len(frames) - 1} started")
        for attempt in range(3):
            try:
                response = claude_vision(
                    frame_pair,
                    TRANSITION_ANALYSIS_USER.format(reference_app=reference_app),
                    system=TRANSITION_ANALYSIS_SYSTEM,
                    model=VISION_MODEL,
                )
                payload = extract_json_object(response)
                required = {"from_screen", "to_screen", "user_action", "implied_data_operation", "implied_entities"}
                if not required.issubset(payload):
                    raise ValueError("transition response missing required keys")
                project_log(project_id, f"        ✓ transition {index + 1}/{len(frames) - 1} done")
                return payload
            except Exception as exc:
                if attempt == 2:
                    project_log(project_id, f"        ! transition {index + 1}/{len(frames) - 1} skipped: {exc}")
                    return None
                with retry_lock:
                    increment_retry_budget(project_id, retry_state)
                wait = 2 ** attempt
                project_log(
                    project_id,
                    f"        ! transition {index + 1}/{len(frames) - 1} "
                    f"attempt {attempt + 1} failed: {exc}; retrying in {wait}s",
                )
                time.sleep(wait)

    with ThreadPoolExecutor(max_workers=min(len(transitions), TRANSITION_WORKERS)) as pool:
        for index, payload in enumerate(pool.map(_analyze, range(len(transitions)))):
            transitions[index] = payload

    return [payload for payload in transitions if payload is not None]


def build_view_model_prompt(
    *,
    reference_app: str,
    your_app_name: str,
    screen_analysis: list[dict],
    route_manifest: list[dict],
    canonical_schema: dict,
    base_files: dict[str, str],
    design_tokens: str,
    scaffold_api: str,
) -> str:
    return MOBILE_VIEW_MODEL_USER.format(
        reference_app=reference_app,
        your_app_name=your_app_name,
        route_manifest=json.dumps(route_manifest, indent=2),
        screen_analysis_json=json.dumps(screen_analysis, indent=2),
        design_tokens=design_tokens,
        canonical_schema=json.dumps(canonical_schema, indent=2),
        typescript_contract=base_files["src/lib/types.ts"],
        scaffold_api=scaffold_api,
    )


def build_route_prompt(
    *,
    reference_app: str,
    your_app_name: str,
    route_entry: dict,
    route_manifest: list[dict],
    canonical_schema: dict,
    design_tokens: str,
    scaffold_api: str,
    view_model_contract: str,
) -> str:
    route_params = ", ".join(route_entry.get("params") or []) or "none"
    return MOBILE_FRONTEND_USER.format(
        reference_app=reference_app,
        your_app_name=your_app_name,
        route_file=route_entry["file_path"],
        route_path=route_entry["route"],
        route_key=route_entry["route_key"],
        route_params=route_params,
        scaffold_api=scaffold_api,
        view_model_contract=view_model_contract,
        route_manifest=json.dumps(route_manifest, indent=2),
        route_screen_json=json.dumps(route_entry, indent=2),
        design_tokens=design_tokens,
        canonical_schema=json.dumps(canonical_schema, indent=2),
    )


def _filter_route_generated_files(route_entry: dict, generated_files: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    feature_root = f"src/features/{route_entry['route_key']}/"
    allowed: dict[str, str] = {}
    rejected: list[str] = []
    for path, content in generated_files.items():
        if path == route_entry["file_path"] or path.startswith(feature_root):
            allowed[path] = content
        else:
            rejected.append(path)
    return allowed, rejected


def _filter_repair_generated_files(target: dict, generated_files: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    if target["kind"] == "view-models":
        allowed_paths = {"src/lib/view-models.ts"}
        allowed = {path: content for path, content in generated_files.items() if path in allowed_paths}
        rejected = [path for path in generated_files if path not in allowed_paths]
        return allowed, rejected
    return _filter_route_generated_files(target["route_entry"], generated_files)


def _extract_relevant_error_lines(validation_errors: str, owned_files: list[str]) -> str:
    lines = validation_errors.splitlines()
    if not lines:
        return validation_errors
    header = [lines[0]]
    matches = [line for line in lines[1:] if any(path in line for path in owned_files)]
    return "\n".join(header + matches) if matches else validation_errors


def build_repair_targets(
    *,
    failing_files: list[str],
    route_manifest: list[dict],
    files: dict[str, str],
) -> list[dict]:
    targets: list[dict] = []
    if "src/lib/view-models.ts" in failing_files or "src/lib/view-models.ts" not in files:
        targets.append(
            {
                "id": "view-models",
                "kind": "view-models",
                "label": "src/lib/view-models.ts",
                "owned_files": ["src/lib/view-models.ts"],
            }
        )

    for route_entry in route_manifest:
        feature_root = f"src/features/{route_entry['route_key']}/"
        owned_files = [route_entry["file_path"], *sorted(path for path in files if path.startswith(feature_root))]
        if any(path == route_entry["file_path"] or path.startswith(feature_root) for path in failing_files):
            targets.append(
                {
                    "id": route_entry["route_key"],
                    "kind": "route",
                    "label": route_entry["file_path"],
                    "owned_files": owned_files,
                    "route_entry": route_entry,
                }
            )
    return targets


def generate_mobile_frontend(
    *,
    reference_app: str,
    your_app_name: str,
    screen_analysis: list[dict],
    route_manifest: list[dict],
    canonical_schema: dict,
    base_files: dict[str, str],
    project_id: str,
    retry_state: dict,
    frontend_spec: str,
) -> dict[str, str]:
    design_tokens = extract_design_tokens(frontend_spec) or "No design token block was extracted."
    scaffold_api = extract_scaffold_api(base_files, route_manifest)
    repair_logs: list[str] = []
    files = dict(base_files)

    project_log(project_id, "        → generating view-model contract")
    view_model_prompt = build_view_model_prompt(
        reference_app=reference_app,
        your_app_name=your_app_name,
        screen_analysis=screen_analysis,
        route_manifest=route_manifest,
        canonical_schema=canonical_schema,
        base_files=base_files,
        design_tokens=design_tokens,
        scaffold_api=scaffold_api,
    )
    view_model_raw = claude_text(
        view_model_prompt,
        system=MOBILE_VIEW_MODEL_SYSTEM,
        timeout=900,
        model=STITCH_MODEL,
    )
    _, view_model_files = extract_bundle_files(view_model_raw)
    if "src/lib/view-models.ts" not in view_model_files:
        raise RuntimeError("View-model generation did not return src/lib/view-models.ts")
    files = merge_files(files, {"src/lib/view-models.ts": view_model_files["src/lib/view-models.ts"]})
    files, restored = ensure_locked_mobile_files(files, base_files)
    if restored:
        project_log(project_id, f"        ! restored locked scaffold files after view-model generation: {', '.join(restored)}")

    for index, route_entry in enumerate(route_manifest, start=1):
        project_log(project_id, f"        → route {index}/{len(route_manifest)} started ({route_entry['file_path']})")
        route_prompt = build_route_prompt(
            reference_app=reference_app,
            your_app_name=your_app_name,
            route_entry=route_entry,
            route_manifest=route_manifest,
            canonical_schema=canonical_schema,
            design_tokens=design_tokens,
            scaffold_api=scaffold_api,
            view_model_contract=files["src/lib/view-models.ts"],
        )
        raw = claude_text(route_prompt, system=MOBILE_FRONTEND_SYSTEM, timeout=900, model=STITCH_MODEL)
        _, generated_files = extract_bundle_files(raw)
        filtered_files, rejected_files = _filter_route_generated_files(route_entry, generated_files)
        if rejected_files:
            project_log(
                project_id,
                f"        ! skipped disallowed generated files for {route_entry['file_path']}: {', '.join(rejected_files)}",
            )
        if route_entry["file_path"] not in filtered_files:
            raise RuntimeError(f"Route generation did not return {route_entry['file_path']}")
        files = merge_files(files, filtered_files)
        files, restored = ensure_locked_mobile_files(files, base_files)
        if restored:
            project_log(project_id, f"        ! restored locked scaffold files after {route_entry['file_path']}: {', '.join(restored)}")
        project_log(project_id, f"        ✓ route {index}/{len(route_manifest)} done ({route_entry['file_path']})")

    repair_counts: dict[str, int] = {}
    validation = validate_mobile_project(
        your_app_name,
        files,
        route_manifest=route_manifest,
        base_files=base_files,
    )
    while not validation["ok"]:
        update_project(project_id, {"status": STATUS_REPAIRING})
        repair_logs.append(validation["errors"])
        targets = build_repair_targets(
            failing_files=validation["failing_files"],
            route_manifest=route_manifest,
            files=files,
        )
        target = next((item for item in targets if repair_counts.get(item["id"], 0) < 2), None)
        if target is None:
            project_log(project_id, "        ! unresolved issues remain after targeted repairs")
            raise RuntimeError(validation["errors"])

        repair_counts[target["id"]] = repair_counts.get(target["id"], 0) + 1
        retry_state["repair_attempts"] += 1
        increment_retry_budget(project_id, retry_state, repair=True)
        project_log(
            project_id,
            f"        ! repair attempt {repair_counts[target['id']]}/2 triggered for {target['label']}",
        )

        relevant_errors = _extract_relevant_error_lines(validation["errors"], target["owned_files"])
        file_contents = {
            path: files[path]
            for path in target["owned_files"]
            if path in files
        }
        repair_prompt = MOBILE_REPAIR_USER.format(
            your_app_name=your_app_name,
            target_label=target["label"],
            validation_errors=relevant_errors,
            failing_files=json.dumps(target["owned_files"], indent=2),
            file_contents=json.dumps(file_contents, indent=2),
            scaffold_api=scaffold_api,
            view_model_contract=files["src/lib/view-models.ts"],
        )
        repaired_raw = claude_text(
            repair_prompt,
            system=MOBILE_REPAIR_SYSTEM,
            timeout=900,
            model=STITCH_MODEL,
        )
        _, repaired_files = extract_bundle_files(repaired_raw)
        filtered_files, rejected_files = _filter_repair_generated_files(target, repaired_files)
        if rejected_files:
            project_log(
                project_id,
                f"        ! skipped disallowed repair files for {target['label']}: {', '.join(rejected_files)}",
            )
        files = merge_files(files, filtered_files)
        files, restored = ensure_locked_mobile_files(files, base_files)
        if restored:
            project_log(project_id, f"        ! restored locked scaffold files after repairing {target['label']}: {', '.join(restored)}")
        update_project(project_id, {"status": STATUS_VALIDATING})
        validation = validate_mobile_project(
            your_app_name,
            files,
            route_manifest=route_manifest,
            base_files=base_files,
        )

    project_log(project_id, "        ✓ mobile scaffold validation passed")
    return files


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
    prompt = build_spec_section_prompt(
        section=section,
        reference_app=reference_app,
        your_app_name=your_app_name,
        brand_overrides=brand_overrides,
        frontend_spec=frontend_spec,
    )

    last_error = None
    for attempt in range(3):
        try:
            raw_section = claude_text(
                prompt,
                system=SPEC_SECTION_SYSTEM,
                timeout=SPEC_SECTION_TIMEOUT,
                model=STITCH_MODEL,
            )
            clean_section = validate_spec_section_content(section, raw_section)
            (output_dir / section["filename"]).write_text(clean_section + "\n", encoding="utf-8")
            project_log(project_id, f"        ✓ section {section_index}/{total_sections} done")
            return clean_section
        except Exception as exc:
            last_error = exc
            if attempt == 2:
                raise RuntimeError(f"Failed to generate {section['filename']}: {exc}") from exc
            wait = 2 ** attempt
            project_log(
                project_id,
                f"        ! section {section_index}/{total_sections} "
                f"attempt {attempt + 1} failed: {exc}; retrying in {wait}s",
            )
            time.sleep(wait)

    raise RuntimeError(f"Failed to generate {section['filename']}: {last_error}")


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

    except Exception as e:
        update_project(project_id, {"status": STATUS_FAILED, "error_text": str(e)})
        project_log(project_id, f"  ✗ Failed: {e}")
        raise

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def process_project_mobile(project_id: str):
    client = get_db()
    reset_project_logs(project_id)
    project_log(project_id, f"[mobile] Starting project {project_id}")
    project = load_project(project_id)

    reference_app = project["reference_app"]
    your_app_name = project.get("your_app_name") or reference_app

    stored_frontend_spec = project.get("frontend_spec")
    stored_screen_analysis = project.get("screen_analysis")
    stored_transitions = project.get("transitions")
    stored_schema = project.get("canonical_schema")
    retry_state = {
        "total_retries": int(project.get("total_retries") or 0),
        "repair_attempts": int(project.get("repair_attempts") or 0),
    }

    tmpdir = tempfile.mkdtemp(prefix=f"spectr_{project_id[:8]}_")
    try:
        unique: list[str] = []
        if not (stored_frontend_spec and stored_screen_analysis and stored_transitions):
            update_project(project_id, {"status": STATUS_EXTRACTING})
            project_log(project_id, "  [1/8] Downloading MP4 from Supabase Storage...")

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

        if stored_frontend_spec and stored_screen_analysis:
            frontend_spec = stored_frontend_spec
            screen_analysis = stored_screen_analysis
            project_log(project_id, "  [2/8] Using stored screen analysis")
        else:
            update_project(project_id, {"status": STATUS_ANALYZING_SCREENS})
            project_log(project_id, "  [2/8] Analyzing screens and design tokens...")
            batches = [unique[i:i + BATCH_SIZE] for i in range(0, len(unique), BATCH_SIZE)]
            screen_specs = run_vision_batches(
                batches,
                prompt_template=PROMPT_1_USER,
                system_prompt=PROMPT_1_SYSTEM,
                reference_app=reference_app,
                pass_name="screen analysis",
                project_id=project_id,
            )
            design_token_specs = run_vision_batches(
                batches,
                prompt_template=PROMPT_1B_USER,
                system_prompt=PROMPT_1B_SYSTEM,
                reference_app=reference_app,
                pass_name="design token extraction",
                project_id=project_id,
            )
            structured_batches = [unique[i:i + STRUCTURED_BATCH_SIZE] for i in range(0, len(unique), STRUCTURED_BATCH_SIZE)]
            structured_items = run_structured_screen_batches(
                structured_batches,
                reference_app=reference_app,
                project_id=project_id,
                retry_state=retry_state,
            )
            screen_analysis = merge_structured_screens(structured_items)
            frontend_spec = (
                "\n\n---\n\n".join(screen_specs)
                + "\n\n## DESIGN TOKENS\n\n"
                + "\n\n---\n\n".join(design_token_specs)
            )
            update_project(
                project_id,
                {
                    "frontend_spec": frontend_spec,
                    "screen_analysis": screen_analysis,
                    "total_retries": retry_state["total_retries"],
                },
            )

        if stored_transitions:
            transitions = stored_transitions
            project_log(project_id, "  [3/8] Using stored transitions")
        else:
            update_project(project_id, {"status": STATUS_ANALYZING_TRANSITIONS})
            project_log(project_id, "  [3/8] Analyzing transitions...")
            if not unique:
                raise RuntimeError("Transition analysis requires extracted frames.")
            transitions = analyze_transitions(
                unique,
                reference_app=reference_app,
                project_id=project_id,
                retry_state=retry_state,
            )
            update_project(
                project_id,
                {
                    "transitions": transitions,
                    "total_retries": retry_state["total_retries"],
                },
            )

        if stored_schema:
            canonical_schema = stored_schema
            project_log(project_id, "  [4/8] Using stored canonical schema")
        else:
            update_project(project_id, {"status": STATUS_SYNTHESIZING_SCHEMA})
            project_log(project_id, "  [4/8] Synthesizing schema...")
            canonical_schema = synthesize_schema(screen_analysis, transitions)
            update_project(project_id, {"canonical_schema": canonical_schema})

        update_project(project_id, {"status": STATUS_GENERATING_BACKEND})
        project_log(project_id, "  [5/8] Rendering backend and runtime files...")
        route_manifest = build_route_manifest(screen_analysis)
        base_files = build_fixed_mobile_files(
            your_app_name,
            reference_app,
            route_manifest,
            canonical_schema,
        )

        update_project(project_id, {"status": STATUS_GENERATING_FRONTEND})
        project_log(project_id, "  [6/8] Generating Expo screens and components...")
        files = generate_mobile_frontend(
            reference_app=reference_app,
            your_app_name=your_app_name,
            screen_analysis=screen_analysis,
            route_manifest=route_manifest,
            canonical_schema=canonical_schema,
            base_files=base_files,
            project_id=project_id,
            retry_state=retry_state,
            frontend_spec=frontend_spec,
        )

        update_project(project_id, {"status": STATUS_VALIDATING})
        project_log(project_id, "  [7/8] Validating final mobile project...")
        validation = validate_mobile_project(
            your_app_name,
            files,
            route_manifest=route_manifest,
            base_files=base_files,
        )
        if not validation["ok"]:
            raise RuntimeError(validation["errors"])

        update_project(project_id, {"status": STATUS_BUNDLING})
        project_log(project_id, "  [8/8] Uploading bundle...")
        files, restored = ensure_locked_mobile_files(files, base_files)
        if restored:
            project_log(project_id, f"        ! restored locked scaffold files before bundling: {', '.join(restored)}")
        bundle_key = f"{project_id}/bundle.zip"
        ensure_bucket_allows_bundle_uploads(client)
        zip_bytes = create_bundle_zip(
            "",
            files,
            root_dir=slugify_name(your_app_name),
            include_spec=False,
        )
        client.storage.from_(BUCKET).upload(
            path=bundle_key,
            file=zip_bytes,
            file_options={"content-type": "application/zip", "upsert": "true"},
        )

        update_project(
            project_id,
            {
                "status": STATUS_COMPLETE,
                "bundle_s3_key": bundle_key,
                "repair_attempts": retry_state["repair_attempts"],
                "total_retries": retry_state["total_retries"],
            },
        )
        project_log(project_id, "  ✓ Done — Expo bundle uploaded to Storage")

    except Exception as e:
        update_project(project_id, {"status": STATUS_FAILED, "error_text": str(e)})
        project_log(project_id, f"  ✗ Failed: {e}")
        raise

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def process_project(project_id: str):
    if OUTPUT_MODE == "spec":
        return process_project_spec(project_id)
    return process_project_mobile(project_id)


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
