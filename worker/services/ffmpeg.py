import os
import subprocess
from pathlib import Path

# Scene-change threshold (0.0–1.0).
# 0.15 works well for screen recordings where UI transitions are subtle
# (taps, slides, content changes). Lower = more frames captured.
SCENE_THRESHOLD = float(os.getenv("SCENE_THRESHOLD", "0.15"))

# Fall back to fps-based extraction when scene detection yields fewer
# than this many frames (e.g. very short or mostly-static recordings).
MIN_SCENE_FRAMES = int(os.getenv("MIN_SCENE_FRAMES", "3"))


def extract_frames(input_path: str, output_dir: str, fps: int = 1) -> list[str]:
    """Extract frames using scene-change detection with fps fallback.

    Captures only frames where the screen meaningfully changes — typically
    5-15x fewer frames than 1fps for screen recordings. Falls back to
    fps-based extraction when scene detection yields too few frames.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Scene-change extraction — write directly to output_dir
    cmd_scene = [
        "ffmpeg", "-i", input_path,
        "-vf", f"select=gt(scene\\,{SCENE_THRESHOLD}),scale=1280:-2",
        "-vsync", "vfr",
        "-q:v", "2",
        f"{output_dir}/frame_%04d.jpg",
        "-y", "-loglevel", "error",
    ]
    result = subprocess.run(cmd_scene, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[warn] scene detection failed (exit {result.returncode}), falling back to 1fps: {result.stderr.strip()}")
    else:
        frames = sorted(str(f) for f in Path(output_dir).glob("frame_*.jpg"))
        if len(frames) >= MIN_SCENE_FRAMES:
            return frames

    # Fallback: clear any partial scene output and run 1fps extraction
    for f in Path(output_dir).glob("frame_*.jpg"):
        f.unlink()

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
