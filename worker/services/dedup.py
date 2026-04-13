import os

import imagehash
from PIL import Image


_DEDUP_THRESHOLD = int(os.getenv("DEDUP_THRESHOLD", "6"))


def deduplicate_frames(frame_paths: list[str], threshold: int = _DEDUP_THRESHOLD) -> list[str]:
    seen, unique = [], []
    for path in frame_paths:
        try:
            h = imagehash.phash(Image.open(path))
            if all(abs(h - s) > threshold for s in seen):
                unique.append(path)
                seen.append(h)
        except Exception:
            continue
    return unique
