"""Library-mode pipeline: MP4 screen recording → spec.md string. No DB. No Supabase.

The worker package was built to be driven by Supabase project IDs, but its
core stages (frame extraction, vision batches, sectioned spec generation)
have no database dependency. This module assembles those stages into a clean
function that any caller can invoke without a DB.

Input: a screen recording (MP4 / MOV / M4V). That is the only input shape.
App Store URLs were removed in mp4-only-all-paths (deeper coverage, more
control over framing, fewer external dependencies on Apple's CDN).
"""

from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path
from typing import Optional

# Make worker imports work. worker/local_worker.py uses sys.path.insert at
# module load time to find its sibling sub-packages (services/, prompts/,
# constants), so once we import it both `from worker.X` and `from X` resolve.
_REPO_ROOT = Path(__file__).resolve().parent.parent
_WORKER_DIR = _REPO_ROOT / "worker"
if str(_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(_WORKER_DIR))

from worker import local_worker  # noqa: E402
from worker.services.ffmpeg import (  # noqa: E402
    extract_frames as _extract_frames,
    compress_video as _compress_video,
)
from worker.services.dedup import deduplicate_frames as _deduplicate_frames  # noqa: E402


_VIDEO_SUFFIXES = (".mp4", ".mov", ".m4v")


def _input_is_mp4(s: str) -> bool:
    """Detect whether `s` is a path to a usable video file."""
    p = Path(s).expanduser()
    return p.exists() and p.is_file() and p.suffix.lower() in _VIDEO_SUFFIXES


def _frames_from_mp4(mp4_path: str, workdir: Path, max_frames: int) -> list[str]:
    """Extract + dedup frames from a screen recording. Returns at most max_frames paths."""
    source = Path(mp4_path).expanduser().resolve()
    process_path, was_compressed = _compress_video(str(source))
    try:
        frames_dir = workdir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        all_frames = _extract_frames(process_path, str(frames_dir))
        unique = _deduplicate_frames(all_frames)
        return unique[:max_frames]
    finally:
        if was_compressed and process_path != str(source):
            try:
                Path(process_path).unlink(missing_ok=True)
            except Exception:
                pass


def _run_vision_passes(
    frame_paths: list[str],
    reference_app: str,
    batch_size: int,
) -> str:
    """Run screen-analysis + design-token passes, concatenate into frontend_spec."""
    from worker.prompts import (
        PROMPT_1_SYSTEM,
        PROMPT_1_USER,
        PROMPT_1B_SYSTEM,
        PROMPT_1B_USER,
    )

    batches = [
        frame_paths[i : i + batch_size]
        for i in range(0, len(frame_paths), batch_size)
    ]

    screens = local_worker.run_vision_batches(
        batches,
        prompt_template=PROMPT_1_USER,
        system_prompt=PROMPT_1_SYSTEM,
        reference_app=reference_app,
        pass_name="screens",
    )
    tokens = local_worker.run_vision_batches(
        batches,
        prompt_template=PROMPT_1B_USER,
        system_prompt=PROMPT_1B_SYSTEM,
        reference_app=reference_app,
        pass_name="design_tokens",
    )

    parts: list[str] = []
    if screens:
        parts.append("# Screens\n\n" + "\n\n---\n\n".join(screens))
    if tokens:
        parts.append("# Design Tokens\n\n" + "\n\n---\n\n".join(tokens))
    return "\n\n".join(parts)


def generate_spec(
    source: str,
    *,
    reference_app: str,
    your_app_name: Optional[str] = None,
    brand_colors: Optional[dict] = None,
    max_frames: int = 20,
    batch_size: int = 25,
    workdir: Optional[Path] = None,
) -> str:
    """Generate a spec.md from a local MP4/MOV/M4V screen recording.

    Returns the assembled spec.md content. Writes nothing to any database.
    Requires either `ANTHROPIC_API_KEY` in the env or the `claude` CLI on PATH.
    Always requires ffmpeg on PATH for frame extraction.

    Args:
        source: Path to a local screen recording file (.mp4 / .mov / .m4v).
        reference_app: Name of the app the recording shows. Required — the
            spec needs an anchor name for sections, headings, and Claude Code
            prompt context.
        your_app_name: Optional name of the clone the developer is building.
            Defaults to reference_app.
        brand_colors: Optional brand color overrides dict.
        max_frames: Cap on frames sent to vision. Default 20.
        batch_size: Frames per vision API call. Default 25.
        workdir: Optional working directory. A temp dir is created and
            cleaned up otherwise.

    Returns:
        The full spec.md content as a string.

    Raises:
        ValueError: source is not an existing video file or reference_app is missing.
        RuntimeError: pipeline produced no frames or vision/spec stage failed.
    """
    if not reference_app or not reference_app.strip():
        raise ValueError(
            "`reference_app` is required — the spec needs an app name for "
            "section headings, navigation, and the Claude Code prompt."
        )
    if not _input_is_mp4(source):
        raise ValueError(
            f"`source` must be an existing .mp4 / .mov / .m4v file, got: {source!r}"
        )

    cleanup = workdir is None
    workdir = workdir or Path(tempfile.mkdtemp(prefix="spectr-mcp-"))
    try:
        frame_paths = _frames_from_mp4(source, workdir, max_frames=max_frames)
        frame_paths = frame_paths[:max_frames]
        if not frame_paths:
            raise RuntimeError("Pipeline produced zero frames — nothing to analyze.")

        app_name = reference_app.strip()
        clone_name = (your_app_name or app_name).strip()
        brand = brand_colors or {}

        frontend_spec = _run_vision_passes(frame_paths, app_name, batch_size)
        if not frontend_spec.strip():
            raise RuntimeError("Vision passes returned empty results.")

        research = local_worker.fetch_app_research(app_name)
        if research:
            frontend_spec = research + "\n\n" + frontend_spec

        spec_dir = workdir / "spec"
        spec_dir.mkdir(parents=True, exist_ok=True)
        spec_md = local_worker.generate_sectioned_spec(
            reference_app=app_name,
            your_app_name=clone_name,
            brand_colors=brand,
            frontend_spec=frontend_spec,
            project_id="mcp-local",
            output_dir=spec_dir,
        )
        return spec_md
    finally:
        if cleanup:
            shutil.rmtree(workdir, ignore_errors=True)
