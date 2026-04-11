import os
import subprocess
from pathlib import Path


def extract_frames(input_path: str, output_dir: str, fps: int = 1) -> list[str]:
    os.makedirs(output_dir, exist_ok=True)
    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", f"fps={fps}",
        "-q:v", "2",
        f"{output_dir}/frame_%04d.jpg",
        "-y", "-loglevel", "error",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")
    return sorted(str(f) for f in Path(output_dir).glob("frame_*.jpg"))
