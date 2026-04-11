import os
import subprocess
from pathlib import Path

# Threshold for scene-change detection (0.0–1.0).
# 0.3 = trigger on >30% pixel change vs previous frame.
# Lower = more frames captured; raise to 0.4 for fewer.
SCENE_THRESHOLD = float(os.getenv("SCENE_THRESHOLD", "0.3"))


def extract_frames(input_path: str, output_dir: str, fps: int = 1) -> list[str]:
    """Extract frames using scene-change detection instead of fixed fps.

    Scene detection captures only frames where the screen actually changes,
    typically yielding 5-15x fewer frames than 1fps for screen recordings
    while preserving every distinct UI state.

    Falls back to fps-based extraction if scene detection yields no frames
    (e.g. very short or static recordings).
    """
    os.makedirs(output_dir, exist_ok=True)

    # Scene-change extraction
    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", f"select=gt(scene\\,{SCENE_THRESHOLD}),scale=1280:-2",
        "-vsync", "vfr",
        "-q:v", "2",
        f"{output_dir}/frame_%04d.jpg",
        "-y", "-loglevel", "error",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")

    frames = sorted(str(f) for f in Path(output_dir).glob("frame_*.jpg"))

    # Fallback: if scene detection found nothing, use 1fps
    if not frames:
        fallback_dir = output_dir + "_fallback"
        os.makedirs(fallback_dir, exist_ok=True)
        cmd_fps = [
            "ffmpeg", "-i", input_path,
            "-vf", f"fps={fps}",
            "-q:v", "2",
            f"{fallback_dir}/frame_%04d.jpg",
            "-y", "-loglevel", "error",
        ]
        subprocess.run(cmd_fps, capture_output=True, text=True)
        frames = sorted(str(f) for f in Path(fallback_dir).glob("frame_*.jpg"))

    return frames
