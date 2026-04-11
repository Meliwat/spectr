import os
import subprocess
from pathlib import Path

# Scene-change threshold (0.0–1.0).
# Lower = more frames captured. 0.15 works well for screen recordings
# where UI transitions are subtle (taps, slides, content changes).
SCENE_THRESHOLD = float(os.getenv("SCENE_THRESHOLD", "0.15"))

# Minimum frames before falling back to fps-based extraction.
# If scene detection yields fewer than this, we fall back to 1fps.
MIN_SCENE_FRAMES = int(os.getenv("MIN_SCENE_FRAMES", "3"))


def extract_frames(input_path: str, output_dir: str, fps: int = 1) -> list[str]:
    """Extract frames using scene-change detection.

    Captures only frames where the screen meaningfully changes, typically
    yielding far fewer frames than 1fps while preserving every distinct
    UI state. Falls back to fps-based extraction for static/short videos.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Scene-change extraction
    scene_dir = output_dir + "_scene"
    os.makedirs(scene_dir, exist_ok=True)
    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", f"select=gt(scene\\,{SCENE_THRESHOLD}),scale=1280:-2",
        "-vsync", "vfr",
        "-q:v", "2",
        f"{scene_dir}/frame_%04d.jpg",
        "-y", "-loglevel", "error",
    ]
    subprocess.run(cmd, capture_output=True, text=True)
    scene_frames = sorted(str(f) for f in Path(scene_dir).glob("frame_*.jpg"))

    # Use scene frames if we got enough; otherwise fall back to 1fps
    if len(scene_frames) >= MIN_SCENE_FRAMES:
        return scene_frames

    # Fallback: 1fps extraction
    cmd_fps = [
        "ffmpeg", "-i", input_path,
        "-vf", f"fps={fps}",
        "-q:v", "2",
        f"{output_dir}/frame_%04d.jpg",
        "-y", "-loglevel", "error",
    ]
    result = subprocess.run(cmd_fps, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")
    return sorted(str(f) for f in Path(output_dir).glob("frame_*.jpg"))
